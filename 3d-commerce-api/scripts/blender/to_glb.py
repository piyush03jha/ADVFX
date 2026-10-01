import bpy
import os
import sys

def die(message):
    print(message, file=sys.stderr)
    raise RuntimeError(message)

argv = sys.argv
if "--" not in argv:
    die("Missing Blender pipeline arguments")
args = argv[argv.index("--") + 1:]
if len(args) != 2:
    die("Usage: to_glb.py -- <input> <output>")

source = os.path.abspath(args[0])
output = os.path.abspath(args[1])
ext = os.path.splitext(source)[1].lower()

bpy.ops.wm.read_factory_settings(use_empty=True)

try:
    if ext in (".glb", ".gltf"):
        bpy.ops.import_scene.gltf(filepath=source)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=source)
    elif ext == ".stl":
        bpy.ops.wm.stl_import(filepath=source)
    elif ext == ".ply":
        bpy.ops.wm.ply_import(filepath=source)
    elif ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=source, use_image_search=True)
    elif ext == ".abc":
        bpy.ops.wm.alembic_import(filepath=source)
    elif ext in (".usd", ".usda", ".usdc", ".usdz"):
        bpy.ops.wm.usd_import(filepath=source)
    elif ext == ".bvh":
        bpy.ops.import_anim.bvh(filepath=source)
    elif ext == ".svg":
        bpy.ops.import_curve.svg(filepath=source)
        curves = [obj for obj in bpy.context.scene.objects if obj.type == "CURVE"]
        for curve in curves:
            curve.data.extrude = 0.02
            curve.data.bevel_depth = 0.001
            curve.data.bevel_resolution = 2
    else:
        die(f"Unsupported Blender input format: {ext}")
except Exception as exc:
    die(f"Blender import failed for {ext}: {exc}")

objects = list(bpy.context.scene.objects)
if not objects:
    die("Imported scene contains no objects")

mesh_count = sum(1 for obj in objects if obj.type == "MESH")
if ext != ".bvh" and mesh_count == 0:
    die("Imported scene contains no mesh geometry")

os.makedirs(os.path.dirname(output), exist_ok=True)

try:
    bpy.ops.export_scene.gltf(
        filepath=output,
        export_format="GLB",
        export_keep_originals=False,
        export_apply=False,
    )
except Exception as exc:
    die(f"GLB export failed: {exc}")

if not os.path.isfile(output) or os.path.getsize(output) < 20:
    die("Blender did not produce a valid GLB")
