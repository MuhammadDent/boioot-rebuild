#!/usr/bin/env bash
set -e

export DOTNET_ROOT="/nix/store/1blv644vinali34masnw6g5fjjjaa4y6-dotnet-sdk-8.0.416/share/dotnet"
export PATH="$PATH:$DOTNET_ROOT"

cd "$(dirname "$0")"

exec dotnet run \
  --project src/Boioot.Api \
  --no-launch-profile \
  -- \
  --urls "http://+:5233"
