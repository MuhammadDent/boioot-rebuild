#!/usr/bin/env bash
# Production start for the full Boioot app (single Replit deployment):
#   - .NET API listens INTERNALLY on 127.0.0.1:8080 (Kestrel binds $PORT env)
#   - Next.js serves the public site on the Replit-assigned $PORT
#   - Next.js rewrites proxy /api, /uploads, /videos, /hubs → BACKEND_URL (8080)
# If either process dies, the script exits so autoscale restarts the instance.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WORKSPACE_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

PUBLIC_PORT="${PORT:-3000}"
API_PORT=8080

export ASPNETCORE_ENVIRONMENT="${ASPNETCORE_ENVIRONMENT:-Production}"
export BACKEND_URL="http://127.0.0.1:${API_PORT}"

API_PID=""
WEB_PID=""
cleanup() {
  [ -n "$API_PID" ] && kill "$API_PID" 2>/dev/null || true
  [ -n "$WEB_PID" ] && kill "$WEB_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

echo "[run-prod] Starting .NET API on internal port ${API_PORT}..."
# --contentroot MUST point at the publish directory so ASP.NET Core loads
# out/appsettings.json (Database:Provider=PostgreSQL, Jwt, AdminSeed, ...).
# Without it the content root is the CWD, appsettings.json is not found, and
# the API silently falls back to SQLite → every query 500s in production.
PORT="$API_PORT" dotnet "$WORKSPACE_DIR/out/Boioot.Api.dll" \
  --contentroot "$WORKSPACE_DIR/out" &
API_PID=$!

# Bounded, non-fatal wait for the API port so proxied routes work as soon as
# the site goes live. (Kestrel binds before DB seeding, so this is fast.)
for i in $(seq 1 30); do
  if (exec 3<>"/dev/tcp/127.0.0.1/${API_PORT}") 2>/dev/null; then
    exec 3>&- 3<&- || true
    echo "[run-prod] API is accepting connections."
    break
  fi
  if ! kill -0 "$API_PID" 2>/dev/null; then
    echo "[run-prod] API process exited during startup — aborting."
    exit 1
  fi
  sleep 1
done

echo "[run-prod] Starting Next.js on public port ${PUBLIC_PORT}..."
cd "$SCRIPT_DIR/apps/frontend"
PORT="$PUBLIC_PORT" node_modules/.bin/next start -p "$PUBLIC_PORT" -H 0.0.0.0 &
WEB_PID=$!

# Wait until either process exits; the EXIT trap kills the survivor so the
# container restarts clean. `wait -n` must not trip `set -e`.
set +e
wait -n "$API_PID" "$WEB_PID"
EXIT_CODE=$?
set -e
echo "[run-prod] A process exited (code=$EXIT_CODE) — shutting down."
exit "$EXIT_CODE"
