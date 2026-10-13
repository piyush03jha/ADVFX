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

For STL and PLY, the worker uses `scripts/dense-mesh-to-glb.py` without Blender. Large OBJ files use it too, but smaller OBJ files stay on Blender so material/UV/texture handling is preserved where practical. The native mesh converter exactly welds identical positions up to `VOXEL3D_GLTF_MAX_FACES` (default 250,000 triangles); larger meshes are reduced by vertex clustering toward that face budget. This changes only the derived GLB, never the stored source upload. PLY vertex colors are preserved when present; the native OBJ path does not preserve materials, UVs, or textures. Unsupported PLY features can fall back to Blender.

ZIP uploads are safely extracted by the worker and the primary model's extension selects the same conversion route as a direct upload (for example, a ZIP whose primary file is STL uses the native STL converter). The ZIP should contain one primary model/scene plus any dependency files. FBX, USD, Alembic, glTF, SVG, and PDF still use the Blender-based path.

Blender 4.5 LTS handles other non-GLB imports. glTF Transform optimizes the resulting GLB with Draco + WebP, and Khronos glTF Validator runs before completion.

### 3MF resource limits

- `VOXEL3D_3MF_MAX_TRIANGLES`: default `2000000` triangles. Increase only after measuring peak RSS on the actual worker.
- `VOXEL3D_3MF_MAX_XML_MB`: default `512` MB per model XML part.
- `VOXEL3D_3MF_MAX_NODES`: default `10000` glTF nodes to cap extreme instancing.
- `VOXEL3D_3MF_EXTRA_SCALE`: optional multiplier applied after 3MF unit conversion; default `1`.
- `THREEMF_NATIVE_CONVERTER=false`: disables the native converter and routes 3MF through Blender.
- `VOXEL3D_GLTF_MAX_FACES`: native STL/PLY/large-OBJ output face budget; default `250000`. This is a reduction target, not a quality guarantee.
- `VOXEL3D_DENSE_MAX_TRIANGLES`: maximum accepted input triangles for the dense mesh converter; default `12000000`.
- `VOXEL3D_DENSE_MAX_CELLS`: maximum occupied clustering cells; default `1500000`.
- `VOXEL3D_NATIVE_OBJ_MIN_MB`: minimum OBJ file size for native conversion; default `30` MB. Native OBJ conversion loses materials/UVs/textures.
- `NATIVE_MESH_CONVERTERS=false`: disables all native mesh converters. `THREEMF_NATIVE_CONVERTER=false` separately disables native 3MF conversion.
- `MODEL_OPTIMIZER_NODE_OPTIONS`: defaults to `--max-old-space-size=384` in the worker code to leave RAM for native allocations and the worker process.

These limits are guardrails, not guarantees that every model below them fits in 1 GB. Vertex clustering is lossy geometry reduction and can remove thin details or merge nearby surfaces. Validate representative slicer exports and dense meshes, compare the generated GLBs visually, and monitor container peak memory before raising limits. The native STL/PLY/OBJ measurements supplied with the patch are synthetic/local tests; they are not proof of peak memory on Railway.

## Important input behavior

A single-file upload is sufficient for self-contained GLTF and geometry-only formats. OBJ/GLTF assets that reference external MTL, BIN, or texture files need the existing bundle upload path before conversion; the worker will not silently discard missing dependencies.

The browser should load only the generated GLB. `@react-three/drei`'s `useGLTF` supports Draco-compressed models by default; a custom decoder path can be supplied if desired.
