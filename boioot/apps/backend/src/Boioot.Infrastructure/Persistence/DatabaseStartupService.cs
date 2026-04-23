using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence;

/// <summary>
/// Handles database initialization at startup.
///
/// SQLite / SQL Server path:
///   Fresh DB  → MigrateAsync() creates the full schema from migration files.
///   Existing DB (no history) → inject the InitialSchema record so Migrate()
///   skips the initial migration and only applies newer ones.
///
/// PostgreSQL path:
///   Fresh DB  → EnsureCreated() builds the schema from the current EF Core model
///               (proper PostgreSQL types: timestamp, boolean, uuid, text …), then
///               all existing migration IDs are written to __EFMigrationsHistory
///               so MigrateAsync() never tries to replay the SQLite-era migrations.
///   Existing DB (no history) → same injection of all migration IDs.
///   Existing DB (has history) → MigrateAsync() for any pending migrations only.
/// </summary>
public sealed class DatabaseStartupService
{
    private const string InitialMigrationId = "20260323121520_InitialSchema";
    private const string EfProductVersion   = "8.0.10";

    private readonly BoiootDbContext                  _db;
    private readonly ILogger<DatabaseStartupService>  _log;

    public DatabaseStartupService(BoiootDbContext db, ILogger<DatabaseStartupService> log)
    {
        _db  = db;
        _log = log;
    }

    public async Task InitializeAsync(CancellationToken ct = default)
    {
        if (IsPostgres)
        {
            await InitializePostgresAsync(ct);
            return;
        }

        // ── SQLite / SQL Server path ──────────────────────────────────────────
        bool hasHistoryTable = await MigrationsHistoryExistsAsync(ct);

        if (!hasHistoryTable)
        {
            bool isExistingDatabase = await UsersTableExistsAsync(ct);

            if (isExistingDatabase)
            {
                _log.LogInformation(
                    "Existing database detected (no migration history). " +
                    "Injecting InitialSchema record so Migrate() skips table creation.");

                await CreateMigrationsHistoryTableAsync(ct);
                await InjectInitialMigrationRecordAsync(ct);
            }
            else
            {
                _log.LogInformation("Fresh database — EF Core Migrations will create the full schema.");
            }
        }

        _log.LogInformation("Running EF Core MigrateAsync...");
        await _db.Database.MigrateAsync(ct);
        _log.LogInformation("Database migration complete.");
    }

    // ── PostgreSQL-specific startup ───────────────────────────────────────────

    private async Task InitializePostgresAsync(CancellationToken ct)
    {
        bool hasHistoryTable = await MigrationsHistoryExistsAsync(ct);

        if (!hasHistoryTable)
        {
            bool isExistingDatabase = await UsersTableExistsAsync(ct);

            if (isExistingDatabase)
            {
                _log.LogInformation(
                    "Existing PostgreSQL database (no migration history). " +
                    "Creating history table and marking all migrations as applied.");
                await CreateMigrationsHistoryTableAsync(ct);
                await InjectAllMigrationIdsAsync(ct);
            }
            else
            {
                _log.LogInformation(
                    "Fresh PostgreSQL database — using EnsureCreated() for proper schema types.");
                await _db.Database.EnsureCreatedAsync(ct);
                _log.LogInformation("PostgreSQL schema created. Injecting migration history.");
                await CreateMigrationsHistoryTableAsync(ct);
                await InjectAllMigrationIdsAsync(ct);
                _log.LogInformation("PostgreSQL database ready.");
            }
        }

        // Has history → apply any pending migrations (Day 12+ migrations are
        // authored to be PostgreSQL-compatible from the start).
        _log.LogInformation("Running EF Core MigrateAsync for PostgreSQL pending migrations...");
        await _db.Database.MigrateAsync(ct);
        _log.LogInformation("PostgreSQL migration complete.");

        // ── Idempotent column-type fixes (applied after every migration run) ──
        await ApplyPostgresColumnFixesAsync(ct);
        await ApplyPostgresBookingPatchesAsync(ct);
        await ApplyReviewsPatchAsync(ct);
        await ApplyBookingReviewsPatchAsync(ct);

        // ── One-time data fix: sync IsCover from IsPrimary for legacy rows ────
        await SyncIsCoverFromIsPrimaryAsync(ct);
    }

