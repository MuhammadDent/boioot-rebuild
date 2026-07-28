---
name: Prod DB connection failures on Fly
description: Evidence and diagnosis pattern for boioot.com HTTP 500s from Npgsql "Exception while reading from stream"
---

- Prod backend = Fly app `backend-bold-snowflake-8206` (fra, 5 machines). `FLY_API_TOKEN` secret exists in workspace for read-only flyctl.
- There is NO Fly Postgres app — prod DB is external, configured only via the Fly `DATABASE_URL` secret (set 2026-04-09). Provider unknown from workspace (cannot read secret value).
- Key diagnostic rule: in Npgsql stack traces, distinguish WHERE the EndOfStreamException occurs:
  - inside `NpgsqlConnector.Authenticate` / `OpenNewConnector` → a BRAND-NEW connection was dropped by the server during handshake ⇒ DB-side unavailability/limit/suspend, NOT stale pooling.
  - during query read on a rented connection → stale idle pooled connection.
- `UseNpgsql` has no EnableRetryOnFailure/Keepalive (ServiceCollectionExtensions). `/api/settings/public` also queries DB uncached, so it fails together with login — shared connection layer.
- Fly log buffer via `fly logs --no-tail` is only ~100 lines; older lifecycle/startup logs not retrievable that way.
