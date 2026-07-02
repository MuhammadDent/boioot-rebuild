#!/usr/bin/env bash
# Production build for the full Boioot app:
#   1. Publishes the .NET API to {workspace}/out (via backend/build-prod.sh)
#   2. Builds the Next.js frontend (boioot/apps/frontend/.next)
# The deployment run command (boioot/run-prod.sh) then starts both.
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[build-prod] === 1/2: Publishing .NET API ==="
bash "$SCRIPT_DIR/apps/backend/build-prod.sh"

echo "[build-prod] === 2/2: Building Next.js frontend ==="
cd "$SCRIPT_DIR/apps/frontend"

# Ensure dependencies are present (cloud builder normally carries node_modules,
# but install if missing).
if [ ! -d node_modules/next ]; then
  echo "[build-prod] node_modules missing — installing frontend dependencies..."
  pnpm install --frozen-lockfile
fi

# BACKEND_URL is baked into Next.js rewrites at build time; in production the
# API runs on the same machine on port 8080 (see run-prod.sh).
export BACKEND_URL="http://127.0.0.1:8080"
pnpm build

echo "[build-prod] Done. API → out/Boioot.Api.dll, frontend → apps/frontend/.next"
