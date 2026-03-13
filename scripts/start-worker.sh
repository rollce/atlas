#!/usr/bin/env sh
set -eu

echo "[atlas-worker] starting service..."
pnpm --filter @atlas/worker start
