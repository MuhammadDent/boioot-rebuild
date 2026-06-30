---
name: Boioot production schema drift & the publish flow
description: Why prod 500s on schema-dependent endpoints, and the only safe way to fix prod schema.
---

The Boioot production (Replit-managed) PostgreSQL schema lags behind development.

**Why:** `DatabaseStartupService` initializes an existing DB by creating the migrations-history table and **injecting all migration IDs as "applied" without actually running them**. A prod DB created from an old `EnsureCreated` snapshot therefore never gains tables/columns added by later migrations. Dev DBs are fine because they are built via `EnsureCreated` from the *current* full model. Result: endpoints whose generated SQL references newer tables/columns throw Npgsql `42703` (column does not exist) / `42P01` (relation does not exist) and surface as the generic Arabic 500 — even with zero rows.

Concrete instance seen: prod was missing the entire "UserImages bridge" — `UserImages` table absent, and `ProjectImages`/`PropertyImages` missing `IsCover` and `UserImageId`. The Projects/Properties list queries (`.Include(p => p.Images.Where(i => i.IsCover)).ThenInclude(i => i.UserImage)`) reference those → 500. Many other newer tables were also missing (Bookings, AppSettings, AgencyProfiles, etc.).

**How to apply:** For any "production is missing a table/column" report on this Replit-managed Postgres project, the fix is to ensure the **dev** schema is correct (it is the source of truth) and have the user **re-publish** — the publish flow diffs dev→prod and applies missing tables/columns (backwards-compatible additions are safe; renames/destructive alters prompt confirmation). Do NOT run DDL against prod, do NOT add startup-time `CREATE/ALTER` DDL to self-heal, do NOT write prod migration scripts, and do NOT use `executeSql({environment:'production'})` for DDL (it is read-only). See `.local/skills/database/references/database-migrations-on-publish.md`. Note: this codebase already contains many legacy startup `ApplyXxxPatchAsync` DDL methods — do not extend that pattern; prefer re-publish.
