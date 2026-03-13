#!/usr/bin/env sh
set -eu

if [ "${RUN_MIGRATIONS_ON_BOOT:-true}" = "true" ]; then
  echo "[atlas-api] running prisma migrate deploy..."
  pnpm --filter @atlas/api exec prisma migrate deploy
fi

echo "[atlas-api] starting service..."
pnpm --filter @atlas/api start
