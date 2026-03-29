#!/usr/bin/env bash
# Builds (publishes) the .NET backend for production deployment.
# Also generates artifacts/api-server/dist/index.cjs so Replit's deployment
# system can run: node artifacts/api-server/dist/index.cjs
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# ─── 1. Publish .NET backend ──────────────────────────────────────────────────
echo "[build-prod] Publishing .NET API..."
dotnet publish "$SCRIPT_DIR/src/Boioot.Api" \
  -c Release \
  --no-self-contained \
  -o "$SCRIPT_DIR/publish"
echo "[build-prod] .NET API published → $SCRIPT_DIR/publish"

# ─── 2. Generate artifacts/api-server/dist/index.cjs ─────────────────────────
# Replit deployment runs:  node artifacts/api-server/dist/index.cjs
# We generate it from src/entry.cjs (which starts .NET + proxies HTTP).
DIST_DIR="$WORKSPACE_DIR/artifacts/api-server/dist"
mkdir -p "$DIST_DIR"
cp "$WORKSPACE_DIR/artifacts/api-server/src/entry.cjs" "$DIST_DIR/index.cjs"
echo "[build-prod] Generated artifacts/api-server/dist/index.cjs"
