# ADVFX API deployment

## Oracle Cloud

Run the API as **one instance initially**. The rate limiter, CAPTCHA nonce store and scheduled jobs are process-local.

Required production environment:
- NODE_ENV=production
- PORT=3001
- DATABASE_URL=<managed PostgreSQL connection string>
- CORS_ORIGINS=<frontend origin>
- FRONTEND_URL=<frontend URL>
- RAZORPAY_KEY_ID=<live/test key>
- RAZORPAY_KEY_SECRET=<secret>
- RAZORPAY_WEBHOOK_SECRET=<webhook secret>
- AUTH_CAPTCHA_SECRET=<32+ character secret>
- RESEND_API_KEY=<email provider key>
- AUTH_EMAIL_FROM=<verified sender>
- STORAGE_PROVIDER=r2 or s3
- STORAGE_BUCKET=<bucket>
- STORAGE_ENDPOINT=<S3-compatible endpoint>
- STORAGE_ACCESS_KEY_ID=<access key>
- STORAGE_SECRET_ACCESS_KEY=<secret>
- STORAGE_PUBLIC_BASE_URL=<CDN/custom public base URL>
- TRUST_PROXY=true when Oracle is behind a trusted reverse proxy
- API_RATE_LIMIT_PER_MINUTE=120

Never commit this environment file.

## Release
Run from the release environment:
```sh
npm ci
npx prisma migrate deploy
npm run db:seed-admin
```
Do not run the admin seed on every deployment unless the admin environment variables are intentionally supplied. It is idempotent and supports at most two admins.

Start one API instance:
```sh
NODE_ENV=production node dist/src/main.js
```

Health checks:
- GET /health
- GET /ready

## R2 and CDN
Use an R2 bucket with its S3-compatible endpoint. Set STORAGE_PUBLIC_BASE_URL to the R2 custom domain or CDN URL. Product GLB files should be served from that URL, not from the API container filesystem.

For existing GLB/OBJ assets, upload optimized production copies to R2/CDN and update product media/file records to their CDN URLs. Keep source masters outside the public web bucket.

## 3D optimization
Prefer GLB over OBJ/GLTF. Optimize with meshopt or Draco before publishing. Most customer-facing models should be a few MB rather than tens of MB. Validate the result on low-end mobile before replacement.

## Scaling rule
Keep one API instance until shared state is introduced. Before multiple instances, move rate limiting and CAPTCHA nonces to Redis and put expiry/reconciliation jobs behind a distributed lock or queue.
