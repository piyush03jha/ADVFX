# Security and analytics hardening rollout

These changes introduce PostgreSQL-backed tables and payment/conversion schema updates. Deploy all migrations before enabling the corresponding features.

## Rollout order

1. Deploy this code to staging with the three feature flags below unset or set to `false`.
2. From `3d-commerce-api`, run `npm run db:migrate:deploy` against the staging database.
3. Verify the tables `ApiRateLimitBucket`, `AuthCaptchaNonce`, and `ProductViewEvent` exist, and that `ProductPrice.countryCode`, conversion completion fields, and the `REFUND_PENDING` payment state are present.
4. Set the three feature flags to `true` in the staging API environment and restart the API.
5. Run unit tests, API smoke tests, duplicate-webhook tests, and concurrent checkout tests against staging.
6. Repeat the migration and flag activation for production only after staging verification.

## Feature flags

- `SHARED_RATE_LIMIT_ENABLED=true`: uses PostgreSQL atomic upserts so request counters are shared across API replicas. If unset, the API retains its process-local rate limiter.
- `DISTRIBUTED_CAPTCHA_REPLAY_ENABLED=true`: uses the `AuthCaptchaNonce` primary key to reject replayed math-CAPTCHA tokens across replicas. If unset, replay markers remain process-local.
- `PRODUCT_VIEW_DEDUPE_ENABLED=true`: records one product view per anonymized visitor/product/UTC day. If unset, the existing metric increment behavior remains active.

Do not enable a flag until its migration is present in the target database. The feature flags make rolling deployments safe while the database migration is being applied.

## Country-specific product prices

The admin product-price endpoint `POST /products/:id/pricing` accepts an optional ISO 3166-1 alpha-2 `countryCode` and a currency. For example:

```json
{
  "countryCode": "IN",
  "currency": "INR",
  "amountMinor": 149900,
  "compareAtMinor": 169900
}
```

A price with a matching country code takes precedence during checkout; a price with `countryCode: null` is the global fallback. Prices are stored in minor currency units (for INR, paise). The admin catalog now exposes product-level country pricing and a separate country-specific price form for each size variant. Variant prices can be set through `POST /products/:id/variants/:variantId/country-pricing`. Existing variant prices remain the fallback when no country-specific variant price exists.

## Refund reconciliation

A refund attempt is claimed with the `REFUND_PENDING` payment-attempt state before calling Razorpay. This prevents concurrent webhook deliveries from issuing duplicate refunds. If the provider call times out or fails ambiguously, the attempt intentionally remains `REFUND_PENDING`. The minute scheduler checks provider refund totals and marks completed refunds; it does not blindly submit another refund while the provider outcome is ambiguous. Anything still pending without a confirmed provider refund requires operator reconciliation in Razorpay.

## Relevant migrations

- `20261025200000_product_view_dedupe`
- `20261025200500_auth_captcha_nonce`
- `20261025201000_shared_api_rate_limit`
- `20261025201500_country_product_pricing`
- `20261025202000_conversion_completion_recovery`
- `20261025202500_payment_refund_pending`
- `20261025203000_variant_country_pricing`
- `20261025204000_order_shipping_snapshot`
- `20261025205000_promotion_per_user_limit`

## Verification commands

From `3d-commerce-api` after dependencies and environment variables are configured:

```bash
npm test -- --runInBand
npm run build
```

Run concurrency and webhook integration tests against a staging PostgreSQL database. Do not use production for load or concurrency testing.

## Follow-up audit hardening

- **Trusted client IP:** set the same random secret of at least 32 characters as `INTERNAL_PROXY_SECRET` in both the Next.js frontend and NestJS API environments. The Next.js proxy signs the Cloudflare client IP; the API validates the signature and never trusts arbitrary `X-Forwarded-For`. The API listener intentionally keeps Fastify `trustProxy` disabled. If the secret is missing, client-specific limits fall back to the API connection IP.
- **Rate limiting:** apply migrations first, then set `SHARED_RATE_LIMIT_ENABLED=true`. Counters are separated by route so product/media traffic does not consume a single site-wide bucket. A database outage falls back to a local counter and emits an error log; local fallback is not shared across replicas.
- **CAPTCHA:** production forces Cloudflare Turnstile. Set `TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY`, and the allowed `TURNSTILE_HOSTNAMES` before production rollout. If Turnstile is not configured, auth CAPTCHA issuance fails closed.
- **Shipping history:** `Order.shippingAddressSnapshot` preserves the destination at order time. API order responses fall back to the snapshot if a customer deletes the saved address.
- **Custom checkout:** custom orders do not require stock reservations. Unpaid custom orders older than the reservation window are reconciled against Razorpay and cancelled when no payment is captured.
- **Coupon limits:** `Promotion.usageLimitPerUser` defaults to one use per customer. The checkout transaction locks the promotion before enforcing the per-customer count, preventing concurrent claims from bypassing the limit.
- **Database pool:** use a bounded Prisma `connection_limit` per API replica (the example uses 5). Calculate the aggregate pool across all API/worker replicas against the actual PostgreSQL connection budget. The synchronous Razorpay call in order creation remains a latency consideration and should be load-tested against the deployed provider and database.
- **Migration list additions:** `20261025204000_order_shipping_snapshot` and `20261025205000_promotion_per_user_limit` must be applied before deploying code that uses these fields.
