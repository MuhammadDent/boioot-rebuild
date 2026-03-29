#!/usr/bin/env bash
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

PROXY_PORT="${PORT:-8080}"
# DOTNET_PORT controls what port the .NET backend binds to.
# Must be different from PROXY_PORT to avoid conflicts.
export DOTNET_PORT="${DOTNET_PORT:-5233}"
BACKEND_PORT="$DOTNET_PORT"

# ─── Clear stale processes (pkill is available; fuser/lsof are not) ───────────
pkill -f "Boioot.Api" 2>/dev/null || true
pkill -f "dotnet.*Boioot" 2>/dev/null || true
pkill -f "proxy.mjs" 2>/dev/null || true
sleep 2

# ─── Start the Node.js API proxy in the background ────────────────────────────
# Proxy listens on PORT (set by Replit, default 8080) and forwards to .NET.
(
  cd "$WORKSPACE_DIR"
  exec node artifacts/api-server/src/proxy.mjs
) &
PROXY_PID=$!

sleep 1
if kill -0 "$PROXY_PID" 2>/dev/null; then
  echo "[run-api] proxy started (pid $PROXY_PID) → :$PROXY_PORT ⟶ .NET :$BACKEND_PORT"
else
  echo "[run-api] WARNING: proxy failed to start on :$PROXY_PORT"
fi

# ─── Start the .NET backend (foreground) ──────────────────────────────────────
# Program.cs reads DOTNET_PORT (exported above = 5233).
# PORT env var stays at 8080 for the proxy; .NET won't touch it.
export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"

cd "$SCRIPT_DIR"
exec dotnet run \
  --project src/Boioot.Api \
  --no-launch-profile
