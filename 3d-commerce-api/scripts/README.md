# API operational scripts

- `release-migrate.sh` applies committed Prisma migrations.
- `../package.json:db:migrate:deploy` runs `prisma migrate deploy`.
- `../package.json:db:release` applies migrations and seeds the configured admin accounts.
- `cleanup-optimized-originals.ts` (`npm run storage:cleanup-originals`) is a one-time cleanup of originals and temporary copies left by 3D conversion jobs that were already optimized and published. It is a dry run unless `--apply` is passed, and it never deletes an optimized model that a product uses. Run the dry run first, review the list, then add `--apply`.

The production API should start with exactly one instance until rate limiting, CAPTCHA nonces and scheduled jobs are moved to shared infrastructure.
