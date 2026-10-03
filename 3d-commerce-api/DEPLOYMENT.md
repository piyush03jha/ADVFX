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
- AUTH_CAPTCHA_PROVIDER=turnstile
- TURNSTILE_SITE_KEY=<public site key of the same Turnstile widget>
- TURNSTILE_SECRET_KEY=<secret of the same widget>
- TURNSTILE_HOSTNAMES=<domains users open the site on, e.g. example.com,www.example.com>
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
`npm ci`
`npx prisma migrate deploy`
`npm run db:seed-admin`
Build with `npm run build`.
Start with `NODE_ENV=production node dist/main.js`.
