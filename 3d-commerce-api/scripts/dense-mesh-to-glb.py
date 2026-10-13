#!/usr/bin/env python3
"""Streaming, low-memory STL / OBJ / PLY -> GLB converter (Python stdlib only).

Built for a 1 GB worker where importing a multi-million-triangle mesh into
Blender is SIGKILLed. Nothing here builds a scene graph; memory is bounded by
the *output* size, not the input size:

  * <= VOXEL3D_GLTF_MAX_FACES triangles (default 250000): exact vertex weld
    (identical positions merged, nothing else changed).
  * more triangles: streaming vertex-clustering decimation. Vertices are
    snapped to a cubic grid, merged, degenerate triangles dropped; the grid is
    coarsened/refined (<= 3 passes) until the result is near the face budget.
    Peak memory is bounded by the number of occupied grid cells (capped).

The uploaded source file is never modified; only the derived GLB is reduced.

Supported: binary + ASCII STL, OBJ (positions + faces; v/vt/vn, negative
indices, n-gon fan triangulation), PLY ascii/binary (vertex xyz + optional
uchar RGB colours, one `vertex_indices` face list).
Not carried over for OBJ: materials, UVs, textures (the worker only routes
very large OBJ files here; see VOXEL3D_NATIVE_OBJ_MIN_MB).

Exit codes: 0 ok, 2 invalid / too large, 3 unsupported (caller may fall back).
"""
import argparse
import json
import math
import os
import struct
import sys
import tempfile
from array import array

EXIT_INVALID, EXIT_UNSUPPORTED = 2, 3
MAX_FACES = int(os.environ.get("VOXEL3D_GLTF_MAX_FACES", "250000"))
MAX_INPUT_TRIANGLES = int(os.environ.get("VOXEL3D_DENSE_MAX_TRIANGLES", "12000000"))
MAX_CELLS = int(os.environ.get("VOXEL3D_DENSE_MAX_CELLS", "1500000"))
MAX_PASSES = 3


class Invalid(Exception):
    pass


class Unsupported(Exception):
    pass


class Retry(Exception):
    """Cluster pass produced far too much output; retry with a coarser grid."""


PACK3 = struct.Struct("<3f").pack


class Clusterer:
    """Merges vertices. cell=None -> exact weld, else cubic grid clustering."""

    def __init__(self, mn=None, cell=None, colors=False):
        self.index = {}
        self.sums = array("d")
        self.counts = array("I")
        self.csums = array("d") if colors else None
        if cell:
            self.mn, self.inv = mn, 1.0 / cell
            self.res = 1
        else:
            self.mn = self.inv = None

    def set_res(self, res):
        self.res = res

    def vid(self, x, y, z, c=None):
        inv = self.inv
        if inv is None:
            key = PACK3(x, y, z)
        else:
            mn, r = self.mn, self.res
            kx = int((x - mn[0]) * inv)
            ky = int((y - mn[1]) * inv)
            kz = int((z - mn[2]) * inv)
            key = kx + r * (ky + r * kz)
        i = self.index.get(key)
        if i is None:
            i = len(self.counts)
            if i >= MAX_CELLS:
                raise Retry()
            self.index[key] = i
            self.sums.extend((x, y, z))
            self.counts.append(1)
            if c is not None:
                self.csums.extend(c)
        else:
            s, j = self.sums, 3 * i
            s[j] += x
            s[j + 1] += y
            s[j + 2] += z
            self.counts[i] += 1
            if c is not None:
                cs = self.csums
                cs[j] += c[0]
                cs[j + 1] += c[1]
                cs[j + 2] += c[2]
        return i

    def positions(self):
        out = array("f")
        s, cnt = self.sums, self.counts
        for i in range(len(cnt)):
            n, j = cnt[i], 3 * i
            out.extend((s[j] / n, s[j + 1] / n, s[j + 2] / n))
        return out

    def colors(self):
        if self.csums is None:
            return None
        out = bytearray()
        cs, cnt = self.csums, self.counts
        for i in range(len(cnt)):
            n, j = cnt[i], 3 * i
            out += bytes((int(cs[j] / n), int(cs[j + 1] / n), int(cs[j + 2] / n), 255))
        return out


