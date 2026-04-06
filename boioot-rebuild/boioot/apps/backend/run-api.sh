#!/usr/bin/env bash
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DLL="$SCRIPT_DIR/src/Boioot.Api/bin/Debug/net8.0/Boioot.Api.dll"
DLL_DIR="$(dirname "$DLL")"

TARGET_PORT="${PORT:-8080}"

# ─── Kill any stale API processes ─────────────────────────────────────────────
# Process name when using "exec dotnet <DLL>": the binary path without .dll
# Process name when using "dotnet run": "dotnet" with "run" arg
# Use SIGKILL (-9) for immediate termination to avoid port-held delays.
# Do NOT kill proxy.mjs — that is Replit's internal routing process.
pkill -9 -f "Boioot\.Api" 2>/dev/null || true

# Wait until port is released (up to 10 seconds)
for i in $(seq 1 10); do
  if ! ss -tlnp 2>/dev/null | grep -q ":${TARGET_PORT}"; then
    break
  fi
  echo "[run-api] Waiting for port ${TARGET_PORT} to be released (${i}s)..."
  sleep 1
done

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"
export PORT="${TARGET_PORT}"

echo "[run-api] Starting .NET on PORT=$PORT"

# ─── Fast path: run pre-built Debug binary (no compilation delay) ─────────────
# IMPORTANT: --contentroot must point to the DLL directory so ASP.NET Core
# finds appsettings.json there (otherwise it defaults to the workflow CWD
# /artifacts/api-server — no appsettings.json → falls back to SQLite).
if [ -f "$DLL" ]; then
  echo "[run-api] Pre-built binary found — starting directly (fast path)"
  exec dotnet "$DLL" --contentroot "$DLL_DIR"
fi

# ─── Slow path: binary missing — compile and run ──────────────────────────────
echo "[run-api] Pre-built binary not found — running dotnet run (will compile)..."
cd "$SCRIPT_DIR"
exec dotnet run \
  --project src/Boioot.Api \
  --no-launch-profile
