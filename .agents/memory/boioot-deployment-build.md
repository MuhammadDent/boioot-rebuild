---
name: Boioot production deployment build model
description: How Boioot is built & run in production (.NET only, no Node proxy) and env gotchas when verifying builds locally
---

# Production deployment build model

Production runs the **.NET API only**. There is NO Node/JS proxy layer anymore.

- Build: `boioot/apps/backend/build-prod.sh` does exactly one thing — `dotnet publish src/Boioot.Api -c Release --no-self-contained -o {workspace}/out`.
- Run (`.replit` deploy): executes the published DLL directly — `dotnet /home/runner/workspace/out/Boioot.Api.dll --urls http://0.0.0.0:$PORT`.
- **Obsolete, removed:** any `artifacts/api-server/**` (e.g. `entry.cjs`, `proxy.mjs`) and `run-api-prod.sh`. These were an old Node-proxy startup path and are dead. Do not reintroduce or reference them. A build failure like `cp: cannot stat '.../artifacts/api-server/src/entry.cjs'` means a stale copy step crept back into build-prod.sh.
- One harmless leftover: a *comment* in dev-only `run-api.sh` mentions `/artifacts/api-server` (explains why `--contentroot` is set so appsettings.json is found). It is not executable and not part of deployment.

**Why:** the deploy build once died under `set -e` on a leftover `cp entry.cjs` step even though `dotnet publish` succeeded. Keeping build/run purely .NET avoids resurrecting the dead proxy path.

# Gotchas verifying .NET builds locally in this container

- A full `dotnet publish -c Release` of this solution (heavy EF Core `Boioot.Infrastructure`) does NOT finish within the 120s bash-tool cap here, and detached runs tend to get reaped between tool calls. Don't rely on completing a Release publish through the shell to "prove" the config.
- Authoritative proof instead: the Replit **cloud** deployment builder log (publish succeeds there), plus restarting the `Boioot .NET API` workflow — its slow-path `dotnet run` compile+serve is a real local compile check.
- **Do NOT** `pkill -f "Boioot"` or `pkill -f "dotnet"` from the bash tool: the pattern matches the tool's OWN shell command line, killing it (exit 137/143) and taking down the dev workflow with it. Kill by explicit PID, or don't kill at all.
