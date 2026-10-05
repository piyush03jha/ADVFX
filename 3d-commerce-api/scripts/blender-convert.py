import sys
import argparse
import os
import subprocess
import tempfile

import bpy

parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--ext", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])

bpy.ops.wm.read_factory_settings(use_empty=True)

ext = args.ext.lower()
input_path = args.input
generated_svg = None

if ext == ".pdf":
    # Blender 4.5 exposes Grease Pencil PDF export, not PDF import.
    # Convert the incoming PDF to SVG with Poppler, then import the SVG.
    generated_svg = os.path.join(tempfile.mkdtemp(prefix="voxel3d-pdf-"), "page.svg")
    result = subprocess.run(
        ["pdftocairo", "-svg", "-f", "1", "-l", "1", input_path, generated_svg],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError("PDF to SVG conversion failed: " + (result.stderr or result.stdout)[-4000:])
    input_path = generated_svg
    ext = ".svg"

try:
    if ext == ".fbx":
        bpy.ops.import_scene.fbx(filepath=input_path)
    elif ext == ".obj":
        bpy.ops.wm.obj_import(filepath=input_path)
    elif ext == ".ply":
        bpy.ops.wm.ply_import(filepath=input_path)
    elif ext == ".stl":
        bpy.ops.wm.stl_import(filepath=input_path)
    elif ext in {".gltf", ".glb"}:
        bpy.ops.import_scene.gltf(filepath=input_path)
    elif ext in {".usd", ".usda", ".usdc", ".usdz"}:
        bpy.ops.wm.usd_import(filepath=input_path)
    elif ext == ".abc":
        bpy.ops.wm.alembic_import(filepath=input_path)
    elif ext == ".bvh":
        bpy.ops.import_anim.bvh(filepath=input_path, target="ARMATURE")
    elif ext == ".svg":
        bpy.ops.wm.grease_pencil_import_svg(
            filepath=input_path,
            resolution=10,
            scale=10.0,
            use_scene_unit=False,
            recenter_bounds=True,
        )
    else:
        raise RuntimeError("Unsupported conversion extension: " + ext)

    # glTF cannot represent Blender Grease Pencil directly. Convert imported
    # Grease Pencil/curve objects into mesh geometry before exporting.
    for obj in list(bpy.context.scene.objects):
        if obj.type in {"GREASEPENCIL", "CURVE", "FONT", "SURFACE", "META"}:
            bpy.ops.object.select_all(action="DESELECT")
            obj.select_set(True)
            bpy.context.view_layer.objects.active = obj
            try:
                bpy.ops.object.convert(target="MESH")
            except RuntimeError as exc:
                raise RuntimeError(
                    "Could not convert " + obj.type + " geometry to mesh: " + str(exc)
                ) from exc

    objects = list(bpy.context.scene.objects)
    if not objects:
        raise RuntimeError("No geometry, armature, or scene objects were imported")

    bpy.ops.object.select_all(action="SELECT")
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]

    bpy.ops.export_scene.gltf(
        filepath=args.output,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_materials="EXPORT",
        use_selection=True,
    )
finally:
    if generated_svg:
        try:
            os.remove(generated_svg)
            os.rmdir(os.path.dirname(generated_svg))
        except OSError:
            pass
