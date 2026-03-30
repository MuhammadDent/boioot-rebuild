#!/usr/bin/env bash
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# ─── Clear stale processes ─────────────────────────────────────────────────────
pkill -f "Boioot.Api" 2>/dev/null || true
pkill -f "dotnet.*Boioot" 2>/dev/null || true
pkill -f "proxy.mjs" 2>/dev/null || true
sleep 1

# ─── Start .NET backend directly on PORT ──────────────────────────────────────
# Program.cs reads PORT env var and calls ListenAnyIP(port).
# No proxy layer — dotnet owns PORT directly (same as production).
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"
export PORT="${PORT:-8080}"

echo "[run-api] Starting .NET on PORT=$PORT"

cd "$SCRIPT_DIR"
exec dotnet run \
  --project src/Boioot.Api \
  --no-launch-profile
