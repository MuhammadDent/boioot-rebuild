---
name: Boioot DB access tooling (dev vs prod)
description: How to actually run SQL against Boioot's dev and prod databases in this environment.
---

`DATABASE_URL` in this workspace is literally `postgresql://...@HOST:PORT/DATABASE` (placeholder words, not real values), so `psql $DATABASE_URL` and the default `executeSql` connection fail with `invalid integer value "PORT"`.

- **Dev DB:** use the `PG*` env vars instead — `PGPASSWORD="$PGPASSWORD" psql -h "$PGHOST" -p "$PGPORT" -U "$PGUSER" -d "$PGDATABASE" -c "..."`. The backend resolves its own connection the same way (DATABASE_URL → parsed, with PG* fallback).
- **Prod DB:** `executeSql({ sqlQuery, environment: 'production' })` from the code-execution sandbox works and is **read-only** (good for schema/data diffing; DDL is rejected). Returns CSV in `.output`.
- Dev and prod are **different** databases; always diff both when investigating "works locally, 500s in prod".
- `fetch_deployment_logs` returns "No deployment logs found" for this deployment — prod logs are not retrievable here, so diagnose prod via read-only schema/data queries instead.
