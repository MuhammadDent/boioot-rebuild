#!/usr/bin/env bash
# Builds (publishes) the .NET backend for production deployment.
# Publishes to {workspace}/out/ so dist/index.cjs can find Boioot.Api.dll.
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo "[build-prod] Publishing .NET API to $WORKSPACE_DIR/out ..."
dotnet publish "$SCRIPT_DIR/src/Boioot.Api" \
  -c Release \
  --no-self-contained \
  -o "$WORKSPACE_DIR/out"
echo "[build-prod] Published → $WORKSPACE_DIR/out/Boioot.Api.dll"

mkdir -p "$WORKSPACE_DIR/artifacts/api-server/dist"
cp "$WORKSPACE_DIR/artifacts/api-server/src/entry.cjs" \
   "$WORKSPACE_DIR/artifacts/api-server/dist/index.cjs"
echo "[build-prod] dist/index.cjs ready"
