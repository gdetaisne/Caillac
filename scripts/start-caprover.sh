#!/usr/bin/env bash
set -euo pipefail

echo "[start] NODE_ENV=${NODE_ENV:-}"
echo "[start] PORT=${PORT:-3000}"

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "[start] ERROR: DATABASE_URL is required"
  exit 1
fi
if [[ -z "${UPLOAD_DIR:-}" ]]; then
  echo "[start] ERROR: UPLOAD_DIR is required (CapRover persistent app data path)"
  exit 1
fi

echo "[start] prisma migrate deploy (retry)"
for i in $(seq 1 30); do
  if pnpm -C packages/db prisma:migrate:deploy; then
    echo "[start] migrate ok"
    break
  fi
  echo "[start] migrate failed (attempt $i/30), retry in 2s..."
  sleep 2
done

echo "[start] starting worker (background)"
node apps/worker/dist/index.js &

echo "[start] starting next (foreground)"
cd apps/web
exec node ../../node_modules/next/dist/bin/next start -p "${PORT:-3000}"

