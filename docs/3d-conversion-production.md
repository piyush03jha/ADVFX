# 3D conversion worker production settings

Set these on the Railway worker service:

```
CONVERSION_WORKER_ENABLED=true
CONVERSION_WORKER_POLL_INTERVAL_MS=2000
CONVERSION_WORKER_STALE_AFTER_MS=7200000
CONVERSION_TIMEOUT_MS=1800000
MODEL_OPTIMIZATION_TIMEOUT_MS=1800000
# Optional: the optimizer heap and the 3MF/STL triangle limits now size themselves from the
# worker's RAM. Remove any old VOXEL3D_3MF_MAX_TRIANGLES / VOXEL3D_GLTF_MAX_FACES /
# MODEL_OPTIMIZER_NODE_OPTIONS values to use the automatic ones (see WORKER.md).
# Conversion of very large models takes longer, so also consider:
# CONVERSION_TIMEOUT_MS=1800000
# MODEL_OPTIMIZATION_TIMEOUT_MS=1800000
```

For automatic storefront revalidation after a background publish, also set:

```
STOREFRONT_REVALIDATE_URL=https://voxel3d.org/api/internal/revalidate-product
CATALOG_REVALIDATE_SECRET=<same-random-secret-on-frontend-and-worker>
```

Keep worker concurrency at 1 on the current Railway worker size. Increase memory before increasing concurrency.

The optimizer uses glTF-Transform CLI 4.5.1, Meshopt geometry compression and WebP texture compression. WebP optimizes transfer size; Meshopt requires a Meshopt-capable GLTFLoader, which the storefront's Drei `useGLTF(..., true, true)` paths provide.

The output is a web-optimized GLB and an optional lightweight preview. Standalone jobs delete the conversion-owned original and converted intermediate after the optimized output has been verified and marked READY. Catalog-owned sources remain until successful publication. Re-optimization starts from the retained HD GLB; upload the original again for a fresh full-detail conversion.

Balanced uses one pass with no explicit geometry simplification and 2048px texture maximum. Smallest uses one pass with 1024px textures and optional 80% static geometry retention. Neither preset has a fixed output byte target. The API and catalog accept non-empty uploads without a fixed application byte limit; actual processing remains bounded by storage, GLB format, archive and geometry safety limits and available worker resources. Benchmark on the 8 GB worker before raising those limits.

Storefront: new conversions generate an optional lightweight GLB after the main optimizer has exited. The image tab loads without geometry; the 3D tab uses the lightweight variant where available, with an explicit HD toggle. Preview URLs use the existing same-origin Cloudflare asset route and full GET cache. Existing browser device memory guards are retained. Keep one worker; test both models visually and benchmark the additional sequential pass on Railway.
