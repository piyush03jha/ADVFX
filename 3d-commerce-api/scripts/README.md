# API operational scripts

- `release-migrate.sh` applies committed Prisma migrations.
- `../package.json:db:migrate:deploy` runs `prisma migrate deploy`.
- `../package.json:db:release` applies migrations and seeds the configured admin accounts.

The production API should start with exactly one instance until rate limiting, CAPTCHA nonces and scheduled jobs are moved to shared infrastructure.