# ---------------------------------------------------------------- readers ---
def stl_kind(path):
    size = os.path.getsize(path)
    with open(path, "rb") as f:
        head = f.read(84)
    if len(head) >= 84:
        n = struct.unpack_from("<I", head, 80)[0]
        if 84 + 50 * n == size:
            return "bin", n
    if head[:5].lower() == b"solid":
        return "ascii", None
    raise Invalid("not a valid binary or ASCII STL file")


def stl_triangles(path, kind, n):
    """Yield 9-float tuples (x0,y0,z0,x1,y1,z1,x2,y2,z2)."""
    if kind == "bin":
        rec = struct.Struct("<12fH")
        step = 50 * 20000
        with open(path, "rb") as f:
            f.seek(84)
            left = n
            while left > 0:
                data = f.read(min(step, left * 50))
                if not data:
                    raise Invalid("truncated STL")
                got = len(data) // 50
                for t in rec.iter_unpack(data[: got * 50]):
                    yield t[3:12]
                left -= got
    else:
        buf = []
        with open(path, "r", errors="replace") as f:
            for line in f:
                s = line.strip()
                if s.startswith("vertex"):
                    p = s.split()
                    buf.extend((float(p[1]), float(p[2]), float(p[3])))
                    if len(buf) == 9:
                        yield tuple(buf)
                        buf = []


def ascii_stl_count(path):
    total = 0
    with open(path, "rb") as f:
        while True:
            block = f.read(8 << 20)
            if not block:
                break
            total += block.count(b"vertex")
    return total // 3


