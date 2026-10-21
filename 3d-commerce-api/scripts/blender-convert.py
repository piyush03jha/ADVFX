import sys
import argparse
import os
import subprocess
import tempfile

import bpy

# Installed by Dockerfile.worker for unsupported native 3MF packages.
THREEMF_ADDON_PATH = "/opt/3mf-addon"
if os.path.isdir(THREEMF_ADDON_PATH) and THREEMF_ADDON_PATH not in sys.path:
    sys.path.insert(0, THREEMF_ADDON_PATH)

parser = argparse.ArgumentParser()
parser.add_argument("--input", required=True)
parser.add_argument("--output", required=True)
parser.add_argument("--ext", required=True)
args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])

bpy.ops.wm.read_factory_settings(use_empty=True)

ext = args.ext.lower()
input_path = args.input
generated_svg = None


def supported_kwargs(operator, **kwargs):
    """Keep only the keyword arguments the running Blender build defines.

    Operator properties change between Blender releases (for example the
    Grease Pencil SVG importer in 4.5 has no ``recenter_bounds``). Passing an
    unknown keyword raises TypeError and fails the whole conversion, so unknown
    keywords are dropped and reported instead.
    """
    try:
        known = set(operator.get_rna_type().properties.keys())
    except Exception:
        return kwargs
    dropped = sorted(key for key in kwargs if key not in known)
    if dropped:
        print("NOTE: ignoring operator arguments unsupported by this Blender build:", dropped)
    return {key: value for key, value in kwargs.items() if key in known}


def ensure_addons(*modules):
    """Make sure the bundled importer/exporter add-ons are enabled."""
    enabled = set(bpy.context.preferences.addons.keys())
    for module in modules:
        if module in enabled:
            continue
        try:
            bpy.ops.preferences.addon_enable(module=module)
        except Exception as exc:
            print("NOTE: could not enable add-on", module, "-", str(exc))


ensure_addons("io_scene_gltf2", "io_anim_bvh", "io_curve_svg")


def mesh_objects_with_geometry():
    return [
        obj
        for obj in bpy.context.scene.objects
        if obj.type == "MESH" and len(obj.data.vertices) > 0
    ]


NAMED_COLORS = {
    "black": (0, 0, 0), "white": (255, 255, 255), "red": (255, 0, 0),
    "green": (0, 128, 0), "lime": (0, 255, 0), "blue": (0, 0, 255),
    "yellow": (255, 255, 0), "orange": (255, 165, 0), "purple": (128, 0, 128),
    "gray": (128, 128, 128), "grey": (128, 128, 128), "cyan": (0, 255, 255),
    "magenta": (255, 0, 255), "pink": (255, 192, 203), "brown": (165, 42, 42),
}


def parse_svg_color(value):
    """Return an (r, g, b) tuple of 0-255 ints, or None for none/unknown."""
    import re

    if not value:
        return None
    value = value.strip().lower()
    if value in ("none", "transparent", "currentcolor", "inherit") or value.startswith("url("):
        return None
    if value in NAMED_COLORS:
        return NAMED_COLORS[value]
    match = re.fullmatch(r"#([0-9a-f]{3})", value)
    if match:
        return tuple(int(ch * 2, 16) for ch in match.group(1))
    match = re.fullmatch(r"#([0-9a-f]{6})", value)
    if match:
        return tuple(int(match.group(1)[i:i + 2], 16) for i in (0, 2, 4))
    match = re.fullmatch(r"rgb\(\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*,\s*([\d.]+)(%?)\s*\)", value)
    if match:
        channels = []
        for number, percent in ((match.group(1), match.group(2)), (match.group(3), match.group(4)), (match.group(5), match.group(6))):
            amount = float(number)
            channels.append(round(amount * 2.55) if percent else round(amount))
        return tuple(max(0, min(255, c)) for c in channels)
    return None


def srgb_to_linear(channel):
    c = channel / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def make_flat_material(name, rgb):
    material = bpy.data.materials.new(name)
    material.diffuse_color = (
        srgb_to_linear(rgb[0]), srgb_to_linear(rgb[1]), srgb_to_linear(rgb[2]), 1.0,
    )
    return material


