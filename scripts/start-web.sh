#!/usr/bin/env sh
set -eu

echo "[atlas-web] starting service..."
pnpm --filter @atlas/web start
