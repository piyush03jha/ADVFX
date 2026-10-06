# 3D conversion worker production settings

Set these on the Railway worker service:

```
CONVERSION_WORKER_ENABLED=true
CONVERSION_WORKER_POLL_INTERVAL_MS=2000
CONVERSION_WORKER_STALE_AFTER_MS=7200000
CONVERSION_TIMEOUT_MS=600000
MODEL_OPTIMIZATION_TIMEOUT_MS=600000
MODEL_OPTIMIZER_NODE_OPTIONS=--max-old-space-size=2048
```

For automatic storefront revalidation after a background publish, also set:

```
STOREFRONT_REVALIDATE_URL=https://voxel3d.org/api/internal/revalidate-product
CATALOG_REVALIDATE_SECRET=<same-random-secret-on-frontend-and-worker>
```

Keep worker concurrency at 1 on the current Railway worker size. Increase memory before increasing concurrency.

The optimizer uses glTF-Transform CLI 4.5.1, Meshopt geometry compression and WebP texture compression. WebP optimizes transfer size; Meshopt requires a Meshopt-capable GLTFLoader, which the storefront's Drei `useGLTF(..., true, true)` paths provide.

The output is a web-optimized GLB. A separate converted GLB is retained in the private conversion library for admin download; it is never exposed through the storefront catalog.
