#!/usr/bin/env bash
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
DLL="$SCRIPT_DIR/src/Boioot.Api/bin/Debug/net8.0/Boioot.Api.dll"
DLL_DIR="$(dirname "$DLL")"

TARGET_PORT="${PORT:-8080}"

# ─── Kill any stale API processes ─────────────────────────────────────────────
pkill -9 -f "Boioot\.Api" 2>/dev/null || true

for i in $(seq 1 10); do
  if ! ss -tlnp 2>/dev/null | grep -q ":${TARGET_PORT}"; then
    break
  fi
  echo "[run-api] Waiting for port ${TARGET_PORT} to be released (${i}s)..."
  sleep 1
done

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Development}"
export PORT="${TARGET_PORT}"
export LD_LIBRARY_PATH="${DLL_DIR}/runtimes/linux-x64/native:${LD_LIBRARY_PATH:-}"

echo "[run-api] Starting .NET on PORT=$PORT"

# ─── Check if rebuild needed ──────────────────────────────────────────────────
NEEDS_REBUILD=false
if [ -f "$DLL" ]; then
  NEWER=$(find "$SCRIPT_DIR/src" -name "*.cs" -newer "$DLL" 2>/dev/null | head -1)
  if [ -n "$NEWER" ]; then
    echo "[run-api] Source changed ($NEWER) — rebuilding..."
    NEEDS_REBUILD=true
  fi
else
  echo "[run-api] DLL missing — will build"
  NEEDS_REBUILD=true
fi

# ─── Rebuild path ─────────────────────────────────────────────────────────────
if [ "$NEEDS_REBUILD" = "true" ]; then
  # Start a minimal Node.js HTTP placeholder so Replit's health-check sees the
  # port while the (slow) build runs.  We kill it right before handing off to dotnet.
  node -e "
const http = require('http');
const port = parseInt(process.argv[1]) || 8080;
const srv = http.createServer((req, res) => {
  res.writeHead(503, { 'Content-Type': 'text/plain' });
  res.end('Building...');
});
srv.listen(port, '0.0.0.0', () => console.log('[placeholder] listening on ' + port));
process.on('SIGTERM', () => srv.close());
" "$TARGET_PORT" &
  PLACEHOLDER_PID=$!
  echo "[run-api] Placeholder started (PID $PLACEHOLDER_PID)"

  echo "[run-api] Building (this may take a few minutes on first run)..."
  cd "$SCRIPT_DIR"
  if ! dotnet build src/Boioot.Api -c Debug 2>&1; then
    kill "$PLACEHOLDER_PID" 2>/dev/null || true
    echo "[run-api] Build FAILED"
    exit 1
  fi
  echo "[run-api] Build complete"

  kill "$PLACEHOLDER_PID" 2>/dev/null || true
  sleep 2  # let port 8080 be fully released before dotnet binds
fi

echo "[run-api] Launching: dotnet $DLL"
exec dotnet "$DLL" --contentroot "$DLL_DIR"
