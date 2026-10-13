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

Blender 4.5 LTS handles other non-GLB imports. glTF Transform optimizes the resulting GLB with Draco + WebP, and Khronos glTF Validator runs before completion.

### 3MF resource limits

- `VOXEL3D_3MF_MAX_TRIANGLES`: default `2000000` triangles. Increase only after measuring peak RSS on the actual worker.
- `VOXEL3D_3MF_MAX_XML_MB`: default `512` MB per model XML part.
- `VOXEL3D_3MF_EXTRA_SCALE`: optional multiplier applied after 3MF unit conversion; default `1`.
- `THREEMF_NATIVE_CONVERTER=false`: disables the native converter and routes 3MF through Blender.
- `MODEL_OPTIMIZER_NODE_OPTIONS`: defaults to `--max-old-space-size=384` in the worker code to leave RAM for native allocations and the worker process.

The triangle limit is a guardrail, not a guarantee that every model below it fits in 1 GB. Validate representative Bambu, Orca, and Prusa files and monitor container peak memory before raising it.

## Important input behavior

A single-file upload is sufficient for self-contained GLTF and geometry-only formats. OBJ/GLTF assets that reference external MTL, BIN, or texture files need the existing bundle upload path before conversion; the worker will not silently discard missing dependencies.

The browser should load only the generated GLB. `@react-three/drei`'s `useGLTF` supports Draco-compressed models by default; a custom decoder path can be supplied if desired.