def prepare_svg(svg_path):
    """Normalise colours Blender's importer cannot read and list shape styles.

    pdftocairo writes percentage colours such as rgb(20%, 40%, 80%), which the
    curve importer silently ignores, leaving every shape uncoloured. Rewrite
    them as hex and read the fill/stroke of each shape in document order so
    colours (including stroke-only artwork) can be restored after import.
    Returns (path_to_import, styles) where styles is a list of
    {"fill": rgb|None, "stroke": rgb|None}, one per drawable shape.
    """
    import re
    import xml.etree.ElementTree as ET

    with open(svg_path, "r", encoding="utf-8", errors="replace") as handle:
        text = handle.read()

    def to_hex(match):
        rgb = parse_svg_color(match.group(0))
        return "#%02x%02x%02x" % rgb if rgb else match.group(0)

    text = re.sub(r"rgb\([^)]*\)", to_hex, text)
    normalized = os.path.join(tempfile.mkdtemp(prefix="voxel3d-svg-"), "artwork.svg")
    with open(normalized, "w", encoding="utf-8") as handle:
        handle.write(text)

    styles = []
    shape_tags = {"path", "rect", "circle", "ellipse", "line", "polyline", "polygon"}
    skip_tags = {"defs", "clippath", "mask", "symbol", "pattern", "marker"}

    def resolve(element, inherited):
        style = dict(inherited)
        for key in ("fill", "stroke"):
            if element.get(key) is not None:
                style[key] = element.get(key)
        for declaration in (element.get("style") or "").split(";"):
            if ":" in declaration:
                key, value = declaration.split(":", 1)
                key = key.strip()
                if key in ("fill", "stroke"):
                    style[key] = value.strip()
        return style

    def walk(element, inherited):
        tag = element.tag.split("}")[-1].lower()
        if tag in skip_tags:
            return
        style = resolve(element, inherited)
        if tag in shape_tags:
            styles.append({
                "fill": parse_svg_color(style.get("fill", "black")),
                "stroke": parse_svg_color(style.get("stroke", "none")),
            })
        for child in element:
            walk(child, style)

    try:
        walk(ET.fromstring(text.encode("utf-8")), {})
    except ET.ParseError:
        styles = []
    return normalized, styles


def import_svg_as_solids(svg_path):
    """Import vector artwork (SVG, or a PDF page rendered to SVG) as solid meshes.

    The Grease Pencil SVG importer cannot be used here: Grease Pencil strokes
    convert to loose edges (no polygons), and the glTF exporter drops loose
    edges, which produced an empty GLB. Blender's curve importer keeps filled
    shapes and holes, so each shape is extruded into a solid. Stroke-only paths
    (fill="none") become thin tubes. Shapes are layered in document order so
    overlapping artwork does not z-fight, then centred, normalised to unit
    size, stood upright (facing the viewer) and joined into a single mesh.
    """
    import math
    from mathutils import Vector

    svg_path, styles = prepare_svg(svg_path)
    bpy.ops.import_curve.svg(filepath=svg_path)
    curves = [obj for obj in bpy.context.scene.objects if obj.type == "CURVE"]
    if not curves:
        raise RuntimeError("no importable vector paths were found")

    # The importer may put a transform on each object (viewBox scaling, group
    # transforms). Blender cannot bake location/rotation into 2D curves, so
    # read world-space points instead and bake after conversion to mesh.
    bpy.context.view_layer.update()
    lows = [1e30, 1e30]
    highs = [-1e30, -1e30]
    for obj in curves:
        for spline in obj.data.splines:
            points = spline.bezier_points if spline.type == "BEZIER" else spline.points
            for point in points:
                co = obj.matrix_world @ Vector(point.co[:3])
                for axis in (0, 1):
                    lows[axis] = min(lows[axis], co[axis])
                    highs[axis] = max(highs[axis], co[axis])
    size = max(highs[0] - lows[0], highs[1] - lows[1])
    if size <= 0:
        raise RuntimeError("the vector paths have no measurable size")

    thickness = 0.03 * size
    layer_gap = min(0.002 * size, 0.15 * size / max(len(curves), 1))
    paired = len(styles) == len(curves)
    neutral_stroke = (12, 12, 14)
    stroke_radius = 0.004 * size
    # Painter's-algorithm layering along the thickness axis: each fill sits just
    # above everything drawn before it, and each stroke tube rests on the
    # current surface so it stays visible instead of sinking into a slab.
    base_top = 0.0
    stroke_peak = 0.0

    for index, obj in enumerate(curves):
        data = obj.data
        style = styles[index] if paired else None
        imported_color = any(m is not None for m in data.materials)
        if style is not None:
            has_fill = style["fill"] is not None
        else:
            has_fill = imported_color

        # Extrude/bevel are measured in the curve's own units; the importer
        # scales objects, so convert the world-space sizes back.
        local = abs(obj.matrix_world.to_scale().x) or 1.0
        data.materials.clear()
        if has_fill:
            data.extrude = thickness / 2 / local
            rgb = style["fill"] if style is not None else None
            if rgb is not None:
                data.materials.append(make_flat_material("SVG fill %d" % index, rgb))
        else:
            # Stroke-only path: give it body as a tube in the stroke colour.
            data.bevel_depth = stroke_radius / local
            data.bevel_resolution = 2
            data.extrude = 0.0
            rgb = (style["stroke"] if style is not None else None) or neutral_stroke
            data.materials.append(make_flat_material("SVG stroke %d" % index, rgb))
        if has_fill:
            base_top = max(base_top, stroke_peak) + layer_gap
            z_center = base_top - thickness / 2
            stroke_peak = base_top
        else:
            z_center = base_top
            stroke_peak = max(stroke_peak, z_center + stroke_radius)
        obj.location.z += z_center

    for obj in curves:
        bpy.ops.object.select_all(action="DESELECT")
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.convert(target="MESH")

    meshes = [obj for obj in bpy.context.scene.objects if obj.type == "MESH"]
    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    artwork = bpy.context.view_layer.objects.active

    # Centre on the geometry, scale to unit size, then stand the artwork up so
    # it faces +Z in the exported glTF (Blender Z-up becomes glTF Y-up, so a
    # sheet modelled in the XY plane would otherwise lie flat on the floor).
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    bpy.ops.object.origin_set(type="ORIGIN_GEOMETRY", center="BOUNDS")
    artwork.location = (0.0, 0.0, 0.0)
    artwork.scale = (1.0 / size, 1.0 / size, 1.0 / size)
    artwork.rotation_euler = (math.radians(90), 0.0, 0.0)
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)


