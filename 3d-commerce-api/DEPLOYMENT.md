# ADVFX API deployment

## Production architecture

Run the NestJS API and the processing worker as Railway services using the same Docker image/configuration.

- **PostgreSQL:** Neon
- **Object storage:** Neon Object Storage through its S3-compatible API
- **API:** Railway
- **Processing worker:** Railway
- **Frontend/assets:** Next.js on Cloudflare/OpenNext
- **Payments:** Razorpay

The API and worker must use the **same Neon Object Storage bucket and credentials**. Do not use Railway's local filesystem as persistent production storage.

## Required production environment

Set these on **both the API and worker Railway services**:

- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=<Neon PostgreSQL connection string>`
- `CORS_ORIGINS=<frontend origin>`
- `FRONTEND_URL=<frontend URL>`
- `RAZORPAY_KEY_ID=<live/test key>`
- `RAZORPAY_KEY_SECRET=<secret>`
- `RAZORPAY_WEBHOOK_SECRET=<webhook secret>`
- `AUTH_CAPTCHA_PROVIDER=math`
- `AUTH_CAPTCHA_SECRET=<32+ character secret>`
- `RESEND_API_KEY=<email provider key>`
- `AUTH_EMAIL_FROM=<verified sender>`
- `STORAGE_PROVIDER=s3`
- `STORAGE_BUCKET=<Neon Object Storage bucket on the production branch>`
- `STORAGE_ENDPOINT=<Neon S3 endpoint for that bucket/branch>`
- `STORAGE_ACCESS_KEY_ID=<Neon access key>`
- `STORAGE_SECRET_ACCESS_KEY=<Neon secret>`
- `STORAGE_REGION=<exact region required by the Neon bucket endpoint>`
- Leave `STORAGE_PUBLIC_BASE_URL` unset for a private bucket.
- `TRUST_PROXY=true` when Railway/proxy configuration requires it.
- `API_RATE_LIMIT_PER_MINUTE=120`
- `PROCESSING_WORKER_CONCURRENCY=1`
- `MODEL_PROCESSING_NODE_OPTIONS=--max-old-space-size=384`

The worker should have enough container memory for Blender, gltf-transform and native image/model processing. Start with **at least 1 GB**, preferably **2 GB** for large model workloads, then tune from observed peak memory.

Never commit production environment values.

## Neon Object Storage

Neon Object Storage is accessed through its S3-compatible API. Use the endpoint, credentials, bucket and region shown for the **same production Neon branch** used by `DATABASE_URL`.

Do not assume the development bucket credentials or endpoint are valid for production.

Before deployment, verify the bucket with a small S3-compatible smoke test:

1. PUT a small object.
2. HEAD the object and verify Content-Length.
3. GET/stream the object.
4. DELETE it.
5. Repeat the test through `StorageService`.

The application keeps the bucket private. Browser requests use the authenticated/public asset endpoints exposed by the API and Next.js; Neon S3 credentials must never reach the browser.

## Asset delivery

Product/category assets are streamed from storage instead of being buffered into a complete Buffer.

Published asset keys are immutable, so the Next.js Cloudflare asset route stores successful responses in `caches.default` with a one-year immutable cache policy.

The product asset controller continues to require an **ACTIVE** product for public delivery. Admin previews/downloads use the authenticated admin file endpoints instead.

## Model processing

The model pipeline is:

```
source upload
  -> temporary/source storage
  -> Blender conversion when required
  -> GLB validation
  -> gltf-transform
  -> Meshopt geometry compression
  -> WebP texture compression
  -> texture size ceiling
  -> optimized GLB validation
  -> persist optimized GLB
  -> publish MODEL_PREVIEW
  -> delete original source
```

The source is deleted only when a processing job has an `outputFileId`. Validation-only image/document jobs retain their source files.

A 25 MB model may become 6–10 MB, but no exact output size is guaranteed. Check worker logs for the actual source/optimized byte sizes and reduction percentage.

## Release

Run from the release environment:

`npm ci`

`npx prisma migrate deploy`

`npm run db:seed-admin`

Build with:

`npm run build`

Start with:

`NODE_ENV=production node dist/main.js`
