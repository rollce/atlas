#!/usr/bin/env sh
set -eu

echo "[atlas-web] starting service..."
pnpm --filter @atlas/web preview --host 0.0.0.0 --port "${PORT:-3000}"
