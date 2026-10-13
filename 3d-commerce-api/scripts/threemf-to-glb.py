#!/usr/bin/env python3
"""Streaming, low-memory 3MF -> GLB converter (Python stdlib only).

Why this exists: importing a 3MF through Blender builds the whole model as
Blender data (plus the add-on's own parsed copy) and is SIGKILLed on a 1 GB
worker. This script never builds an XML tree and never loads Blender:

  * expat SAX parser reads the .model XML in 1 MB chunks straight out of the ZIP
  * vertices/triangles go into compact array('f') / array('I') buffers
    (~12 bytes per vertex and ~12 bytes per triangle)
  * every distinct mesh is written to the GLB once; build items / components /
    repeated parts become glTF nodes that REFERENCE the mesh (instancing), so
    duplicate parts cost no extra memory
  * the binary chunk is streamed to disk, then copied into the GLB

Supports: core 3MF meshes, base-material and color-group assignments,
Bambu/Orca/Prusa filament-color fallback and per-object extruder metadata,
<components> with transforms, production-extension p:path references, units,
and Z-up -> Y-up. Texture maps and slicer-specific painted-facet extensions are
not currently translated.

Exit codes: 0 ok, 2 invalid/too large (do not retry elsewhere),
            3 nothing convertible / unsupported (caller may fall back).
"""
import argparse
import json
import math
import os
import re
import struct
import sys
import tempfile
import zipfile
from array import array
from xml.parsers import expat

EXIT_INVALID = 2
EXIT_UNSUPPORTED = 3

UNIT_TO_METERS = {
    "micron": 1e-6,
    "millimeter": 1e-3,
    "centimeter": 1e-2,
    "inch": 0.0254,
    "foot": 0.3048,
    "meter": 1.0,
}
SKIP_OBJECT_TYPES = {"support", "solidsupport", "surface"}
MAX_XML_BYTES = int(os.environ.get("VOXEL3D_3MF_MAX_XML_MB", "512")) * 1024 * 1024
MAX_TRIANGLES = int(os.environ.get("VOXEL3D_3MF_MAX_TRIANGLES", "2000000"))
MAX_DEPTH = 32
MAX_NODES = int(os.environ.get("VOXEL3D_3MF_MAX_NODES", "10000"))


class Invalid(Exception):
    pass


class Unsupported(Exception):
    pass


def local(name):
    return name.rsplit(":", 1)[-1]


def attr(attrs, wanted):
    """Attribute lookup that ignores any namespace prefix (p:path -> path)."""
    value = attrs.get(wanted)
    if value is not None:
        return value
    for key, val in attrs.items():
        if local(key) == wanted:
            return val
    return None


def parse_matrix(text):
    if not text:
        return None
    parts = text.split()
    if len(parts) != 12:
        raise Invalid("transform must have 12 numbers")
    values = tuple(float(p) for p in parts)
    if not all(math.isfinite(v) for v in values):
        raise Invalid("transform contains a non-finite number")
    identity = (1, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0)
    return None if values == identity else values


def to_gltf_matrix(m):
    # 3MF uses row vectors (p' = p * M); glTF stores column-major, so the 12
    # values drop into the first three columns' rows in the same order.
    return [m[0], m[1], m[2], 0, m[3], m[4], m[5], 0, m[6], m[7], m[8], 0, m[9], m[10], m[11], 1]


