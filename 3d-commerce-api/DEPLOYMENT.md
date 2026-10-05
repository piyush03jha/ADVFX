# ADVFX API deployment

## Production architecture

Run the NestJS API and the processing worker as Railway services using the same Docker image/configuration.

- **PostgreSQL:** Prisma Postgres
- **Object storage:** Backblaze B2 through its S3-compatible API
- **API:** Railway
- **Processing worker:** Railway
- **Frontend/assets:** Next.js on Cloudflare/OpenNext
- **Payments:** Razorpay

The API and worker must use the **same Prisma Postgres database URL and Backblaze B2 bucket/credentials**. Do not use Railway's local filesystem as persistent production storage.

## Required production environment

Set these on **both the API and worker Railway services**:

- `NODE_ENV=production`
- `PORT=4000`
- `DATABASE_URL=<Prisma Postgres connection string>`
- `CORS_ORIGINS=<frontend origin>`
- `FRONTEND_URL=<frontend URL>`
- `RAZORPAY_KEY_ID=<live/test key>`
- `RAZORPAY_KEY_SECRET=<secret>`
- `RAZORPAY_WEBHOOK_SECRET=<webhook secret>`
- `AUTH_CAPTCHA_PROVIDER=math`
- `AUTH_CAPTCHA_SECRET=<32+ character secret>`
- `RESEND_API_KEY=<email provider key>`
- `AUTH_EMAIL_FROM=<verified sender>`
- `STORAGE_PROVIDER=b2`
- `STORAGE_BUCKET=<Backblaze B2 bucket name only>`
- `STORAGE_ENDPOINT=https://s3.<region>.backblazeb2.com`
- `STORAGE_ACCESS_KEY_ID=<B2 application key ID>`
- `STORAGE_SECRET_ACCESS_KEY=<B2 application key secret>`
- `STORAGE_REGION=<same region embedded in the B2 endpoint>`
- Leave `STORAGE_PUBLIC_BASE_URL` unset for a private bucket.
- `TRUST_PROXY=true` when Railway/proxy configuration requires it.
- `API_RATE_LIMIT_PER_MINUTE=120`
- `PROCESSING_WORKER_CONCURRENCY=1`
- `MODEL_PROCESSING_NODE_OPTIONS=--max-old-space-size=384`

The worker should have enough container memory for Blender, gltf-transform and native image/model processing. Start with **at least 1 GB**, preferably **2 GB** for large model workloads, then tune from observed peak memory.

Never commit production environment values.

## Backblaze B2 object storage

Backblaze B2 is accessed through its S3-compatible API. Use the regional S3 endpoint, bucket name, application key ID/secret, and matching region. The bucket remains private; browser uploads use short-lived presigned multipart URLs and browser downloads use the API asset route.

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


## B2 browser upload setup

Backblaze B2 browser multipart uploads require the bucket's native CORS rules. Do not rely on the generic S3 PutBucketCors helper for B2.

Apply:

    b2 bucket update --cors-rules "$(cat scripts/b2-cors-rules.json)" <bucket-name> allPrivate

For older B2 CLI versions use the equivalent b2 update-bucket command.

Then diagnose the complete B2 path:

    STORAGE_PROVIDER=b2 npx tsx scripts/b2-diagnose.ts https://voxel3d.org

The diagnostic checks endpoint/region/bucket configuration, server-side PUT/HEAD/GET/DELETE, and the browser PUT preflight. The browser multipart uploader must receive an exposed ETag for every uploaded part.

Existing objects from a previous storage provider are not automatically copied into B2. Copy them using their existing storage keys before switching production traffic; otherwise database records can point to objects that do not exist in B2.