    /// <summary>
    /// Applies safe, idempotent ALTER TABLE fixes for PostgreSQL columns whose
    /// type must be widened beyond what the original EF migration created.
    /// Each statement is guarded by a data_type check so it is a no-op when
    /// the column is already the correct type.
    /// </summary>
    private async Task ApplyPostgresColumnFixesAsync(CancellationToken ct)
    {
        // Fix 1 & 2: ImageUrl was created as varchar(500) — must be text (no limit).
        // SqlState 22001 was raised during property/project creation with long CDN URLs.
        var columnFixes = new[]
        {
            (Table: "PropertyImages", Column: "ImageUrl"),
            (Table: "ProjectImages",  Column: "ImageUrl"),
        };

        foreach (var (table, column) in columnFixes)
        {
            try
            {
                // Only ALTER if the column is still a character varying — idempotent.
                string checkSql = $"""
                    SELECT data_type
                    FROM   information_schema.columns
                    WHERE  table_schema = 'public'
                      AND  table_name   = '{table}'
                      AND  column_name  = '{column}'
                    """;

                await using var cmd = _db.Database.GetDbConnection().CreateCommand();
                await _db.Database.OpenConnectionAsync(ct);
                cmd.CommandText = checkSql;
                var dataType = (await cmd.ExecuteScalarAsync(ct))?.ToString() ?? "";
                await _db.Database.CloseConnectionAsync();

                if (dataType.Contains("character varying", StringComparison.OrdinalIgnoreCase))
                {
                    _log.LogInformation(
                        "[column-fix] Altering {Table}.{Column} from varchar → text ...",
                        table, column);

                    await _db.Database.ExecuteSqlRawAsync(
                        $"""ALTER TABLE "{table}" ALTER COLUMN "{column}" TYPE text""", ct);

                    _log.LogInformation(
                        "[column-fix] {Table}.{Column} → text  ✓", table, column);
                }
                else
                {
                    _log.LogInformation(
                        "[column-fix] {Table}.{Column} is already '{DataType}' — skipped.",
                        table, column, dataType);
                }
            }
            catch (Exception ex)
            {
                _log.LogWarning(
                    "[column-fix] Could not fix {Table}.{Column}: {Msg}", table, column, ex.Message);
            }
        }

        // Fix 3 & 4: UserImages.CreatedAt / UpdatedAt were created as TEXT by the manual
        // EF Core migration (which uses TEXT for cross-DB compat).  Npgsql refuses to read
        // TEXT columns as System.DateTime, so we ALTER them to the proper PostgreSQL type.
        // The USING clause casts the stored ISO-8601 strings produced by EF Core.
        var datetimeFixes = new[]
        {
            (Table: "UserImages", Column: "CreatedAt"),
            (Table: "UserImages", Column: "UpdatedAt"),
        };

        foreach (var (table, column) in datetimeFixes)
        {
            try
            {
                string checkSql = $"""
                    SELECT data_type
                    FROM   information_schema.columns
                    WHERE  table_schema = 'public'
                      AND  table_name   = '{table}'
                      AND  column_name  = '{column}'
                    """;

                await using var cmd = _db.Database.GetDbConnection().CreateCommand();
                await _db.Database.OpenConnectionAsync(ct);
                cmd.CommandText = checkSql;
                var dataType = (await cmd.ExecuteScalarAsync(ct))?.ToString() ?? "";
                await _db.Database.CloseConnectionAsync();

                if (dataType.Equals("text", StringComparison.OrdinalIgnoreCase))
                {
                    _log.LogInformation(
                        "[column-fix] Altering {Table}.{Column} from text → timestamp ...",
                        table, column);

                    await _db.Database.ExecuteSqlRawAsync(
                        $"""
                        ALTER TABLE "{table}"
                        ALTER COLUMN "{column}" TYPE timestamp with time zone
                        USING "{column}"::timestamp with time zone
                        """, ct);

                    _log.LogInformation(
                        "[column-fix] {Table}.{Column} → timestamp with time zone  ✓",
                        table, column);
                }
                else
                {
                    _log.LogInformation(
                        "[column-fix] {Table}.{Column} is already '{DataType}' — skipped.",
                        table, column, dataType);
                }
            }
            catch (Exception ex)
            {
                _log.LogWarning(
                    "[column-fix] Could not fix {Table}.{Column}: {Msg}", table, column, ex.Message);
            }
        }
    }