def _srgb_to_linear(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def parse_hex(text):
    """Parse #RRGGBB/#RRGGBBAA sRGB into linear RGBA for glTF."""
    if not text:
        return None
    value = text.strip().strip('"').lstrip("#")
    if len(value) not in (6, 8) or not re.fullmatch(r"[0-9a-fA-F]+", value):
        return None
    channels = [int(value[i:i + 2], 16) / 255.0 for i in range(0, len(value), 2)]
    alpha = channels[3] if len(channels) == 4 else 1.0
    return (round(_srgb_to_linear(channels[0]), 6),
            round(_srgb_to_linear(channels[1]), 6),
            round(_srgb_to_linear(channels[2]), 6), round(alpha, 6))


def read_slicer_colors(zf):
    """Read filament colors and per-object extruder metadata from slicer archives."""
    names = {n.lower(): n for n in zf.namelist()}

    def read_text(name):
        real = names.get(name.lower())
        if real and zf.getinfo(real).file_size <= (8 << 20):
            return zf.read(real).decode("utf-8", "replace")
        return None

    filaments, extruders = [], {}
    text = read_text("Metadata/project_settings.config")
    if text:
        try:
            values = json.loads(text).get("filament_colour", [])
            if isinstance(values, str):
                values = [values]
            filaments = [parse_hex(value) for value in values]
        except (ValueError, TypeError, AttributeError):
            pass
    if not filaments:
        for name in ("Metadata/Slic3r_PE.config", "Metadata/Prusa_Slicer.config"):
            text = read_text(name)
            match = re.search(r"filament_colour\s*=\s*(.+)", text or "")
            if match:
                filaments = [parse_hex(value) for value in match.group(1).replace('"', "").split(";")]
                break

    text = read_text("Metadata/model_settings.config")
    if text and "<!DOCTYPE" not in text.upper() and "<!ENTITY" not in text.upper():
        try:
            import xml.etree.ElementTree as ET
            for obj in ET.fromstring(text).iter():
                if local(obj.tag) != "object" or not obj.get("id"):
                    continue
                for md in obj.iter():
                    if local(md.tag) == "metadata" and md.get("key") == "extruder":
                        try:
                            extruders[int(obj.get("id"))] = int(md.get("value", "0"))
                        except (TypeError, ValueError):
                            pass
        except (ValueError, TypeError, ET.ParseError):
            pass
    return filaments, extruders


class ModelFile:
    """SAX handler for one *.model part."""

    def __init__(self, path, budget):
        self.path = path
        self.budget = budget  # shared dict: {"triangles": int}
        self.unit = "millimeter"
        self.objects = {}
        self.items = []
        self.cur = None
        self.verts = None
        self.tris = None
        self.triangle_pids = None
        self.triangle_pindices = None
        self.groups = {}
        self.cur_group = None
        self.warned = set()

    def start(self, name, a):
        n = local(name)
        if n == "vertex":
            self.verts.extend((float(a["x"]), float(a["y"]), float(a["z"])))
        elif n == "triangle":
            self.tris.extend((int(a["v1"]), int(a["v2"]), int(a["v3"])))
            if self.triangle_pids is not None:
                self.triangle_pids.append(int(a.get("pid", -1)))
                self.triangle_pindices.append(int(a.get("p1", -1)))
        elif n == "object":
            self.cur = {
                "id": int(a["id"]),
                "type": a.get("type", "model"),
                "name": a.get("name") or a.get("partnumber"),
                "pid": int(a["pid"]) if "pid" in a else None,
                "pindex": int(a.get("pindex", 0)),
                "verts": None,
                "tris": None,
                "comps": [],
            }
        elif n == "mesh":
            if self.cur is not None:
                self.verts = array("f")
                self.tris = array("I")
                self.triangle_pids = array("i")
                self.triangle_pindices = array("i")
        elif n == "component":
            if self.cur is not None:
                self.cur["comps"].append(
                    (int(a["objectid"]), attr(a, "path"), parse_matrix(a.get("transform")))
                )
        elif n == "item":
            self.items.append(
                (int(a["objectid"]), attr(a, "path"), parse_matrix(a.get("transform")))
            )
        elif n in ("basematerials", "colorgroup"):
            self.cur_group = (int(a["id"]), [])
        elif n == "base" and self.cur_group:
            self.cur_group[1].append(parse_hex(a.get("displaycolor")))
        elif n == "color" and self.cur_group:
            self.cur_group[1].append(parse_hex(a.get("color")))
        elif n == "texture2dgroup":
            if n not in self.warned:
                self.warned.add(n)
                print("warning: 3MF texture maps are not carried over", flush=True)
        elif n == "model":
            self.unit = a.get("unit", "millimeter")
        elif n in ("beamlattice", "booleanshape", "slice", "slicestack"):
            # These constructs can change the represented geometry. Do not
            # silently publish an incomplete GLB; let the caller use its
            # explicitly configured fallback converter.
            raise Unsupported("unsupported 3MF element <" + n + ">")

    def end(self, name):
        n = local(name)
        if n == "mesh" and self.cur is not None and self.verts is not None:
            nv = len(self.verts) // 3
            nt = len(self.tris) // 3
            if nt:
                if max(self.tris) >= nv:
                    raise Invalid("triangle references a missing vertex in object " + str(self.cur["id"]))
                if not math.isfinite(sum(self.verts)):
                    raise Invalid("mesh contains non-finite vertex coordinates")
                self.cur["verts"], self.cur["tris"] = self.verts, self.tris
                self.cur["tp"], self.cur["t1"] = self.triangle_pids, self.triangle_pindices
                self.budget["triangles"] += nt
                if self.budget["triangles"] > MAX_TRIANGLES:
                    raise Invalid(
                        "model has more than %d triangles (limit VOXEL3D_3MF_MAX_TRIANGLES)" % MAX_TRIANGLES
                    )
            self.verts = self.tris = None
        elif n in ("basematerials", "colorgroup") and self.cur_group:
            self.groups[self.cur_group[0]] = self.cur_group[1]
            self.cur_group = None
        elif n == "object" and self.cur is not None:
            self.objects[self.cur["id"]] = self.cur
            self.cur = None


def _no_dtd(*_args):
    raise Invalid("XML DTD/entity declarations are not allowed in 3MF")


def parse_model_part(zf, part, budget):
    info = zf.getinfo(part)
    if info.file_size > MAX_XML_BYTES:
        raise Invalid(
            "%s is %d MB uncompressed (limit %d MB)"
            % (part, info.file_size >> 20, MAX_XML_BYTES >> 20)
        )
    model = ModelFile(part, budget)
    parser = expat.ParserCreate()
    parser.StartElementHandler = model.start
    parser.EndElementHandler = model.end
    parser.StartDoctypeDeclHandler = _no_dtd
    parser.EntityDeclHandler = _no_dtd
    read = 0
    try:
        with zf.open(part) as fh:
            while True:
                chunk = fh.read(1 << 20)
                if not chunk:
                    break
                read += len(chunk)
                if read > MAX_XML_BYTES:
                    raise Invalid(part + " exceeds the XML size limit")
                parser.Parse(chunk, False)
        parser.Parse(b"", True)
    except expat.ExpatError as exc:
        raise Invalid("malformed XML in " + part + ": " + str(exc))
    return model


def find_root_part(zf):
    names = {n.lower(): n for n in zf.namelist()}
    rels = names.get("_rels/.rels")
    if rels:
        info = zf.getinfo(rels)
        if info.file_size > (1 << 20):
            raise Invalid("3MF relationships file exceeds the 1 MB limit")
        target_part = None

        def relationship_start(name, attrs):
            nonlocal target_part
            if attrs.get("Type", "").lower().endswith("/3dmodel"):
                target_part = attrs.get("Target")

        parser = expat.ParserCreate()
        parser.StartElementHandler = relationship_start
        parser.StartDoctypeDeclHandler = _no_dtd
        parser.EntityDeclHandler = _no_dtd
        try:
            with zf.open(rels) as fh:
                rel_data = fh.read((1 << 20) + 1)
            if len(rel_data) > (1 << 20):
                raise Invalid("3MF relationships file exceeds the 1 MB limit")
            parser.Parse(rel_data, True)
        except Invalid:
            raise
        except expat.ExpatError as exc:
            raise Invalid("malformed 3MF relationships XML: " + str(exc))
        if target_part:
            normalized = target_part.lstrip("/")
            if normalized.lower() in names:
                return names[normalized.lower()]
    if "3d/3dmodel.model" in names:
        return names["3d/3dmodel.model"]
    for low, real in names.items():
        if low.endswith(".model"):
            return real
    raise Unsupported("no 3D model part found in 3MF package")


class GlbBuilder:
    def __init__(self, zf, root_part, bin_file):
        self.zf = zf
        self.name_map = {n.lower(): n for n in zf.namelist()}
        self.bin = bin_file
        self.offset = 0
        self.budget = {"triangles": 0}
        self.parts = {}
        self.root_part = root_part
        self.nodes, self.meshes, self.accessors, self.views = [], [], [], []
        self.mesh_ids = {}
        self.triangles_written = 0
        self.materials = [None]
        self.material_ids = {}
        self.filaments, self.extruders = read_slicer_colors(zf)

    def part(self, path):
        key = path.lstrip("/")
        if key not in self.parts:
            real = self.name_map.get(key.lower())
            if real is None:
                raise Invalid("referenced model part not found: " + path)
            self.parts[key] = parse_model_part(self.zf, real, self.budget)
        return self.parts[key]

    def _write(self, data, target):
        pad = (-len(data)) % 4
        self.bin.write(data)
        if pad:
            self.bin.write(b"\x00" * pad)
        view = {"buffer": 0, "byteOffset": self.offset, "byteLength": len(data), "target": target}
        self.offset += len(data) + pad
        self.views.append(view)
        return len(self.views) - 1

    def material_for(self, color):
        if color is None:
            return 0
        if color not in self.material_ids:
            material = {
                "name": "3MF color",
                "pbrMetallicRoughness": {
                    "baseColorFactor": list(color),
                    "metallicFactor": 0.0,
                    "roughnessFactor": 0.8,
                },
            }
            if color[3] < 1.0:
                material["alphaMode"] = "BLEND"
            self.materials.append(material)
            self.material_ids[color] = len(self.materials) - 1
        return self.material_ids[color]

    @staticmethod
    def resolve_color(part, pid, index):
        colors = part.groups.get(pid) if pid is not None else None
        if colors and 0 <= index < len(colors):
            return colors[index]
        return None

    def mesh_for(self, key, obj, part, hint=None):
        if key in self.mesh_ids:
            return self.mesh_ids[key]
        verts, tris = obj["verts"], obj["tris"]
        nv, nt = len(verts) // 3, len(tris) // 3
        mins = [min(verts[i::3]) for i in range(3)]
        maxs = [max(verts[i::3]) for i in range(3)]
        vdata = verts
        if sys.byteorder == "big":
            vdata = array("f", verts)
            vdata.byteswap()
        pos_view = self._write(vdata.tobytes(), 34962)
        self.accessors.append(
            {"bufferView": pos_view, "componentType": 5126, "count": nv, "type": "VEC3", "min": mins, "max": maxs}
        )
        pos_acc = len(self.accessors) - 1

        own = self.resolve_color(part, obj.get("pid"), obj.get("pindex", 0)) or hint
        tp, t1 = obj.get("tp"), obj.get("t1")
        buckets = {}
        if tp is not None and t1 is not None and (any(v >= 0 for v in tp) or any(v >= 0 for v in t1)):
            for i in range(nt):
                pid = tp[i] if tp[i] >= 0 else obj.get("pid")
                index = t1[i] if t1[i] >= 0 else obj.get("pindex", 0)
                color = self.resolve_color(part, pid, index) or own
                buckets.setdefault(color, array("I")).extend(tris[3 * i:3 * i + 3])
            if len(buckets) > 256:
                print("warning: too many distinct 3MF colors; using dominant color", flush=True)
                dominant = max(buckets, key=lambda value: len(buckets[value]))
                buckets = {dominant: tris}
        else:
            buckets[own] = tris

        primitives = []
        for color, indices in buckets.items():
            idata = indices
            if sys.byteorder == "big":
                idata = array("I", indices)
                idata.byteswap()
            index_view = self._write(idata.tobytes(), 34963)
            self.accessors.append(
                {"bufferView": index_view, "componentType": 5125, "count": len(indices), "type": "SCALAR"}
            )
            primitives.append({
                "attributes": {"POSITION": pos_acc},
                "indices": len(self.accessors) - 1,
                "material": self.material_for(color),
                "mode": 4,
            })
        mesh = {"primitives": primitives}
        if obj.get("name"):
            mesh["name"] = str(obj["name"])
        self.meshes.append(mesh)
        self.triangles_written += nt
        self.mesh_ids[key] = len(self.meshes) - 1
        obj["verts"] = obj["tris"] = obj["tp"] = obj["t1"] = None
        obj["_written"] = self.mesh_ids[key]
        return self.mesh_ids[key]

    def node_for(self, path, oid, matrix, stack, hint=None):
        if len(self.nodes) >= MAX_NODES:
            raise Invalid("model exceeds the node limit (VOXEL3D_3MF_MAX_NODES)")
        part = self.part(path)
        obj = part.objects.get(oid)
        if obj is None:
            raise Invalid("object %d not found in %s" % (oid, path))
        if obj["type"] in SKIP_OBJECT_TYPES:
            return None
        key = (part.path, oid)
        if key in stack or len(stack) >= MAX_DEPTH:
            raise Invalid("component cycle or nesting deeper than %d" % MAX_DEPTH)
        extruder = self.extruders.get(oid) if part.path == self.root_part else None
        extruder_color = self.filaments[extruder - 1] if extruder and 0 < extruder <= len(self.filaments) else None
        hint = self.resolve_color(part, obj.get("pid"), obj.get("pindex", 0)) or extruder_color or hint
        node = {}
        if obj.get("name"):
            node["name"] = str(obj["name"])
        if matrix:
            node["matrix"] = to_gltf_matrix(matrix)
        if obj["verts"] is not None:
            node["mesh"] = self.mesh_for(key, obj, part, hint)
        elif "_written" in obj:
            node["mesh"] = obj["_written"]
        children = []
        for cid, cpath, cmatrix in obj["comps"]:
            child = self.node_for(cpath or path, cid, cmatrix, stack + (key,), hint)
            if child is not None:
                children.append(child)
        if children:
            node["children"] = children
        if "mesh" not in node and not children:
            return None
        self.nodes.append(node)
        return len(self.nodes) - 1

    def build(self):
        root = self.part(self.root_part)
        default = self.filaments[0] if self.filaments else None
        self.materials[0] = {
            "name": "default",
            "pbrMetallicRoughness": {
                "baseColorFactor": list(default or (0.8, 0.8, 0.8, 1.0)),
                "metallicFactor": 0.0,
                "roughnessFactor": 0.8,
            },
        }
        item_nodes = []
        for oid, path, matrix in root.items:
            idx = self.node_for(path or self.root_part, oid, matrix, ())
            if idx is not None:
                item_nodes.append(idx)
        if not item_nodes:
            raise Unsupported("3MF build section contains no mesh geometry")
        scale = UNIT_TO_METERS.get(root.unit.lower(), 1e-3)
        scale *= float(os.environ.get("VOXEL3D_3MF_EXTRA_SCALE", "1"))
        self.nodes.append(
            {
                "name": "3mf-root",
                "rotation": [-math.sqrt(0.5), 0.0, 0.0, math.sqrt(0.5)],  # Z-up -> Y-up
                "scale": [scale, scale, scale],
                "children": item_nodes,
            }
        )
        return len(self.nodes) - 1


def convert(src, dst):
    with zipfile.ZipFile(src) as zf:
        root_part = find_root_part(zf)
        with tempfile.TemporaryFile(prefix="voxel3d-3mf-") as binf:
            builder = GlbBuilder(zf, root_part, binf)
            root_node = builder.build()
            document = {
                "asset": {"version": "2.0", "generator": "voxel3d-threemf-to-glb"},
                "scene": 0,
                "scenes": [{"nodes": [root_node]}],
                "nodes": builder.nodes,
                "meshes": builder.meshes,
                "materials": builder.materials,
                "accessors": builder.accessors,
                "bufferViews": builder.views,
                "buffers": [{"byteLength": builder.offset}],
            }
            json_bytes = json.dumps(document, separators=(",", ":")).encode("utf-8")
            json_bytes += b" " * ((-len(json_bytes)) % 4)
            total = 12 + 8 + len(json_bytes) + 8 + builder.offset
            if total > 0xFFFFFFFF:
                raise Invalid("GLB would exceed the 4 GiB container limit")
            with open(dst, "wb") as out:
                out.write(struct.pack("<4sII", b"glTF", 2, total))
                out.write(struct.pack("<I4s", len(json_bytes), b"JSON"))
                out.write(json_bytes)
                out.write(struct.pack("<I4s", builder.offset, b"BIN\x00"))
                binf.seek(0)
                while True:
                    block = binf.read(4 << 20)
                    if not block:
                        break
                    out.write(block)
            print(
                "3MF -> GLB: %d unique mesh(es), %d triangle(s), %d node(s), unit=%s, %d bytes"
                % (len(builder.meshes), builder.triangles_written, len(builder.nodes),
                   builder.part(root_part).unit, total),
                flush=True,
            )


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    args = ap.parse_args()
    try:
        convert(args.input, args.output)
    except Unsupported as exc:
        print("unsupported: " + str(exc), file=sys.stderr)
        return EXIT_UNSUPPORTED
    except (Invalid, zipfile.BadZipFile, KeyError, ValueError, OverflowError) as exc:
        print("invalid 3MF: " + str(exc), file=sys.stderr)
        return EXIT_INVALID
    except MemoryError:
        print("invalid 3MF: ran out of memory", file=sys.stderr)
        return EXIT_INVALID
    return 0


if __name__ == "__main__":
    sys.exit(main())
