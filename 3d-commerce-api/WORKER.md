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

Blender 4.5 LTS is used for non-GLB imports. glTF Transform optimizes the resulting GLB with Draco + WebP, and Khronos glTF Validator runs before completion.

## Important input behavior

A single-file upload is sufficient for self-contained GLTF and geometry-only formats. OBJ/GLTF assets that reference external MTL, BIN, or texture files need the existing bundle upload path before conversion; the worker will not silently discard missing dependencies.

The browser should load only the generated GLB. `@react-three/drei`'s `useGLTF` supports Draco-compressed models by default; a custom decoder path can be supplied if desired.
