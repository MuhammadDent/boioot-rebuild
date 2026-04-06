#!/usr/bin/env bash
# Production startup:
#   1. Clears stale processes
#   2. Starts Node.js proxy on $PORT (→ .NET on DOTNET_PORT)
#   3. Launches published .NET binary (foreground)
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

PROXY_PORT="${PORT:-8080}"
BACKEND_PORT="${DOTNET_PORT:-5233}"

# ─── Clear stale processes ─────────────────────────────────────────────────────
pkill -f "Boioot.Api" 2>/dev/null || true
pkill -f "dotnet.*Boioot" 2>/dev/null || true
pkill -f "proxy.mjs" 2>/dev/null || true
sleep 2

# ─── Start the Node.js proxy (background) ─────────────────────────────────────
(
  cd "$WORKSPACE_DIR"
  exec node artifacts/api-server/src/proxy.mjs
) &
PROXY_PID=$!

sleep 1
if kill -0 "$PROXY_PID" 2>/dev/null; then
  echo "[run-api-prod] proxy started (pid $PROXY_PID) → :$PROXY_PORT ⟶ .NET :$BACKEND_PORT"
else
  echo "[run-api-prod] WARNING: proxy failed to start on :$PROXY_PORT"
fi

# ─── Start the published .NET backend (foreground) ────────────────────────────
# Program.cs reads DOTNET_PORT (default: 5233). PORT env var is for proxy only.
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Production}"

exec "$SCRIPT_DIR/publish/Boioot.Api"
