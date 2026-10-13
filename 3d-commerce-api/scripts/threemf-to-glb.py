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

Supports: core 3MF meshes, <components> with transforms, build items,
production-extension p:path references (Bambu / Orca / Prusa slicer files),
units, Z-up -> Y-up. Materials/textures are intentionally ignored (the existing
worker also imports with materials disabled).

Exit codes: 0 ok, 2 invalid/too large (do not retry elsewhere),
            3 nothing convertible / unsupported (caller may fall back).
"""
import argparse
import json
import math
import os
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
        self.warned = set()

    def start(self, name, a):
        n = local(name)
        if n == "vertex":
            self.verts.extend((float(a["x"]), float(a["y"]), float(a["z"])))
        elif n == "triangle":
            self.tris.extend((int(a["v1"]), int(a["v2"]), int(a["v3"])))
        elif n == "object":
            self.cur = {
                "id": int(a["id"]),
                "type": a.get("type", "model"),
                "name": a.get("name") or a.get("partnumber"),
                "verts": None,
                "tris": None,
                "comps": [],
            }
        elif n == "mesh":
            if self.cur is not None:
                self.verts = array("f")
                self.tris = array("I")
        elif n == "component":
            if self.cur is not None:
                self.cur["comps"].append(
                    (int(a["objectid"]), attr(a, "path"), parse_matrix(a.get("transform")))
                )
        elif n == "item":
            self.items.append(
                (int(a["objectid"]), attr(a, "path"), parse_matrix(a.get("transform")))
            )
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
                self.budget["triangles"] += nt
                if self.budget["triangles"] > MAX_TRIANGLES:
                    raise Invalid(
                        "model has more than %d triangles (limit VOXEL3D_3MF_MAX_TRIANGLES)" % MAX_TRIANGLES
                    )
            self.verts = self.tris = None
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
        try:
            import xml.etree.ElementTree as ET

            if zf.getinfo(rels).file_size < 1 << 20:
                for el in ET.fromstring(zf.read(rels)):
                    if el.attrib.get("Type", "").lower().endswith("/3dmodel"):
                        target = el.attrib.get("Target", "").lstrip("/")
                        if target.lower() in names:
                            return names[target.lower()]
        except Exception:
            pass
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

    def mesh_for(self, key, obj):
        if key in self.mesh_ids:
            return self.mesh_ids[key]
        verts, tris = obj["verts"], obj["tris"]
        nv, nt = len(verts) // 3, len(tris) // 3
        mins = [min(verts[i::3]) for i in range(3)]
        maxs = [max(verts[i::3]) for i in range(3)]
        vdata, tdata = verts, tris
        if sys.byteorder == "big":
            vdata, tdata = array("f", verts), array("I", tris)
            vdata.byteswap()
            tdata.byteswap()
        pos_view = self._write(vdata.tobytes(), 34962)
        idx_view = self._write(tdata.tobytes(), 34963)
        self.accessors.append(
            {"bufferView": pos_view, "componentType": 5126, "count": nv, "type": "VEC3", "min": mins, "max": maxs}
        )
        pos_acc = len(self.accessors) - 1
        self.accessors.append(
            {"bufferView": idx_view, "componentType": 5125, "count": nt * 3, "type": "SCALAR"}
        )
        idx_acc = len(self.accessors) - 1
        mesh = {"primitives": [{"attributes": {"POSITION": pos_acc}, "indices": idx_acc, "material": 0, "mode": 4}]}
        if obj.get("name"):
            mesh["name"] = str(obj["name"])
        self.meshes.append(mesh)
        self.triangles_written += nt
        self.mesh_ids[key] = len(self.meshes) - 1
        # Mesh bytes are on disk now; drop them so peak memory stays low.
        obj["verts"] = obj["tris"] = None
        obj["_written"] = self.mesh_ids[key]
        return self.mesh_ids[key]

    def node_for(self, path, oid, matrix, stack):
        part = self.part(path)
        obj = part.objects.get(oid)
        if obj is None:
            raise Invalid("object %d not found in %s" % (oid, path))
        if obj["type"] in SKIP_OBJECT_TYPES:
            return None
        key = (part.path, oid)
        if key in stack or len(stack) >= MAX_DEPTH:
            raise Invalid("component cycle or nesting deeper than %d" % MAX_DEPTH)
        node = {}
        if obj.get("name"):
            node["name"] = str(obj["name"])
        if matrix:
            node["matrix"] = to_gltf_matrix(matrix)
        if obj["verts"] is not None:
            node["mesh"] = self.mesh_for(key, obj)
        elif "_written" in obj:
            node["mesh"] = obj["_written"]
        children = []
        for cid, cpath, cmatrix in obj["comps"]:
            child = self.node_for(cpath or path, cid, cmatrix, stack + (key,))
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
                "materials": [
                    {
                        "name": "default",
                        "pbrMetallicRoughness": {
                            "baseColorFactor": [0.8, 0.8, 0.8, 1.0],
                            "metallicFactor": 0.0,
                            "roughnessFactor": 0.8,
                        },
                    }
                ],
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
