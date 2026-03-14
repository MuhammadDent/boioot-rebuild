#!/bin/bash
set -e

DOTNET_PORT="${PORT:-8000}"
export ASPNETCORE_URLS="http://0.0.0.0:${DOTNET_PORT}"
export ASPNETCORE_ENVIRONMENT="Development"

echo "Starting Boioot API on port $DOTNET_PORT..."
cd "$(dirname "$0")/src/Boioot.API"
exec dotnet run --no-launch-profile
