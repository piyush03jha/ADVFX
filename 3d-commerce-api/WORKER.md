# 3D model conversion worker

The API creates a ProductFile and a ProductFileProcessingJob. The worker consumes the existing job row and produces a second ProductFile containing the canonical GLB. No Prisma schema changes are required.

## Runtime

Build and run `Dockerfile.worker` as a separate service with the same PostgreSQL and storage environment as the API.

Required environment:
- DATABASE_URL / the same Prisma database configuration as the API
- STORAGE_PROVIDER and the same storage credentials as the API
- MODEL_PROCESSING_TMP_DIR
- BLENDER_BIN
- GLTF_TRANSFORM_BIN
- GLTF_VALIDATOR_SCRIPT
- PDF_TO_SVG_BIN

For 3MF inputs, the worker first uses `scripts/threemf-to-glb.py`, a Python-standard-library converter that streams the model XML and writes mesh data to disk without starting Blender. It supports core meshes, component/build transforms, referenced model parts, unit conversion, and Z-up to Y-up. Materials and textures are intentionally omitted. Unsupported constructs fall back to the pinned Blender 3MF importer; invalid files and limit violations fail without retrying through Blender.

For STL and PLY, the worker uses `scripts/dense-mesh-to-glb.py` without Blender. Large OBJ files use it too, but smaller OBJ files stay on Blender so material/UV/texture handling is preserved where practical. The native mesh converter exactly welds identical positions up to `VOXEL3D_GLTF_MAX_FACES` (default 0, unlimited face retention); larger meshes are reduced by vertex clustering toward that face budget. This changes only the derived GLB, never the stored source upload. PLY vertex colors are preserved when present; the native OBJ path does not preserve materials, UVs, or textures. Unsupported PLY features can fall back to Blender.

ZIP uploads are safely extracted by the worker and the primary model's extension selects the same conversion route as a direct upload (for example, a ZIP whose primary file is STL uses the native STL converter). The ZIP should contain one primary model/scene plus any dependency files. FBX, USD, Alembic, glTF, SVG, and PDF still use the Blender-based path.

Blender 4.5 LTS handles other non-GLB imports. glTF Transform runs a single quality-driven Meshopt + WebP pass, followed by structural checks and GLB inspection.

### 3MF resource limits

- `VOXEL3D_3MF_MAX_TRIANGLES`: by default sized from the worker's RAM (about 150 bytes per triangle, at most 55% of RAM, minimum 2,000,000, maximum 40,000,000; roughly 31 million on 8 GB). Set a number to override it, or `0` for no limit (the converter still stops cleanly if it runs out of memory). If you set this to `2000000` on your host, delete it to get the automatic value.
- `VOXEL3D_3MF_MAX_XML_MB`: by default `max(512, RAM/4)` MB capped at 4096 per model XML part (about 2 GB on 8 GB). `0` = no limit.
- `VOXEL3D_3MF_MAX_NODES`: default `10000` glTF nodes to cap extreme instancing.
- `VOXEL3D_3MF_EXTRA_SCALE`: optional multiplier applied after 3MF unit conversion; default `1`.
- `THREEMF_NATIVE_CONVERTER=false`: disables the native converter and routes 3MF through Blender.
- `VOXEL3D_GLTF_MAX_FACES`: native STL/PLY/large-OBJ output face budget. Default `0` = no limit (all triangles kept, identical vertices welded). Set a positive number to cap output. If this is set to `200000` (or any number) on your host, delete the variable or set it to `0`.
- `VOXEL3D_DENSE_MAX_TRIANGLES`: maximum accepted input triangles for the dense mesh converter; default `12000000`.
- `VOXEL3D_DENSE_MAX_CELLS`: maximum occupied clustering cells; default `1500000`.
- `VOXEL3D_NATIVE_OBJ_MIN_MB`: minimum OBJ file size for native conversion; default `30` MB. Native OBJ conversion loses materials/UVs/textures.
- `NATIVE_MESH_CONVERTERS=false`: disables all native mesh converters. `THREEMF_NATIVE_CONVERTER=false` separately disables native 3MF conversion.
- `MODEL_OPTIMIZER_SIMPLIFY`: default on for the explicitly selected Smallest preset only (80% static mesh retention target). Balanced does not enable simplification; animated models never use this simplification. No fixed output target.
- `MODEL_OPTIMIZER_NODE_OPTIONS`: defaults to 35% of the worker's RAM (minimum 384 MB, maximum 4096 MB). Set it to override, e.g. `--max-old-space-size=4096`.

These limits are guardrails, not guarantees that every model below them fits in 1 GB. Vertex clustering is lossy geometry reduction and can remove thin details or merge nearby surfaces. Validate representative slicer exports and dense meshes, compare the generated GLBs visually, and monitor container peak memory before raising limits. The native STL/PLY/OBJ measurements supplied with the patch are synthetic/local tests; they are not proof of peak memory on Railway.

## Important input behavior

A single-file upload is sufficient for self-contained GLTF and geometry-only formats. OBJ/GLTF assets that reference external MTL, BIN, or texture files need the existing bundle upload path before conversion; the worker will not silently discard missing dependencies.

The browser should load only the generated GLB; the storefront enables Meshopt decoding. No application upload-byte cap is imposed; multipart provider limits, GLB format limits, disk, triangle and archive guardrails still apply. Generated GLBs upload in sequential 8 MiB chunks. Native mesh writers avoid full duplicate geometry buffers. Compression failure retains the converted GLB with a review warning.

For very dense STL files, the native converter first attempts bounded exact vertex welding. If the weld table reaches its configured cell budget, it releases that memory and streams an unindexed GLB without further geometry simplification. The final optimizer may weld/compress it when resources permit. The triangle, cell, archive, and GLB structural limits are still safety guardrails.

### Storefront LOD
Models above 3 MiB after main optimization are eligible for one additional sequential preview pass (512px textures; static geometry 10% retention target, error 0.005, animated geometry not simplified). A preview is retained only if at least 20% smaller than HD. This is not a file size cap. The high-detail artifact remains the job output; both models use regular product file/media records on publication. Failed or redundant previews fall back to a single on-demand model. Existing products can be backfilled by re-optimizing the high-detail GLB. No schema migration required.
