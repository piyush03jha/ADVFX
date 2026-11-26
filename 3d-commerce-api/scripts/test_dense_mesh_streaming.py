"""Regression test: python3 -m unittest discover -s scripts -p test_dense_mesh_streaming.py"""
import importlib.util
import json
import os
import struct
import tempfile
import unittest
from pathlib import Path

spec = importlib.util.spec_from_file_location("dense_mesh", Path(__file__).with_name("dense-mesh-to-glb.py"))
mesh = importlib.util.module_from_spec(spec)
spec.loader.exec_module(mesh)


class DenseMeshStreamingTest(unittest.TestCase):
    def test_weld_limit_falls_back_without_losing_faces(self):
        with tempfile.TemporaryDirectory() as directory:
            source, output = Path(directory) / "model.stl", Path(directory) / "model.glb"
            a = (0, 0, 0, 1, 0, 0, 0, 1, 0)
            b = (2, 0, 0, 3, 0, 0, 2, 1, 0)
            with source.open("wb") as f:
                f.write(b"\0" * 80 + struct.pack("<I", 2))
                for triangle in (a, b):
                    f.write(struct.pack("<12fH", 0, 0, 1, *triangle, 0))
            old = mesh.MAX_CELLS
            try:
                mesh.MAX_CELLS = 3
                mesh.convert(str(source), str(output), ".stl")
            finally:
                mesh.MAX_CELLS = old
            data = output.read_bytes()
            magic, version, size, json_len, kind = struct.unpack_from("<4sIII4s", data)
            self.assertEqual((magic, version, size, kind), (b"glTF", 2, len(data), b"JSON"))
            doc = json.loads(data[20:20 + json_len])
            self.assertEqual(doc["accessors"][0]["count"], 6)
            self.assertEqual(doc["buffers"][0]["byteLength"], 72)
            self.assertEqual(struct.unpack_from("<18f", data, 28 + json_len), a + b)


if __name__ == "__main__":
    unittest.main()
