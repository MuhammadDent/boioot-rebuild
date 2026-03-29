#!/usr/bin/env bash
# Builds (publishes) the .NET backend for production deployment.
# Output: boioot/apps/backend/publish/
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

echo "[build-prod] Publishing .NET API..."
dotnet publish "$SCRIPT_DIR/src/Boioot.Api" \
  -c Release \
  --no-self-contained \
  -o "$SCRIPT_DIR/publish"

echo "[build-prod] .NET API published → $SCRIPT_DIR/publish"