    /// <summary>
    /// Idempotent one-time data fix: copies IsPrimary → IsCover for any
    /// PropertyImage / ProjectImage row that has IsPrimary=true but IsCover=false.
    ///
    /// Background: IsCover was added later (migration 20260415160000) with defaultValue=false.
    /// Rows that existed before that migration have IsCover=false even if IsPrimary=true.
    /// This fix ensures IsCover is always consistent with IsPrimary for legacy data so
    /// that filtering by IsCover reliably returns the cover image.
    ///
    /// Safe to re-run: only touches rows where IsPrimary=true AND IsCover=false.
    /// </summary>
    private async Task SyncIsCoverFromIsPrimaryAsync(CancellationToken ct)
    {
        if (IsSqlite) return; // Only needed on PostgreSQL (production)

        try
        {
            int propFixed = await _db.Database.ExecuteSqlRawAsync(
                """
                UPDATE "PropertyImages"
                SET    "IsCover" = TRUE
                WHERE  "IsPrimary" = TRUE
                  AND  "IsCover"   = FALSE
                """, ct);

            int projFixed = await _db.Database.ExecuteSqlRawAsync(
                """
                UPDATE "ProjectImages"
                SET    "IsCover" = TRUE
                WHERE  "IsPrimary" = TRUE
                  AND  "IsCover"   = FALSE
                """, ct);

            if (propFixed > 0 || projFixed > 0)
            {
                _log.LogInformation(
                    "[data-fix] SyncIsCoverFromIsPrimary: updated {P} PropertyImages, {Pr} ProjectImages.",
                    propFixed, projFixed);
            }
            else
            {
                _log.LogInformation(
                    "[data-fix] SyncIsCoverFromIsPrimary: no rows needed updating — already in sync.");
            }
        }
        catch (Exception ex)
        {
            _log.LogWarning("[data-fix] SyncIsCoverFromIsPrimary failed (non-critical): {Msg}", ex.Message);
        }
    }

    private async Task ApplyPostgresBookingPatchesAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;

        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """
                ALTER TABLE "Properties"
                ADD COLUMN IF NOT EXISTS "IsBookable" boolean NOT NULL DEFAULT FALSE
                """, ct);

            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "Bookings" (
                    "Id" uuid NOT NULL PRIMARY KEY,
                    "PropertyId" uuid NOT NULL,
                    "RequestedByUserId" uuid NOT NULL,
                    "PropertyOwnerUserId" character varying(80),
                    "StartDate" timestamp with time zone NOT NULL,
                    "EndDate" timestamp with time zone NOT NULL,
                    "GuestName" character varying(120) NOT NULL,
                    "Phone" character varying(40),
                    "Notes" character varying(1000),
                    "PricePerNight" numeric(18,2) NOT NULL DEFAULT 0,
                    "TotalAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "CommissionPercent" numeric(5,2) NOT NULL DEFAULT 0,
                    "CommissionAmount" numeric(18,2) NOT NULL DEFAULT 0,
                    "PaymentStatus" character varying(30) NOT NULL DEFAULT 'NotPaid',
                    "Status" character varying(30) NOT NULL DEFAULT 'Pending',
                    "CreatedAt" timestamp with time zone NOT NULL,
                    "UpdatedAt" timestamp with time zone NOT NULL
                )
                """, ct);

            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PricePerNight" numeric(18,2) NOT NULL DEFAULT 0""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "TotalAmount" numeric(18,2) NOT NULL DEFAULT 0""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "CommissionPercent" numeric(5,2) NOT NULL DEFAULT 0""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "CommissionAmount" numeric(18,2) NOT NULL DEFAULT 0""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentStatus" character varying(30) NOT NULL DEFAULT 'NotPaid'""", ct);
            await _db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_Bookings_PropertyId" ON "Bookings" ("PropertyId")""", ct);
            await _db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_Bookings_RequestedByUserId" ON "Bookings" ("RequestedByUserId")""", ct);
            await _db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_Bookings_PropertyId_StartDate_EndDate" ON "Bookings" ("PropertyId", "StartDate", "EndDate")""", ct);
            await _db.Database.ExecuteSqlRawAsync("""CREATE INDEX IF NOT EXISTS "IX_Bookings_PropertyId_Status_StartDate_EndDate" ON "Bookings" ("PropertyId", "Status", "StartDate", "EndDate")""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "GuestCount" integer NOT NULL DEFAULT 1""", ct);

            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentProofUrls" text""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentProofNote" character varying(1000)""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentProofSubmittedAt" timestamp with time zone""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "ApprovedAt" timestamp with time zone""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "ConfirmedAt" timestamp with time zone""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "OwnerNotes" character varying(2000)""", ct);
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "RevisionRequestedAt" timestamp with time zone""", ct);

            _log.LogInformation("[schema-patch] Booking MVP patch applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Booking MVP patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    /// <summary>
    /// Marks every migration in the assembly as applied so MigrateAsync()
    /// skips the old SQLite-era migrations on a PostgreSQL database.
    /// </summary>
    private async Task InjectAllMigrationIdsAsync(CancellationToken ct)
    {
        var allMigrations = _db.GetService<IMigrationsAssembly>().Migrations.Keys;

        foreach (var migrationId in allMigrations)
        {
            try
            {
                string sql = $"""
                    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                    VALUES ('{migrationId}', '{EfProductVersion}')
                    ON CONFLICT ("MigrationId") DO NOTHING
                    """;
                await _db.Database.ExecuteSqlRawAsync(sql, ct);
                _log.LogInformation("Marked migration as applied: {id}", migrationId);
            }
            catch (Exception ex)
            {
                _log.LogWarning("Could not inject migration record {id}: {msg}", migrationId, ex.Message);
            }
        }
    }

    // ── Provider helpers ──────────────────────────────────────────────────────

    private bool IsSqlite =>
        _db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) ?? false;

    private bool IsPostgres =>
        _db.Database.ProviderName?.Contains("Npgsql", StringComparison.OrdinalIgnoreCase) ?? false;

    // ── Generic SQL helpers ───────────────────────────────────────────────────

    private async Task<bool> MigrationsHistoryExistsAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='__EFMigrationsHistory'"
                : IsPostgres
                    ? "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='__EFMigrationsHistory'"
                    : "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = '__EFMigrationsHistory'";

            await using var cmd = _db.Database.GetDbConnection().CreateCommand();
            await _db.Database.OpenConnectionAsync(ct);
            cmd.CommandText = sql;
            var result = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt64(result) > 0;
        }
        catch
        {
            return false;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private async Task<bool> UsersTableExistsAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name='Users'"
                : IsPostgres
                    ? "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='Users'"
                    : "SELECT COUNT(*) FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'Users'";

            await using var cmd = _db.Database.GetDbConnection().CreateCommand();
            await _db.Database.OpenConnectionAsync(ct);
            cmd.CommandText = sql;
            var result = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt64(result) > 0;
        }
        catch
        {
            return false;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private async Task CreateMigrationsHistoryTableAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? """
                  CREATE TABLE IF NOT EXISTS __EFMigrationsHistory (
                      MigrationId    TEXT NOT NULL,
                      ProductVersion TEXT NOT NULL,
                      PRIMARY KEY (MigrationId)
                  )
                  """
                : IsPostgres
                    ? """
                      CREATE TABLE IF NOT EXISTS "__EFMigrationsHistory" (
                          "MigrationId"    VARCHAR(150) NOT NULL,
                          "ProductVersion" VARCHAR(32)  NOT NULL,
                          CONSTRAINT "PK___EFMigrationsHistory" PRIMARY KEY ("MigrationId")
                      )
                      """
                    : """
                      IF OBJECT_ID('__EFMigrationsHistory', 'U') IS NULL
                      CREATE TABLE __EFMigrationsHistory (
                          MigrationId    NVARCHAR(150) NOT NULL,
                          ProductVersion NVARCHAR(32)  NOT NULL,
                          CONSTRAINT PK___EFMigrationsHistory PRIMARY KEY (MigrationId)
                      )
                      """;

            await _db.Database.ExecuteSqlRawAsync(sql, ct);
            _log.LogInformation("Created __EFMigrationsHistory table.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("Could not create __EFMigrationsHistory: {msg}", ex.Message);
        }
    }

    /// <summary>
    /// Idempotent schema patch for the Ratings/Reviews feature.
    /// Adds a unique constraint on (ReviewerId, TargetType, TargetId) so that
    /// each user can submit at most one review per listing, enforced at the DB level.
    /// </summary>
    private async Task ApplyReviewsPatchAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;

        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Reviews_ReviewerId_TargetType_TargetId_Unique"
                ON "Reviews" ("ReviewerId", "TargetType", "TargetId")
                """, ct);

            _log.LogInformation("[schema-patch] Reviews unique constraint applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Reviews patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    /// <summary>
    /// Idempotent schema patch for the Booking Reviews feature.
    /// Creates BookingReviews and AppSettings tables at startup (not lazily),
    /// using individual ExecuteSqlRawAsync calls to avoid multi-statement
    /// connection-state corruption that caused HTTP 500 on for-my-properties.
    /// </summary>
    private async Task ApplyBookingReviewsPatchAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;

        try
        {
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "BookingReviews" (
                    "Id"                  uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
                    "BookingId"           uuid         NOT NULL,
                    "PropertyId"          uuid         NOT NULL,
                    "ReviewType"          varchar(30)  NOT NULL,
                    "ReviewerUserId"      uuid         NOT NULL,
                    "ReviewedUserId"      uuid,
                    "Comment"             text,
                    "Cleanliness"         int,
                    "Accuracy"            int,
                    "Facilities"          int,
                    "Communication"       int,
                    "ContractCommitment"  int,
                    "ValueForMoney"       int,
                    "RespectProperty"     int,
                    "Timeliness"          int,
                    "OverallRating"       numeric(4,2) NOT NULL,
                    "CreatedAt"           timestamptz  NOT NULL DEFAULT NOW()
                )
                """, ct);

            await _db.Database.ExecuteSqlRawAsync("""
                CREATE UNIQUE INDEX IF NOT EXISTS "UX_BookingReviews_Booking_Type"
                    ON "BookingReviews"("BookingId", "ReviewType")
                """, ct);

            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_BookingReviews_PropertyId"
                    ON "BookingReviews"("PropertyId")
                """, ct);

            await _db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "AppSettings" (
                    "Key"       varchar(200) PRIMARY KEY,
                    "Value"     text         NOT NULL,
                    "UpdatedAt" timestamptz  NOT NULL DEFAULT NOW()
                )
                """, ct);

            await _db.Database.ExecuteSqlRawAsync("""
                INSERT INTO "AppSettings"("Key","Value","UpdatedAt")
                VALUES ('reviews.publicVisibilityEnabled','false',NOW())
                ON CONFLICT DO NOTHING
                """, ct);

            _log.LogInformation("[schema-patch] BookingReviews patch applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] BookingReviews patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    private async Task InjectInitialMigrationRecordAsync(CancellationToken ct)
    {
        try
        {
            string sql = IsSqlite
                ? $"""
                   INSERT OR IGNORE INTO __EFMigrationsHistory (MigrationId, ProductVersion)
                   VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                   """
                : IsPostgres
                    ? $"""
                       INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                       VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                       ON CONFLICT ("MigrationId") DO NOTHING
                       """
                    : $"""
                       IF NOT EXISTS (
                           SELECT 1 FROM __EFMigrationsHistory
                           WHERE MigrationId = '{InitialMigrationId}'
                       )
                       INSERT INTO __EFMigrationsHistory (MigrationId, ProductVersion)
                       VALUES ('{InitialMigrationId}', '{EfProductVersion}')
                       """;

            await _db.Database.ExecuteSqlRawAsync(sql, ct);
            _log.LogInformation("Injected InitialSchema into __EFMigrationsHistory.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("Could not inject migration record: {msg}", ex.Message);
        }
    }
}
