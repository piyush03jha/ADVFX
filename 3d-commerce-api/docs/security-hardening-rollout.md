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

A price with a matching country code takes precedence during checkout; a price with `countryCode: null` is the global fallback. Prices are stored in minor currency units (for INR, paise). Set the country price for each product from the admin API; existing admin forms that do not send `countryCode` continue to create/update the global fallback price.

## Relevant migrations

- `20261025200000_product_view_dedupe`
- `20261025200500_auth_captcha_nonce`
- `20261025201000_shared_api_rate_limit`
- `20261025201500_country_product_pricing`
- `20261025202000_conversion_completion_recovery`
- `20261025202500_payment_refund_pending`

## Verification commands

From `3d-commerce-api` after dependencies and environment variables are configured:

```bash
npm test -- --runInBand
npm run build
```

Run concurrency and webhook integration tests against a staging PostgreSQL database. Do not use production for load or concurrency testing.
