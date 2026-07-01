---
name: Reference-number generation
description: How human-readable PREFIX-YEAR-NNNNNN reference numbers are allocated in the .NET backend, and why COUNT/MAX must never be used.
---

# Reference-number generation (Boioot .NET backend)

Reference numbers (`USR-2026-000008`, plus `VER`/`CNT`/`MRK`/`REQ`) are allocated
by `ReferenceGenerator.NextAsync` from a **dedicated PostgreSQL sequence per
`(prefix, year)`**, named `ref_<prefix>_<year>` (e.g. `ref_usr_2026`), read
atomically via `nextval()`.

**Why:** the old scheme used `COUNT()+1` over a soft-delete-filtered query. After
soft-deletes the active count is lower than the true max, so it regenerated an
already-used number and hit the partial unique index (`IX_<Table>_ReferenceNumber`),
throwing PostgreSQL error **23505** on `/register` (HTTP 500). Any `COUNT()`- or
`MAX()`-based *allocation* has this bug. `MAX` is acceptable **only** to seed a
sequence once, never to allocate running numbers.

**How to apply:**
- New entities that need a reference number: call `ReferenceGenerator.NextAsync(dbContext, dbSet.Select(x => x.ReferenceNumber), "PREFIX", ct)` and add the `(PREFIX, Table)` pair to the sequence-seeding loop in `DatabaseStartupService` (the reference-number-sequences schema-patch block).
- Sequences are created lazily at runtime (`to_regclass` check → `CREATE SEQUENCE IF NOT EXISTS ... START WITH max+1`) AND pre-seeded idempotently at startup. The runtime path self-heals if the startup patch fails.
- Seeding picks the numeric max by ordering `length DESC, value DESC` (not plain lexical) so it stays correct if a suffix ever grows past the 6-digit pad.
- A defensive retry-on-23505 (max 3, `IsReferenceNumberConflict`) wraps register's `SaveChangesAsync` as a fallback only — the sequence is the real fix.
- Format is `{PREFIX}-{YEAR}-{N:D6}`; counter resets per year because the sequence name includes the year.

**DB migrations here are idempotent raw-SQL schema patches in `DatabaseStartupService`,
NOT EF migrations** — the SQLite→PostgreSQL history makes replaying EF migrations
unreliable, so schema changes go in that startup patch pattern (`CREATE ... IF NOT EXISTS`,
guarded `DO` blocks).