def build_skeleton_mesh(armature_obj):
    """Give a bone-only armature (BVH motion capture) visible, skinned geometry.

    A BVH file contains a skeleton and its animation but no surface. Exporting
    it as-is yields a GLB with joints and an animation clip but nothing to
    draw, so the storefront shows an empty stage. Build one octahedral
    "bone" mesh per bone, weight it fully to that bone and bind it with an
    Armature modifier so it follows the exported animation.
    """
    import bmesh
    from mathutils import Vector

    bones = [bone for bone in armature_obj.data.bones if bone.length > 1e-6]
    if not bones:
        raise RuntimeError("The BVH skeleton has no bones with a measurable length")

    # Width of each bone relative to its own length, with a floor so very short
    # leaf bones stay visible next to long ones.
    floor_width = 0.02 * max(
        (max(b.head_local[i] for b in bones) - min(b.head_local[i] for b in bones))
        for i in range(3)
    )

    mesh = bpy.data.meshes.new("Skeleton")
    bm = bmesh.new()
    deform = bm.verts.layers.deform.verify()
    group_names = []

    for bone in bones:
        group_names.append(bone.name)
        group_index = len(group_names) - 1
        length = bone.length
        width = max(0.12 * length, floor_width)
        matrix = bone.matrix_local  # armature space; +Y runs head -> tail
        local = [
            Vector((0.0, 0.0, 0.0)),
            Vector((0.0, length, 0.0)),
            Vector((width, 0.2 * length, 0.0)),
            Vector((0.0, 0.2 * length, width)),
            Vector((-width, 0.2 * length, 0.0)),
            Vector((0.0, 0.2 * length, -width)),
        ]
        verts = [bm.verts.new(matrix @ point) for point in local]
        for vert in verts:
            vert[deform][group_index] = 1.0
        head, tail, ring = verts[0], verts[1], verts[2:]
        for i in range(4):
            a, b = ring[i], ring[(i + 1) % 4]
            bm.faces.new((head, b, a))
            bm.faces.new((tail, a, b))

    bm.to_mesh(mesh)
    bm.free()
    mesh.update()

    mesh.materials.append(make_flat_material("Skeleton", (150, 130, 235)))
    obj = bpy.data.objects.new("Skeleton", mesh)
    bpy.context.scene.collection.objects.link(obj)
    for name in group_names:
        obj.vertex_groups.new(name=name)
    # vertex_groups.new() indexes follow creation order, which matches the
    # deform-layer indexes written above.
    obj.parent = armature_obj
    modifier = obj.modifiers.new("Armature", "ARMATURE")
    modifier.object = armature_obj
    return obj


if ext == ".pdf":
    # Blender 4.5 exposes Grease Pencil PDF export, not PDF import.
    # Convert the incoming PDF to SVG with Poppler, then import the SVG.
    generated_svg = os.path.join(tempfile.mkdtemp(prefix="voxel3d-pdf-"), "page.svg")
    pdf_to_svg = os.environ.get("PDF_TO_SVG_BIN") or "pdftocairo"
    result = subprocess.run(
        [pdf_to_svg, "-svg", "-f", "1", "-l", "1", input_path, generated_svg],
        check=False,
        capture_output=True,
        text=True,
    )
    if result.returncode != 0:
        raise RuntimeError("PDF to SVG conversion failed: " + (result.stderr or result.stdout)[-4000:])
    input_path = generated_svg
    ext = ".svg"
    from_pdf = True