def read_obj(path):
    verts, tris = array("f"), array("I")
    cols = array("B")
    have_color = False
    textured = False
    with open(path, "rb") as f:
        for line in f:
            if line[:2] == b"v ":
                p = line.split()
                verts.extend((float(p[1]), float(p[2]), float(p[3])))
                if len(p) >= 7:
                    have_color = True
                    cols.extend(tuple(max(0, min(255, int(float(v) * 255))) for v in p[4:7]) + (255,))
                elif have_color:
                    cols.extend((255, 255, 255, 255))
            elif line[:2] == b"f ":
                nv = len(verts) // 3
                ids = []
                for tok in line.split()[1:]:
                    k = int(tok.split(b"/")[0])
                    k = k + nv if k < 0 else k - 1
                    if not 0 <= k < nv:
                        raise Invalid("OBJ face references a missing vertex")
                    ids.append(k)
                for i in range(1, len(ids) - 1):
                    tris.extend((ids[0], ids[i], ids[i + 1]))
                if len(tris) // 3 > MAX_INPUT_TRIANGLES:
                    raise Invalid("mesh exceeds %d triangles" % MAX_INPUT_TRIANGLES)
            elif line[:3] == b"vt " or line[:7] == b"mtllib ":
                textured = True
    if textured:
        print("warning: OBJ materials/UVs/textures are not carried over", flush=True)
    return verts, tris, (cols if have_color and len(cols) == len(verts) // 3 * 4 else None)


PLY_TYPES = {
    "char": "b", "int8": "b", "uchar": "B", "uint8": "B", "short": "h", "int16": "h",
    "ushort": "H", "uint16": "H", "int": "i", "int32": "i", "uint": "I", "uint32": "I",
    "float": "f", "float32": "f", "double": "d", "float64": "d",
}


def read_ply(path):
    with open(path, "rb") as f:
        if f.readline().strip() != b"ply":
            raise Invalid("not a PLY file")
        fmt, elements = None, []
        while True:
            line = f.readline()
            if not line:
                raise Invalid("PLY header is not terminated")
            p = line.decode("ascii", "replace").split()
            if not p or p[0] in ("comment", "obj_info"):
                continue
            if p[0] == "end_header":
                break
            if p[0] == "format":
                fmt = p[1]
            elif p[0] == "element":
                elements.append({"name": p[1], "count": int(p[2]), "props": []})
            elif p[0] == "property":
                if p[1] == "list":
                    elements[-1]["props"].append((p[4], PLY_TYPES[p[3]], PLY_TYPES[p[2]]))
                else:
                    elements[-1]["props"].append((p[2], PLY_TYPES[p[1]], None))
        if fmt not in ("ascii", "binary_little_endian", "binary_big_endian"):
            raise Unsupported("unknown PLY format " + str(fmt))
        end = "<" if fmt == "binary_little_endian" else ">"
        verts, tris, cols = array("f"), array("I"), bytearray()
        have_color = False
        for el in elements:
            name, count, props = el["name"], el["count"], el["props"]
            if name == "vertex":
                if any(pr[2] for pr in props):
                    raise Unsupported("PLY vertex list properties")
                names = [pr[0] for pr in props]
                try:
                    ix = [names.index(a) for a in ("x", "y", "z")]
                except ValueError:
                    raise Invalid("PLY vertex element has no x/y/z")
                ci = [names.index(a) for a in ("red", "green", "blue")] if all(
                    a in names for a in ("red", "green", "blue")) else None
                have_color = ci is not None
                float_color = have_color and props[ci[0]][1] in ("f", "d")
                if fmt == "ascii":
                    for _ in range(count):
                        v = f.readline().split()
                        verts.extend((float(v[ix[0]]), float(v[ix[1]]), float(v[ix[2]])))
                        if ci:
                            cols += bytes(tuple(int(float(v[k]) * (255 if float_color else 1)) & 255 for k in ci)) + b"\xff"
                else:
                    st = struct.Struct(end + "".join(pr[1] for pr in props))
                    left = count
                    while left:
                        take = min(left, max(1, (8 << 20) // st.size))
                        data = f.read(take * st.size)
                        if len(data) != take * st.size:
                            raise Invalid("truncated PLY vertex data")
                        for v in st.iter_unpack(data):
                            verts.extend((v[ix[0]], v[ix[1]], v[ix[2]]))
                            if ci:
                                cols += bytes(tuple(int(v[k] * (255 if float_color else 1)) & 255 for k in ci)) + b"\xff"
                        left -= take
            elif name == "face":
                if len(props) != 1 or not props[0][2]:
                    raise Unsupported("PLY face element must have a single list property")
                ct, it = props[0][2], props[0][1]
                nv = len(verts) // 3
                if fmt == "ascii":
                    faces = (tuple(int(t) for t in f.readline().split()[1:]) for _ in range(count))
                else:
                    faces = ply_binary_faces(f, count, end, ct, it)
                for ids in faces:
                    if any(k < 0 or k >= nv for k in ids):
                        raise Invalid("PLY face references a missing vertex")
                    for i in range(1, len(ids) - 1):
                        tris.extend((ids[0], ids[i], ids[i + 1]))
                    if len(tris) // 3 > MAX_INPUT_TRIANGLES:
                        raise Invalid("mesh exceeds %d triangles" % MAX_INPUT_TRIANGLES)
            else:
                if fmt == "ascii":
                    for _ in range(count):
                        f.readline()
                elif any(pr[2] for pr in props):
                    raise Unsupported("PLY element with list data: " + name)
                else:
                    skip = struct.calcsize(end + "".join(pr[1] for pr in props)) * count
                    while skip:
                        skip -= len(f.read(min(skip, 8 << 20))) or skip
    return verts, tris, (cols if have_color else None)


def ply_binary_faces(f, count, end, ct, it):
    cs, csz, isz = struct.Struct(end + ct), struct.calcsize(ct), struct.calcsize(it)
    cache, buf, pos, done = {}, b"", 0, 0
    while done < count:
        while done < count and len(buf) - pos >= csz:
            c = cs.unpack_from(buf, pos)[0]
            need = csz + c * isz
            if len(buf) - pos < need:
                break
            st = cache.get(c) or cache.setdefault(c, struct.Struct(end + str(c) + it))
            yield st.unpack_from(buf, pos + csz)
            pos += need
            done += 1
        if done >= count:
            break
        more = f.read(8 << 20)
        if not more:
            raise Invalid("truncated PLY face data")
        buf, pos = buf[pos:] + more, 0


# ----------------------------------------------------------------- reduce ---
def cluster_params(mn, mx, res):
    longest = max(mx[i] - mn[i] for i in range(3)) or 1.0
    return longest / res


def reduce_soup(make_iter, mn, mx):
    """Streaming clustering for triangle soup (STL)."""
    res = max(8, int(math.sqrt(MAX_FACES / 8.0)))
    for attempt in range(MAX_PASSES):
        cl = Clusterer(mn, cluster_params(mn, mx, res))
        cl.set_res(res + 2)
        tris = array("I")
        try:
            for t in make_iter():
                a = cl.vid(t[0], t[1], t[2])
                b = cl.vid(t[3], t[4], t[5])
                c = cl.vid(t[6], t[7], t[8])
                if a != b and b != c and a != c:
                    tris.extend((a, b, c))
                    if len(tris) > 12 * MAX_FACES:
                        raise Retry()
        except Retry:
            res = max(8, int(res * 0.6))
            continue
        out = len(tris) // 3
        print("clustering pass %d: grid=%d -> %d face(s)" % (attempt + 1, res, out), flush=True)
        if attempt + 1 < MAX_PASSES and (out > 1.6 * MAX_FACES or out < 0.35 * MAX_FACES):
            new_res = max(8, int(res * math.sqrt(MAX_FACES / max(out, 1))))
            if new_res != res:
                res = new_res
                continue
        return cl.positions(), tris, None
    raise Invalid("could not reduce mesh to the face budget within %d passes" % MAX_PASSES)


def reduce_indexed(verts, tris, cols):
    nv = len(verts) // 3
    mn = [min(verts[i::3]) for i in range(3)]
    mx = [max(verts[i::3]) for i in range(3)]
    res = max(8, int(math.sqrt(MAX_FACES / 8.0)))
    for attempt in range(MAX_PASSES):
        cl = Clusterer(mn, cluster_params(mn, mx, res), colors=cols is not None)
        cl.set_res(res + 2)
        try:
            vmap = array("I")
            for i in range(nv):
                j = 3 * i
                c = (cols[4 * i], cols[4 * i + 1], cols[4 * i + 2]) if cols is not None else None
                vmap.append(cl.vid(verts[j], verts[j + 1], verts[j + 2], c))
        except Retry:
            res = max(8, int(res * 0.6))
            continue
        out_t = array("I")
        for k in range(0, len(tris), 3):
            a, b, c = vmap[tris[k]], vmap[tris[k + 1]], vmap[tris[k + 2]]
            if a != b and b != c and a != c:
                out_t.extend((a, b, c))
        out = len(out_t) // 3
        print("clustering pass %d: grid=%d -> %d face(s)" % (attempt + 1, res, out), flush=True)
        if attempt + 1 < MAX_PASSES and (out > 1.6 * MAX_FACES or out < 0.35 * MAX_FACES):
            new_res = max(8, int(res * math.sqrt(MAX_FACES / max(out, 1))))
            if new_res != res:
                res = new_res
                continue
        return cl.positions(), out_t, cl.colors()
    raise Invalid("could not reduce mesh to the face budget within %d passes" % MAX_PASSES)


# ------------------------------------------------------------------- GLB ---
def write_glb(dst, verts, tris, colors, z_up):
    nv, nt = len(verts) // 3, len(tris) // 3
    if nt == 0:
        raise Unsupported("mesh has no triangles")
    if max(tris) >= nv or not math.isfinite(sum(verts)):
        raise Invalid("mesh has invalid indices or non-finite coordinates")
    vdata, tdata = verts, tris
    if sys.byteorder == "big":
        vdata, tdata = array("f", verts), array("I", tris)
        vdata.byteswap()
        tdata.byteswap()
    chunks = [(vdata.tobytes(), 34962), (tdata.tobytes(), 34963)]
    attrs = {"POSITION": 0}
    accessors = [
        {"bufferView": 0, "componentType": 5126, "count": nv, "type": "VEC3",
         "min": [min(verts[i::3]) for i in range(3)], "max": [max(verts[i::3]) for i in range(3)]},
        {"bufferView": 1, "componentType": 5125, "count": nt * 3, "type": "SCALAR"},
    ]
    if colors is not None:
        chunks.append((bytes(colors), 34962))
        accessors.append({"bufferView": 2, "componentType": 5121, "normalized": True, "count": nv, "type": "VEC4"})
        attrs["COLOR_0"] = 2
    views, blob, off = [], bytearray(), 0
    for data, target in chunks:
        views.append({"buffer": 0, "byteOffset": off, "byteLength": len(data), "target": target})
        blob += data + b"\x00" * ((-len(data)) % 4)
        off = len(blob)
    root = {"mesh": 0}
    if z_up:
        root["rotation"] = [-math.sqrt(0.5), 0.0, 0.0, math.sqrt(0.5)]
    doc = {
        "asset": {"version": "2.0", "generator": "voxel3d-dense-mesh-to-glb"},
        "scene": 0, "scenes": [{"nodes": [0]}], "nodes": [root],
        "meshes": [{"primitives": [{"attributes": attrs, "indices": 1, "material": 0, "mode": 4}]}],
        "materials": [{"pbrMetallicRoughness": {
            "baseColorFactor": [1, 1, 1, 1] if colors is not None else [0.8, 0.8, 0.8, 1],
            "metallicFactor": 0.0, "roughnessFactor": 0.8}}],
        "accessors": accessors, "bufferViews": views, "buffers": [{"byteLength": len(blob)}],
    }
    js = json.dumps(doc, separators=(",", ":")).encode()
    js += b" " * ((-len(js)) % 4)
    total = 12 + 8 + len(js) + 8 + len(blob)
    if total > 0xFFFFFFFF:
        raise Invalid("GLB would exceed 4 GiB")
    with open(dst, "wb") as out:
        out.write(struct.pack("<4sII", b"glTF", 2, total))
        out.write(struct.pack("<I4s", len(js), b"JSON") + js)
        out.write(struct.pack("<I4s", len(blob), b"BIN\x00"))
        out.write(blob)
    print("GLB written: %d vertices, %d faces, %d bytes" % (nv, nt, total), flush=True)


def convert(src, dst, ext):
    ext = ext.lower()
    if ext == ".stl":
        kind, n = stl_kind(src)
        if n is None:
            n = ascii_stl_count(src)
        if n == 0:
            raise Unsupported("STL has no triangles")
        if n > MAX_INPUT_TRIANGLES:
            raise Invalid("STL has %d triangles (limit %d)" % (n, MAX_INPUT_TRIANGLES))
        print("STL (%s): %d triangle(s)" % (kind, n), flush=True)

        def make_iter():
            return stl_triangles(src, kind, n)

        if n <= MAX_FACES:
            cl, tris = Clusterer(), array("I")
            for t in make_iter():
                a, b, c = cl.vid(*t[0:3]), cl.vid(*t[3:6]), cl.vid(*t[6:9])
                if a != b and b != c and a != c:
                    tris.extend((a, b, c))
            verts, colors = cl.positions(), None
        else:
            lo, hi = [math.inf] * 3, [-math.inf] * 3
            for t in make_iter():
                for k in range(3):
                    for v in (t[k], t[3 + k], t[6 + k]):
                        if v < lo[k]:
                            lo[k] = v
                        if v > hi[k]:
                            hi[k] = v
            if not all(math.isfinite(v) for v in lo + hi):
                raise Invalid("STL contains non-finite coordinates")
            verts, tris, colors = reduce_soup(make_iter, lo, hi)
        write_glb(dst, verts, tris, colors, z_up=True)
        return
    if ext == ".obj":
        verts, tris, colors = read_obj(src)
        z_up = False
    elif ext == ".ply":
        verts, tris, colors = read_ply(src)
        z_up = True
    else:
        raise Unsupported("unsupported extension " + ext)
    print("%s: %d vertices, %d faces read" % (ext, len(verts) // 3, len(tris) // 3), flush=True)
    if len(tris) // 3 > MAX_FACES:
        verts, tris, colors = reduce_indexed(verts, tris, colors)
    write_glb(dst, verts, tris, colors, z_up)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--input", required=True)
    ap.add_argument("--output", required=True)
    ap.add_argument("--ext", required=True)
    a = ap.parse_args()
    try:
        convert(a.input, a.output, a.ext)
    except Unsupported as exc:
        print("unsupported: " + str(exc), file=sys.stderr)
        return EXIT_UNSUPPORTED
    except (Invalid, ValueError, IndexError, KeyError, struct.error, OverflowError, UnicodeError) as exc:
        print("invalid mesh: " + str(exc), file=sys.stderr)
        return EXIT_INVALID
    except MemoryError:
        print("invalid mesh: ran out of memory", file=sys.stderr)
        return EXIT_INVALID
    return 0


if __name__ == "__main__":
    sys.exit(main())