#!/usr/bin/env bash
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/../../.." && pwd)"

# ─── Start the Node.js API proxy in the background ────────────────────────────
# Uses PORT=8080 (the port the Replit proxy routes /api/* to).
# If another instance is already running on 8080, the subshell exits quietly.
(
  cd "$WORKSPACE_DIR"
  PORT=8080 node artifacts/api-server/src/proxy.mjs 2>/dev/null
) &
PROXY_PID=$!

# Give the proxy a moment to bind, then check it came up
sleep 1
if kill -0 "$PROXY_PID" 2>/dev/null; then
  echo "[run-api] API proxy started (pid $PROXY_PID) → :8080 ⟶ .NET backend :5233"
else
  echo "[run-api] API proxy already running on :8080 — skipping"
fi

# ─── Start the .NET backend (foreground) ──────────────────────────────────────
cd "$SCRIPT_DIR"
exec dotnet run \
  --project src/Boioot.Api \
  --no-launch-profile \
  -- \
  --urls "http://+:5233"