else:
    from_pdf = False

try:
    if ext == ".3mf":
        try:
            from io_mesh_3mf.api import import_3mf
        except ImportError as exc:
            raise RuntimeError("3MF fallback support is not installed in the conversion worker") from exc
        result = import_3mf(
            input_path,
            import_materials="NONE",
            reuse_materials=False,
            auto_smooth=False,
        )
        if getattr(result, "status", None) != "FINISHED":
            raise RuntimeError("Blender 3MF fallback import failed: " + str(getattr(result, "message", result)))
    elif ext == ".fbx":
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
        # USD declares its stage up-axis (Y or Z). Blender's USD importer
        # converts Y-up stages to Blender's Z-up scene automatically, and the
        # glTF exporter below converts Blender Z-up to glTF Y-up. Do not add an
        # unconditional 90-degree rotation: it breaks valid Z-up USD assets
        # and models whose authored pose is already correct.
        try:
            from pxr import Usd, UsdGeom

            stage = Usd.Stage.Open(input_path)
            if stage:
                up_axis = str(UsdGeom.GetStageUpAxis(stage))
                print("USD source stage up-axis:", up_axis)
            else:
                print("WARNING: USD stage metadata could not be read before import")
        except Exception as exc:
            print("WARNING: USD up-axis metadata unavailable:", str(exc))

        bpy.ops.wm.usd_import(filepath=input_path)
    elif ext == ".abc":
        # Run synchronously: in a headless run a background import job can
        # still be pending when the exporter starts.
        bpy.ops.wm.alembic_import(
            **supported_kwargs(
                bpy.ops.wm.alembic_import,
                filepath=input_path,
                as_background_job=False,
            )
        )
    elif ext == ".bvh":
        bpy.ops.import_anim.bvh(filepath=input_path, target="ARMATURE")
    elif ext == ".svg":
        source = "PDF page 1" if from_pdf else "SVG"
        try:
            import_svg_as_solids(input_path)
        except RuntimeError as exc:
            raise RuntimeError(
                source + " could not be converted: " + str(exc) + ". "
                "Text, embedded images and clipping masks are not supported - "
                "convert text to outlines and export the artwork as plain paths."
            ) from exc
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

    if not list(bpy.context.scene.objects):
        raise RuntimeError("No geometry, armature, or scene objects were imported")

    if ext == ".svg" and not mesh_objects_with_geometry():
        raise RuntimeError("The vector artwork produced no mesh geometry")

    if ext == ".bvh":
        armatures = [obj for obj in bpy.context.scene.objects if obj.type == "ARMATURE"]
        if not armatures:
            raise RuntimeError("The BVH file did not contain a skeleton")
        for armature in armatures:
            build_skeleton_mesh(armature)

    # Select every object that can be exported. Selecting by object avoids
    # relying on select_all(), which silently skips hidden or unselectable
    # objects and left selected_objects empty for some imports.
    bpy.ops.object.select_all(action="DESELECT")
    selectable = [obj for obj in bpy.context.scene.objects if obj.name in bpy.context.view_layer.objects]
    for obj in selectable:
        try:
            obj.hide_set(False)
        except RuntimeError:
            pass
        obj.hide_viewport = False
        obj.select_set(True)
    if not bpy.context.selected_objects:
        raise RuntimeError("Imported objects could not be selected for export")
    bpy.context.view_layer.objects.active = bpy.context.selected_objects[0]

    bpy.ops.export_scene.gltf(
        filepath=args.output,
        export_format="GLB",
        export_yup=True,
        export_animations=True,
        export_materials="EXPORT",
        # Preserve vertex-painted/scan colors even when the imported OBJ has
        # no material node using the color attribute.
        export_vertex_color="ACTIVE",
        export_all_vertex_colors=True,
        export_active_vertex_color_when_no_material=True,
        use_selection=True,
        # Alembic imports drive geometry through a mesh-cache modifier; apply
        # it so the exported mesh is the cache's first frame, not the empty
        # base mesh. Not applied for other formats (keeps skinning/shape keys).
        **({"export_apply": True} if args.ext.lower() == ".abc" else {}),
    )

    if not os.path.isfile(args.output) or os.path.getsize(args.output) < 20:
        raise RuntimeError("Blender finished without writing a GLB file")
finally:
    if generated_svg:
        try:
            os.remove(generated_svg)
            os.rmdir(os.path.dirname(generated_svg))
        except OSError:
            pass
