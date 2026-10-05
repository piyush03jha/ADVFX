import argparse
import bpy
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--ext", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])

bpy.ops.wm.read_factory_settings(use_empty=True)

ext = args.ext.lower()
if ext == ".fbx":
    bpy.ops.import_scene.fbx(filepath=args.input)
elif ext == ".obj":
    bpy.ops.wm.obj_import(filepath=args.input)
elif ext == ".ply":
    bpy.ops.wm.ply_import(filepath=args.input)
elif ext == ".stl":
    bpy.ops.wm.stl_import(filepath=args.input)
elif ext == ".gltf":
    bpy.ops.import_scene.gltf(filepath=args.input)
elif ext in {".usd", ".usda", ".usdc", ".usdz"}:
    bpy.ops.wm.usd_import(filepath=args.input)
elif ext == ".abc":
    bpy.ops.wm.alembic_import(filepath=args.input)
else:
    raise RuntimeError("Unsupported conversion extension: " + ext)

if not any(obj.type == "MESH" for obj in bpy.context.scene.objects):
    raise RuntimeError("No mesh geometry found in the imported asset")

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=args.output,
    export_format="GLB",
    export_yup=True,
    export_animations=True,
    export_materials="EXPORT",
)
