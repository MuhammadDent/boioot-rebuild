# Database Portability Report — Boioot API
Generated: 2026-03-23

## Summary

| Area | Status |
|------|--------|
| Package installed | ✅ `Microsoft.EntityFrameworkCore.SqlServer` 8.0.10 |
| Provider switch (config-only) | ✅ `Database:Provider = SqlServer` in appsettings.json |
| Connection string routing | ✅ `SqlServerConnection` used for SqlServer, `DefaultConnection` for SQLite |
| `SchemaEvolutionService` | ✅ Skips all SQLite patches on non-SQLite providers |
| `DatabaseStartupService` | ✅ Provider-aware DDL (IF NOT EXISTS / INSERT OR IGNORE vs SQL Server equivalents) |
| `InitialCreate` migration | ✅ Provider-conditional — `IF NOT EXISTS` for SQLite, standard `CreateIndex` for SQL Server |
| Application code (LINQ/services/RBAC/seeding) | ✅ Fully provider-agnostic |
| `InitialSchema` migration column types | ❌ SQLite-specific (`TEXT`, `INTEGER`, `REAL`) — incompatible with SQL Server |
| SQL Server TEXT query support | ❌ SQL Server `TEXT` type does not support `=` operator — all string WHERE clauses fail |
| Decimal precision | ⚠️ 3 decimal properties (`Invoice.Amount`, `PlanPricing.PriceAmount`, `Property.CommissionValue`) stored as TEXT by design — no precision issue, but type warning from EF |

## How to Switch Providers

Edit `appsettings.json`:

```json
"Database": {
  "Provider": "SqlServer"
},
"ConnectionStrings": {
  "SqlServerConnection": "Server=localhost,1433;Database=BoiootDb;User Id=sa;Password=...;TrustServerCertificate=True"
}
```

## Critical Incompatibility: InitialSchema Migration Types

The `20260323121520_InitialSchema.cs` migration was generated with SQLite as the active provider.
All column type strings in `CreateTable` calls are SQLite-specific:

| Migration type | SQLite behavior | SQL Server behavior |
|----------------|----------------|---------------------|
| `TEXT` | ✅ Primary string type | ❌ Deprecated; `=` operator fails — "incompatible with varchar" |
| `INTEGER` | ✅ Primary integer type | ⚠️ Valid alias for `int`, works |
| `REAL` | ✅ Primary float type | ⚠️ Valid alias for `float(24)`, works |

### Runtime impact on SQL Server

Any EF Core `Where(x => x.Name == "value")` generates:
```sql
WHERE [Name] = @p0   -- FAILS on SQL Server TEXT columns
```
Error: *"The data types text and varchar are incompatible in the equal to operator."*

This affects **all string-typed entity properties** (names, emails, slugs, titles, etc.).

### Fix

**Option A (recommended for new SQL Server deployment):** Remove the `type:` hint from all `table.Column<T>()` calls in `InitialSchema.cs`. With no type hint, EF Core uses the CLR type to infer the correct database type per provider:
- `typeof(string)` → SQLite: `TEXT`, SQL Server: `nvarchar(max)`
- `typeof(bool)` → SQLite: `INTEGER`, SQL Server: `bit`
- `typeof(Guid)` → SQLite: `TEXT`, SQL Server: `uniqueidentifier`

**Note on SQLite backward compatibility:** SQLite ignores column type names and uses type affinity — `nvarchar(max)` has TEXT affinity in SQLite, so the existing SQLite database continues to work. However, changing Guid columns from `TEXT` to `uniqueidentifier` in the migration would NOT affect the SQLite runtime (affinity is BLOB which rounds to TEXT), but does affect existing data.

**Option B (multi-provider, cleanest long-term):** Maintain separate migration histories — one for SQLite, one for SQL Server. Each starts from its own `InitialSchema` generated with the correct provider. This is the officially recommended EF Core pattern for multi-provider scenarios.

## Decimal Storage Design

Three decimal properties deliberately store as `TEXT` (SQLite) to avoid floating-point precision loss in financial values:

| Property | Entity | Reason |
|----------|--------|--------|
| `Amount` | `Invoice` | Financial amount — no scientific notation |
| `PriceAmount` | `PlanPricing` | Subscription price — no scientific notation |
| `CommissionValue` | `Property` | Commission % or amount — no scientific notation |

On SQL Server, these would also need a `varchar(30)` or `nvarchar(30)` column type, or a proper `decimal(18,4)` with `HasPrecision()`.

## What Works Out of the Box (No Changes Needed)

- All EF Core LINQ queries (EF translates to provider-specific SQL automatically)
- Authentication / JWT
- RBAC permission system
- Data seeding (`DataSeeder`, `PlanCatalogSeeder`)
- `SchemaEvolutionService` (automatically skips SQLite-only patches)
- `DatabaseStartupService` migration bootstrapping
- `InitialCreate` migration (provider-conditional code works)

## What Needs to Change for Full SQL Server Support

1. **Remove `type:` strings from `InitialSchema.cs`** (or regenerate with `--provider SqlServer`)
2. **Fix decimal TEXT storage**: add `HasColumnType("varchar(30)")` or `HasPrecision(18,4)` for `Invoice.Amount`, `PlanPricing.PriceAmount`, `Property.CommissionValue`
3. **Inject the baseline migration record** for existing SQL Server databases (handled by `DatabaseStartupService` for fresh deployments)

## SQLite — Still Fully Working

- All existing migrations applied cleanly ✅
- API health endpoint `GET /health` → `{"status":"healthy"}` ✅
- No regression from the portability code changes ✅
