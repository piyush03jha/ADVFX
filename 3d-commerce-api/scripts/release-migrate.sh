#!/usr/bin/env sh
set -eu
echo "Applying Prisma migrations..."
npx prisma migrate deploy
echo "Migrations applied."
