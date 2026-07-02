---
name: Boioot production deployment build model
description: How Boioot is built & run in production (Next.js public + .NET API internal, single deployment) and env gotchas when verifying builds locally
---

# Production deployment build model

One Replit autoscale deployment runs BOTH apps: Next.js serves the public site on `$PORT`; the .NET API runs internally on 127.0.0.1:8080. Next's build-time rewrites proxy `/api`, `/uploads`, `/videos`, `/hubs` → `BACKEND_URL` (default localhost:8080).

- Build (`boioot/build-prod.sh`): backend publish (`dotnet publish → {workspace}/out`) then frontend `pnpm build`.
- Run (`boioot/run-prod.sh`): starts dotnet with `PORT=8080` env (Kestrel binds via the PORT env var — `--urls` is ignored), bounded TCP wait, then `next start -p $PORT`; `wait -n` + EXIT trap so either process dying restarts the container.
- Prod DB bootstrap edge: `__EFMigrationsHistory` can exist EMPTY in prod (publish-time schema copy carries structure, not rows) → MigrateAsync replays InitialSchema → 42P07 → whole init (patches+seeding) silently aborts (Program.cs swallows it, app "runs without DB"). Fix: SELECTIVE proof-gated baseline in DatabaseStartupService (never blanket-inject — prod was missing the whole UserImages migration chain; blanket injection would have orphaned it permanently). Sentinel checks must cover each migration's FULL footprint; sentinel errors → leave pending. New non-idempotent migrations need a sentinel entry.
- Rehearsal pattern for prod DB fixes: build a `prodsim` database in the dev cluster (pg_dump -s dev → psql, drop objects prod lacks, empty history) and boot the published DLL against it with PGDATABASE=prodsim — proves the exact prod bootstrap path locally before republish. Prod runtime log level suppresses Information; only warn+ and Console.WriteLine [STARTUP] lines appear.
- `20260513000000_AddStaticPages` has no Designer.cs → NOT in the migrations assembly → EF never applies/records it anywhere (dev history has 11 rows for 12 migration files). Table comes from its IF NOT EXISTS body never running — dead code; don't "fix" history counts to 12.
- Prod Postgres REJECTS plaintext (`28000: connection is insecure`). Never hardcode `SSL Mode=Disable` when building the Npgsql conn string from DATABASE_URL/PG* — honor the `sslmode` URL param, default `SSL Mode=Prefer;Trust Server Certificate=true` (works on plaintext dev helium AND TLS-required prod).
- The DLL MUST be launched with `--contentroot {workspace}/out`. Without it the content root stays at the script CWD, `out/appsettings.json` is never loaded, `Database:Provider` defaults to SQLite, and every prod DB query 500s (`no such table: Users`) → healthcheck `GET /` 500 and login fails. Same rule as dev `run-api.sh`.
- `.replit` `[deployment]` cannot be edited directly — use the `verifyAndReplaceDotReplit` sandbox callback with a temp file INSIDE the workspace.
- `/out/` is gitignored (publish output contains appsettings secrets — never commit it).
- Legacy Node proxy (`artifacts/api-server/**`, `entry.cjs`, `proxy.mjs`, `run-api-prod.sh`) is dead — do not reintroduce or reference it. A build failure like `cp: cannot stat '.../entry.cjs'` means a stale copy step crept back in. (A harmless comment in dev-only `run-api.sh` still mentions the old path.)

**Why:** the deploy build once died under `set -e` on a leftover `cp entry.cjs` step even though `dotnet publish` succeeded; and a deploy that ran only the API on $PORT served just the API health text instead of the website.

# Gotchas verifying .NET builds locally in this container

- A full `dotnet publish -c Release` of this solution (heavy EF Core `Boioot.Infrastructure`) does NOT finish within the 120s bash-tool cap here, and detached runs tend to get reaped between tool calls. Don't rely on completing a Release publish through the shell to "prove" the config.
- Authoritative proof instead: the Replit **cloud** deployment builder log (publish succeeds there), plus restarting the `Boioot .NET API` workflow — its slow-path `dotnet run` compile+serve is a real local compile check.
- **Do NOT** `pkill -f "Boioot"` or `pkill -f "dotnet"` from the bash tool: the pattern matches the tool's OWN shell command line, killing it (exit 137/143) and taking down the dev workflow with it. Kill by explicit PID, or don't kill at all.
