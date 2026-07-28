---
name: Prod DB connection failures on Fly
description: Evidence and diagnosis pattern for boioot.com HTTP 500s from Npgsql "Exception while reading from stream"
---

- Prod backend = Fly app `backend-bold-snowflake-8206` (fra, 5 machines). `FLY_API_TOKEN` secret exists in workspace for read-only flyctl.
- Prod DB IS Fly Postgres: app `boioot-db`, reached via `boioot-db.flycast:5432` (Flycast private proxy, supports machine auto-stop/auto-start). The workspace FLY_API_TOKEN is app-scoped to the backend only — it cannot list or query `boioot-db` ("Could not find App"). Need an org token or boioot-db-scoped token for DB-side status/logs.
- Redacted-host extraction trick: `fly ssh console -C` with sed/case on the machine, printing only classification flags (never the URL) — platform scrubbing can mask host:port output otherwise.
- Key diagnostic rule: in Npgsql stack traces, distinguish WHERE the EndOfStreamException occurs:
  - inside `NpgsqlConnector.Authenticate` / `OpenNewConnector` → a BRAND-NEW connection was dropped by the server during handshake ⇒ DB-side unavailability/limit/suspend, NOT stale pooling.
  - during query read on a rented connection → stale idle pooled connection.
- `UseNpgsql` has no EnableRetryOnFailure/Keepalive (ServiceCollectionExtensions). `/api/settings/public` also queries DB uncached, so it fails together with login — shared connection layer.
- Fly log buffer via `fly logs --no-tail` is only ~100 lines; older lifecycle/startup logs not retrievable that way.
