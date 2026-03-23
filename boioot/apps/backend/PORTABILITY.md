# Database Portability Report — Boioot API
Generated: 2026-03-23 — Full Fix Applied

## Final Status

| Area | Status |
|------|--------|
| SQL Server package | ✅ `Microsoft.EntityFrameworkCore.SqlServer` 8.0.10 |
| Provider switch (config-only) | ✅ `Database:Provider` in appsettings.json |
| `InitialSchema.cs` — DDL type strings | ✅ All 424 SQLite type strings removed |
| `InitialSchema.Designer.cs` — model annotations | ✅ All 408 HasColumnType(TEXT/INTEGER/REAL) removed |
| `InitialCreate.cs` — AlterColumn | ✅ Provider-conditional; SQLite branch uses INTEGER, SQL Server uses bit |
| `InitialCreate.Designer.cs` — model annotations | ✅ All 407 HasColumnType(TEXT/INTEGER/REAL) removed |
| `BoiootDbContextModelSnapshot.cs` | ✅ All 407 HasColumnType(TEXT/INTEGER/REAL) removed |
| Invoice.Amount precision | ✅ `HasPrecision(18,4)` via InvoiceConfiguration |
| PlanPricing.PriceAmount precision | ✅ `HasPrecision(18,4)` via PlanPricingConfiguration |
| Property.CommissionValue precision | ✅ `HasPrecision(18,4)` via PropertyConfiguration |
| SchemaEvolutionService | ✅ SQLite-only (early return on other providers) |
| DatabaseStartupService | ✅ Provider-aware DDL |
| Application code (LINQ/services/RBAC/seeding) | ✅ Provider-agnostic |
| SQLite runtime | ✅ Health, auth, seeding, all working |

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

## SQL Server Type Mapping (After Fix)

| CLR type | SQL Server column type |
|----------|----------------------|
| `string` (unbounded) | `nvarchar(max)` |
| `string` (HasMaxLength N) | `nvarchar(N)` |
| `bool` | `bit` |
| `int` | `int` |
| `Guid` | `uniqueidentifier` |
| `decimal` (HasPrecision 18,4) | `decimal(18,4)` |
| `decimal` (HasColumnType decimal(18,2)) | `decimal(18,2)` |
| `decimal` (HasColumnType decimal(10,2)) | `decimal(10,2)` |
| `double` | `float` |
| `DateTime` | `datetime2` |
| `DateTimeOffset` | `datetimeoffset` |

**Deprecated SQL Server `TEXT` type: ELIMINATED.**

## What Changed and Why

### InitialSchema.cs (migration DDL)

The migration was generated with SQLite as the active provider.
EF Core SQLite generates type hints matching SQLite's storage classes:

| Count | Removed string | Reason |
|-------|----------------|--------|
| 345 | `type: "TEXT"` | SQLite string type — maps to deprecated SQL Server TEXT |
| 73 | `type: "INTEGER"` | SQLite integer/bool type — maps to SQL Server INTEGER (not bit) |
| 6 | `type: "REAL"` | SQLite float type — maps to SQL Server REAL (acceptable alias for float(24)) |
| **6** | `type: "decimal(N,M)"` | **KEPT** — valid on both providers |

With no `type:` hint, EF Core asks the active provider for the correct CLR-to-database mapping.

### InitialCreate.cs (provider-conditional AlterColumn)

The `AlterColumn<bool>` for `Notifications.IsRead` was previously applied to all providers
using `type: "INTEGER"` (SQLite syntax). Fixed to use provider-conditional branches:
- SQLite: `type: "INTEGER"` (SQLite stores bool as INTEGER)
- SQL Server: no type hint → EF generates correct `ALTER COLUMN [IsRead] bit NOT NULL`

### Designer and Snapshot Files

`.HasColumnType("TEXT/INTEGER/REAL")` annotations existed in two patterns:
1. **End-of-chain**: `.HasColumnType("TEXT");` — last method in the chain, had semicolon
2. **Mid-chain**: `.HasColumnType("TEXT")` — followed by more method calls, no semicolon

Both patterns were removed with separate passes (first pass: end-of-chain; second pass: mid-chain).
When removing end-of-chain annotations, the semicolon was moved to the now-last method call.

### Special Decimal Properties

Three properties were previously stored as TEXT in SQLite for precision reasons (no scientific notation):
`Invoice.Amount`, `PlanPricing.PriceAmount`, `Property.CommissionValue`.

**Fix applied:**
- Removed `type: "TEXT"` from `InitialSchema.cs` DDL
- Removed `.HasColumnType("TEXT")` from Designer/Snapshot files
- Added `HasPrecision(18, 4)` to entity configurations

**Result:**
- SQLite: EF Core SQLite maps decimal without HasColumnType to TEXT (SQLite default for decimal) ✅
- SQL Server: EF Core SQL Server maps `HasPrecision(18,4)` to `decimal(18,4)` ✅

## New Files Created

| File | Purpose |
|------|---------|
| `Configurations/InvoiceConfiguration.cs` | `HasPrecision(18,4)` for `Invoice.Amount` |
| `Configurations/PlanPricingConfiguration.cs` | `HasPrecision(18,4)` for `PlanPricing.PriceAmount` |

Updated:
| File | Change |
|------|--------|
| `Configurations/PropertyConfiguration.cs` | Added `HasPrecision(18,4)` for `CommissionValue` |

## Fix Strategy Chosen: Edit Existing Migrations In Place

**Why not regenerate?**

Regenerating migrations would:
1. Change migration IDs — breaks the existing SQLite database's `__EFMigrationsHistory` records
2. Require injecting fake migration history into the existing database
3. Risk losing carefully tuned provider-conditional code in `InitialCreate.cs`

**Why edit in place?**

1. Migration IDs are preserved — existing SQLite database continues without modification
2. The changes are purely subtractive: removing incorrect type hints, which is safe
3. SQLite's type affinity system means any column type name accepted by SQLite gives the same affinity as without a type hint
4. New SQLite deployments: EF Core SQLite will use TEXT for string/Guid, INTEGER for bool/int (same as before, just via type inference not explicit hints)
5. New SQL Server deployments: EF Core SQL Server will use nvarchar/bit/int/uniqueidentifier (correct)

## SQLite Backward Compatibility

SQLite uses **type affinity** — the column type name doesn't affect storage behavior:
- Any name containing "INT" → INTEGER affinity
- Any name containing "CHAR", "CLOB", "TEXT" → TEXT affinity
- Without a type name → BLOB affinity (for non-declared types)

Removing `type: "TEXT"` from the migration means:
- **Existing SQLite database**: Migration is already applied, schema unchanged ✅
- **New SQLite database**: EF SQLite generates TEXT for string/Guid, INTEGER for bool ✅

## SQLite Verification

```
✅ "No migrations were applied. The database is already up to date."
✅ Application started on port 5233
✅ JWT login: admin@boioot.sy / Admin@123456
✅ RBAC seeding: 12 roles, 39 permissions
```
