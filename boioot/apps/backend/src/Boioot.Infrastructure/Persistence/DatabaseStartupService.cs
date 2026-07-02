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
        else if (!await MigrationsHistoryHasRowsAsync(ct) && await UsersTableExistsAsync(ct))
        {
            // __EFMigrationsHistory table EXISTS but is EMPTY while the schema
            // is already present (e.g. the table structure was copied to this
            // database by an external tool — such as a publish-time schema sync —
            // which copies table structures but not data rows).
            // Without intervention, MigrateAsync() below considers EVERY
            // migration pending, replays InitialSchema, and dies with
            // "42P07: relation already exists" — aborting the entire startup
            // init so the idempotent schema patches and seeding never run.
            //
            // SELECTIVE BASELINE: a history row is written ONLY for migrations
            // whose sentinel schema objects are verified to exist. Migrations
            // whose objects are missing (or that are fully idempotent) are left
            // pending so MigrateAsync() genuinely applies them.
            _log.LogInformation(
                "PostgreSQL __EFMigrationsHistory exists but is empty while schema " +
                "is present — baselining verified migrations only.");
            await BaselineVerifiedMigrationsAsync(ct);
        }

        // Has history → apply any pending migrations (Day 12+ migrations are
        // authored to be PostgreSQL-compatible from the start).
        _log.LogInformation("Running EF Core MigrateAsync for PostgreSQL pending migrations...");
        await _db.Database.MigrateAsync(ct);
        _log.LogInformation("PostgreSQL migration complete.");

        // ── Idempotent column-type fixes (applied after every migration run) ──
        await ApplyPostgresColumnFixesAsync(ct);
        await ApplyPostgresBookingPatchesAsync(ct);
        await ApplyBookingCurrencyFixAsync(ct);
        await ApplyReviewsPatchAsync(ct);
        await ApplyBookingReviewsPatchAsync(ct);
        await ApplyIntegrationsPatchAsync(ct);
        await ApplyMessagingPatchAsync(ct);
        await ApplyUserTagsPatchAsync(ct);
        await ApplySubscriptionNumberPatchAsync(ct);
        await ApplyMatchingAndCoveragePatchAsync(ct);
        await ApplyUserCoveragesTablePatchAsync(ct);
        await ApplyLocationSuggestionsPatchAsync(ct);

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
            await _db.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "Currency" text NOT NULL DEFAULT 'SYP'""", ct);

            _log.LogInformation("[schema-patch] Booking MVP patch applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Booking MVP patch failed (non-critical): {Msg}", ex.Message);
        }

        // ── Verification conversation thread ──────────────────────────────────
        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "VerificationRequests" ADD COLUMN IF NOT EXISTS "ConversationJson" text""", ct);
            _log.LogInformation("[schema-patch] VerificationRequests.ConversationJson patch applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] VerificationRequests.ConversationJson patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    /// <summary>
    /// Syncs existing booking currencies from their related property.
    /// Fixes rows that were defaulted to 'SYP' when the Currency column was first added,
    /// even though their property may have currency = 'USD'.
    /// Idempotent — only updates rows where currency truly differs from the property.
    /// </summary>
    private async Task ApplyBookingCurrencyFixAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;

        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """
                UPDATE "Bookings" b
                SET "Currency" = COALESCE(NULLIF(p."Currency", ''), 'SYP')
                FROM "Properties" p
                WHERE b."PropertyId"::text = p."Id"
                  AND (
                    b."Currency" IS NULL
                    OR b."Currency" = ''
                    OR b."Currency" = 'SYP'
                  )
                  AND COALESCE(NULLIF(p."Currency", ''), 'SYP') <> b."Currency"
                """, ct);

            _log.LogInformation("[schema-patch] Booking currencies synced from properties.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Booking currency sync failed (non-critical): {Msg}", ex.Message);
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

    /// <summary>
    /// Proof-gated migration-history baseline for PostgreSQL.
    /// For each known migration, a history row is inserted ONLY if its sentinel
    /// schema object(s) verifiably exist in the database. Migrations whose
    /// sentinels are missing — and any migration without an entry here
    /// (including all fully-idempotent IF NOT EXISTS migrations) — are left
    /// pending so MigrateAsync() genuinely applies them.
    /// Never drops, recreates, or alters any object; INSERTs are ON CONFLICT DO NOTHING.
    /// </summary>
    private async Task BaselineVerifiedMigrationsAsync(CancellationToken ct)
    {
        // MigrationId → SQL returning true iff the FULL object footprint that
        // migration creates already exists (i.e. the migration is provably applied).
        var sentinels = new (string MigrationId, string ExistsSql)[]
        {
            // InitialSchema creates exactly these 42 tables — require ALL of them.
            ("20260323121520_InitialSchema", """
                SELECT COUNT(*) = 42 FROM information_schema.tables
                WHERE table_schema = 'public' AND table_name IN (
                    'Accounts','AccountUsers','Agents','BlogCategories','BlogPostCategories',
                    'BlogPosts','BlogSeoSettings','BuyerRequestComments','BuyerRequests','Companies',
                    'Conversations','Favorites','FeatureDefinitions','Invoices','LimitDefinitions',
                    'LocationCities','LocationNeighborhoods','Messages','Notifications','OwnershipTypeConfigs',
                    'PaymentProofs','Permissions','PlanFeatures','PlanLimits','PlanPricings',
                    'Plans','ProjectImages','Projects','Properties','PropertyAmenities',
                    'PropertyAmenitySelections','PropertyImages','PropertyListingTypes','PropertyTypeConfigs','Requests',
                    'Reviews','RolePermissions','Roles','SubscriptionPaymentRequests','Subscriptions',
                    'UserRoles','Users')
                """),
            // InitialCreate adds exactly two Notifications indexes.
            ("20260323125029_InitialCreate", """
                SELECT COUNT(*) = 2 FROM pg_indexes
                WHERE schemaname = 'public'
                  AND indexname IN ('IX_Notifications_CreatedAt','IX_Notifications_UserId_IsRead')
                """),
            // Creates UserRefreshTokens + 2 indexes.
            ("20260325141612_AddUserRefreshTokens", """
                SELECT EXISTS (SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'UserRefreshTokens')
                   AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
                        AND indexname IN ('IX_UserRefreshTokens_TokenHash','IX_UserRefreshTokens_UserId')) = 2
                """),
            // Creates SiteContents + unique index on Key.
            ("20260325153221_AddSiteContent", """
                SELECT EXISTS (SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'SiteContents')
                   AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
                        AND indexname = 'IX_SiteContents_Key')
                """),
            // Creates SubscriptionHistories + 2 indexes.
            ("20260325170000_AddSubscriptionHistory", """
                SELECT EXISTS (SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'SubscriptionHistories')
                   AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
                        AND indexname IN ('IX_SubscriptionHistories_SubscriptionId','IX_SubscriptionHistories_CreatedAtUtc')) = 2
                """),
            // Creates UserImages + index on UserId.
            ("20260415120000_AddUserImages", """
                SELECT EXISTS (SELECT 1 FROM information_schema.tables
                        WHERE table_schema = 'public' AND table_name = 'UserImages')
                   AND EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname = 'public'
                        AND indexname = 'IX_UserImages_UserId')
                """),
            // Adds UserImageId to PropertyImages AND ProjectImages + 2 indexes + 2 FKs.
            ("20260415140000_AddUserImageFKToListingImages", """
                SELECT (SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_schema = 'public' AND column_name = 'UserImageId'
                          AND table_name IN ('PropertyImages','ProjectImages')) = 2
                   AND (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public'
                        AND indexname IN ('IX_PropertyImages_UserImageId','IX_ProjectImages_UserImageId')) = 2
                   AND (SELECT COUNT(*) FROM pg_constraint
                        WHERE conname IN ('FK_PropertyImages_UserImages_UserImageId','FK_ProjectImages_UserImages_UserImageId')) = 2
                """),
            // Adds 3 columns to UserImages + IsCover to PropertyImages AND ProjectImages.
            ("20260415160000_EnhanceUserImages", """
                SELECT (SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'UserImages'
                          AND column_name IN ('OriginalFileName','MimeType','SizeBytes')) = 3
                   AND (SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_schema = 'public' AND column_name = 'IsCover'
                          AND table_name IN ('PropertyImages','ProjectImages')) = 2
                """),
            // Adds ThumbnailUrl + ThumbnailFileKey to UserImages.
            ("20260415200000_AddUserImageThumbnail", """
                SELECT (SELECT COUNT(*) FROM information_schema.columns
                        WHERE table_schema = 'public' AND table_name = 'UserImages'
                          AND column_name IN ('ThumbnailUrl','ThumbnailFileKey')) = 2
                """),
            // 20260504120000_AddAppSettings, 20260505100000_ExpandAgencyProfile
            // and 20260513000000_AddStaticPages are intentionally OMITTED:
            // their Up() bodies are fully idempotent (IF NOT EXISTS), so they
            // are safe to run as normal pending migrations.
        };

        foreach (var (migrationId, existsSql) in sentinels)
        {
            bool verified;
            try
            {
                await using var cmd = _db.Database.GetDbConnection().CreateCommand();
                await _db.Database.OpenConnectionAsync(ct);
                cmd.CommandText = existsSql;
                verified = (bool)(await cmd.ExecuteScalarAsync(ct) ?? false);
            }
            catch (Exception ex)
            {
                // A failed sentinel check must never abort bootstrap. Treat as
                // NOT verified → the migration stays pending (safe default:
                // MigrateAsync will attempt it for real).
                _log.LogWarning(
                    "[baseline] Sentinel check failed for {Id} — leaving pending: {Msg}",
                    migrationId, ex.Message);
                verified = false;
            }
            finally
            {
                await _db.Database.CloseConnectionAsync();
            }

            if (verified)
            {
                string insert = $"""
                    INSERT INTO "__EFMigrationsHistory" ("MigrationId", "ProductVersion")
                    VALUES ('{migrationId}', '{EfProductVersion}')
                    ON CONFLICT ("MigrationId") DO NOTHING
                    """;
                await _db.Database.ExecuteSqlRawAsync(insert, ct);
                _log.LogInformation(
                    "[baseline] Verified schema objects exist — marked as applied: {Id}", migrationId);
            }
            else
            {
                _log.LogInformation(
                    "[baseline] Schema objects MISSING — left pending for MigrateAsync: {Id}", migrationId);
            }
        }
    }

    private async Task<bool> MigrationsHistoryHasRowsAsync(CancellationToken ct)
    {
        try
        {
            await using var cmd = _db.Database.GetDbConnection().CreateCommand();
            await _db.Database.OpenConnectionAsync(ct);
            cmd.CommandText = IsSqlite || IsPostgres
                ? "SELECT COUNT(*) FROM \"__EFMigrationsHistory\""
                : "SELECT COUNT(*) FROM __EFMigrationsHistory";
            var result = await cmd.ExecuteScalarAsync(ct);
            return Convert.ToInt64(result) > 0;
        }
        catch
        {
            // If the count itself fails, be conservative: report "has rows" so
            // we fall through to the normal MigrateAsync path unchanged.
            return true;
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

    private async Task ApplyIntegrationsPatchAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;
        try
        {
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "IntegrationSettings" (
                    "Key"       varchar(100) PRIMARY KEY,
                    "IsEnabled" boolean      NOT NULL DEFAULT false,
                    "ConfigJson" text,
                    "UpdatedBy" varchar(200),
                    "UpdatedAt" timestamptz  NOT NULL DEFAULT NOW()
                )
                """, ct);
            _log.LogInformation("[schema-patch] IntegrationSettings table ensured.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] IntegrationSettings patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    // ── Messaging schema patch ────────────────────────────────────────────────
    // Ensures Conversations and Messages tables exist even on databases that
    // were provisioned before these tables were introduced.
    //
    // IMPORTANT: This project uses a global GuidToStringConverter
    // (BoiootDbContext line 17). Every Guid property — including Id, User1Id,
    // User2Id, etc. — is stored as character varying(36), NOT as uuid.
    // Using uuid here would cause a FK type-mismatch error when Users.Id is
    // varchar(36), silently swallowing the error and leaving the tables
    // uncreated. All ID columns MUST be character varying(36) to match.
    //
    // All statements use IF NOT EXISTS — safe to run on DBs that already
    // have these tables (no-op for existing tables).
    private async Task ApplyMessagingPatchAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;
        try
        {
            // 1. Conversations table
            // character varying(36) for all ID/FK columns — matches GuidToStringConverter.
            // No DEFAULT gen_random_uuid() — that returns uuid; EF Core sets the Id
            // via the SaveChanges hook before INSERT.
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "Conversations" (
                    "Id"            character varying(36)  NOT NULL PRIMARY KEY,
                    "User1Id"       character varying(36)  NOT NULL
                                    REFERENCES "Users"("Id") ON DELETE RESTRICT,
                    "User2Id"       character varying(36)  NOT NULL
                                    REFERENCES "Users"("Id") ON DELETE RESTRICT,
                    "PropertyId"    character varying(36)
                                    REFERENCES "Properties"("Id") ON DELETE SET NULL,
                    "ProjectId"     character varying(36)
                                    REFERENCES "Projects"("Id") ON DELETE SET NULL,
                    "LastMessageAt" timestamp with time zone,
                    "CreatedAt"     timestamp with time zone NOT NULL DEFAULT NOW(),
                    "UpdatedAt"     timestamp with time zone NOT NULL DEFAULT NOW()
                )
                """, ct);

            // Indexes — no-op if they already exist
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Conversations_User1Id"
                    ON "Conversations" ("User1Id")
                """, ct);
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Conversations_User2Id"
                    ON "Conversations" ("User2Id")
                """, ct);
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Conversations_LastMessageAt"
                    ON "Conversations" ("LastMessageAt")
                """, ct);
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Conversations_ProjectId"
                    ON "Conversations" ("ProjectId")
                """, ct);
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Conversations_PropertyId"
                    ON "Conversations" ("PropertyId")
                """, ct);

            // 2. Messages table
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE TABLE IF NOT EXISTS "Messages" (
                    "Id"             character varying(36)    NOT NULL PRIMARY KEY,
                    "ConversationId" character varying(36)    NOT NULL
                                     REFERENCES "Conversations"("Id") ON DELETE CASCADE,
                    "SenderId"       character varying(36)    NOT NULL
                                     REFERENCES "Users"("Id") ON DELETE RESTRICT,
                    "Content"        character varying(2000)  NOT NULL DEFAULT '',
                    "IsRead"         boolean                  NOT NULL DEFAULT false,
                    "AttachmentData" text,
                    "AttachmentName" text,
                    "CreatedAt"      timestamp with time zone NOT NULL DEFAULT NOW(),
                    "UpdatedAt"      timestamp with time zone NOT NULL DEFAULT NOW()
                )
                """, ct);

            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Messages_ConversationId_CreatedAt"
                    ON "Messages" ("ConversationId", "CreatedAt")
                """, ct);
            await _db.Database.ExecuteSqlRawAsync("""
                CREATE INDEX IF NOT EXISTS "IX_Messages_SenderId"
                    ON "Messages" ("SenderId")
                """, ct);

            _log.LogInformation("[schema-patch] Messaging tables (Conversations, Messages) ensured.");
        }
        catch (Exception ex)
        {
            _log.LogError(ex, "[schema-patch] Messaging patch FAILED — tables may be missing: {Msg}", ex.Message);
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

    /// <summary>
    /// Creates the UserTags table on PostgreSQL if it does not already exist.
    /// UserTags has no EF Core entity so EnsureCreated()/MigrateAsync() never
    /// creates it. SchemaEvolutionService only runs on SQLite. This patch fills
    /// the gap for the production (Fly.io) PostgreSQL database.
    ///
    /// Columns use text / varchar types to match the raw SQL queries in
    /// AdminService which pass UUID values as plain string literals (no ::uuid cast).
    /// The unique index on (UserId, Tag) enables ON CONFLICT DO NOTHING in inserts.
    /// </summary>
    private async Task ApplyUserTagsPatchAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;

        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "UserTags" (
                    "Id"        text NOT NULL PRIMARY KEY,
                    "UserId"    text NOT NULL,
                    "Tag"       character varying(50) NOT NULL,
                    "CreatedAt" text NOT NULL DEFAULT ''
                )
                """, ct);

            await _db.Database.ExecuteSqlRawAsync(
                """CREATE INDEX IF NOT EXISTS "IX_UserTags_UserId" ON "UserTags" ("UserId")""", ct);

            await _db.Database.ExecuteSqlRawAsync(
                """CREATE UNIQUE INDEX IF NOT EXISTS "IX_UserTags_UserId_Tag" ON "UserTags" ("UserId", "Tag")""", ct);

            _log.LogInformation("[schema-patch] UserTags patch applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] UserTags patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    // ── Subscription reference numbers ────────────────────────────────────────

    /// <summary>
    /// Adds SubscriptionNumber column (nullable varchar 20) and backfills
    /// existing rows with generated SUB-YYYY-NNNNNN values, then creates a
    /// unique partial index so future rows cannot collide.
    /// Fully idempotent — safe to run on every startup.
    /// </summary>
    private async Task ApplySubscriptionNumberPatchAsync(CancellationToken ct)
    {
        if (!IsPostgres) return;

        try
        {
            // 1. Add column if absent
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Subscriptions" ADD COLUMN IF NOT EXISTS "SubscriptionNumber" character varying(20)""", ct);

            // 2. Backfill existing rows that have no number yet.
            //    Partition by year so each year's counter restarts at 000001.
            await _db.Database.ExecuteSqlRawAsync(
                """
                UPDATE "Subscriptions" s
                SET    "SubscriptionNumber" = sub_numbered."num"
                FROM (
                    SELECT "Id",
                           'SUB-' || TO_CHAR("CreatedAt", 'YYYY') || '-' ||
                           LPAD(ROW_NUMBER() OVER (
                               PARTITION BY DATE_PART('year', "CreatedAt")
                               ORDER BY "CreatedAt", "Id"
                           )::text, 6, '0') AS num
                    FROM "Subscriptions"
                    WHERE "SubscriptionNumber" IS NULL
                ) sub_numbered
                WHERE s."Id" = sub_numbered."Id"
                  AND s."SubscriptionNumber" IS NULL
                """, ct);

            // 3. Unique partial index — only indexes non-NULL values (safe for
            //    any rows that might still be NULL on non-Postgres envs).
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Subscriptions_SubscriptionNumber"
                ON "Subscriptions" ("SubscriptionNumber")
                WHERE "SubscriptionNumber" IS NOT NULL
                """, ct);

            _log.LogInformation("[schema-patch] Subscriptions.SubscriptionNumber patch applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Subscriptions.SubscriptionNumber patch failed (non-critical): {Msg}", ex.Message);
        }

        // ── Reference numbers for admin entities ──────────────────────────────
        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Users" ADD COLUMN IF NOT EXISTS "ReferenceNumber" character varying(25)""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "VerificationRequests" ADD COLUMN IF NOT EXISTS "ReferenceNumber" character varying(25)""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Requests" ADD COLUMN IF NOT EXISTS "ReferenceNumber" character varying(25)""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "BuyerRequests" ADD COLUMN IF NOT EXISTS "ReferenceNumber" character varying(25)""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "SpecialRequests" ADD COLUMN IF NOT EXISTS "ReferenceNumber" character varying(25)""", ct);

            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Users_ReferenceNumber"
                ON "Users" ("ReferenceNumber")
                WHERE "ReferenceNumber" IS NOT NULL
                """, ct);
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_VerificationRequests_ReferenceNumber"
                ON "VerificationRequests" ("ReferenceNumber")
                WHERE "ReferenceNumber" IS NOT NULL
                """, ct);
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_Requests_ReferenceNumber"
                ON "Requests" ("ReferenceNumber")
                WHERE "ReferenceNumber" IS NOT NULL
                """, ct);
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_BuyerRequests_ReferenceNumber"
                ON "BuyerRequests" ("ReferenceNumber")
                WHERE "ReferenceNumber" IS NOT NULL
                """, ct);
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_SpecialRequests_ReferenceNumber"
                ON "SpecialRequests" ("ReferenceNumber")
                WHERE "ReferenceNumber" IS NOT NULL
                """, ct);

            // ── Backfill existing Users that have no ReferenceNumber ──────────
            await _db.Database.ExecuteSqlRawAsync(
                """
                WITH ordered AS (
                    SELECT
                        "Id",
                        EXTRACT(YEAR FROM "CreatedAt")::TEXT AS yr,
                        ROW_NUMBER() OVER (
                            PARTITION BY EXTRACT(YEAR FROM "CreatedAt")
                            ORDER BY "CreatedAt", "Id"
                        ) AS rn
                    FROM "Users"
                    WHERE "ReferenceNumber" IS NULL
                )
                UPDATE "Users" u
                SET "ReferenceNumber" = CONCAT('USR-', o.yr, '-', LPAD(o.rn::TEXT, 6, '0'))
                FROM ordered o
                WHERE u."Id" = o."Id"
                """, ct);

            _log.LogInformation("[schema-patch] ReferenceNumber columns, indexes, and backfill applied.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] ReferenceNumber patch failed (non-critical): {Msg}", ex.Message);
        }

        // ── Reference-number sequences (atomic allocation; fixes 23505) ───────
        // Each (prefix, year) gets a dedicated PostgreSQL sequence, seeded from
        // the current maximum existing suffix + 1. ReferenceGenerator reads these
        // via nextval() so numbers never collide after soft-deletes or under
        // concurrency. Idempotent: only creates a sequence that does not exist,
        // so it never resets a live sequence backwards.
        try
        {
            var refYear = DateTime.UtcNow.Year;
            var refEntities = new (string Prefix, string Table)[]
            {
                ("USR", "Users"),
                ("VER", "VerificationRequests"),
                ("CNT", "Requests"),
                ("MRK", "BuyerRequests"),
                ("REQ", "SpecialRequests"),
            };

            foreach (var (prefix, table) in refEntities)
            {
                var seq  = $"ref_{prefix.ToLowerInvariant()}_{refYear}";
                var like = $"{prefix}-{refYear}-%";
                var rx   = $"^{prefix}-{refYear}-([0-9]+)$";

                var sql = $$"""
                    DO $$
                    DECLARE v_start bigint;
                    BEGIN
                        IF to_regclass('"{{seq}}"') IS NULL THEN
                            SELECT COALESCE(MAX(SUBSTRING("ReferenceNumber" FROM '{{rx}}')::bigint), 0) + 1
                              INTO v_start
                              FROM "{{table}}"
                              WHERE "ReferenceNumber" LIKE '{{like}}';
                            EXECUTE format('CREATE SEQUENCE IF NOT EXISTS "{{seq}}" START WITH %s MINVALUE 1', v_start);
                        END IF;
                    END $$;
                    """;

                await _db.Database.ExecuteSqlRawAsync(sql, ct);
            }

            _log.LogInformation("[schema-patch] Reference-number sequences ensured for {Year}.", refYear);
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Reference-number sequence patch failed (non-critical): {Msg}", ex.Message);
        }

        // ── Dual-currency prices for Plans (PriceSyp / PriceUsd) ─────────────
        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Plans" ADD COLUMN IF NOT EXISTS "PriceSyp" numeric(18,2) NOT NULL DEFAULT 0""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Plans" ADD COLUMN IF NOT EXISTS "PriceUsd" numeric(18,2) NOT NULL DEFAULT 0""", ct);

            // Backfill: seed PriceSyp from BasePriceMonthly for existing plans where PriceSyp = 0
            await _db.Database.ExecuteSqlRawAsync(
                """
                UPDATE "Plans"
                SET "PriceSyp" = "BasePriceMonthly"
                WHERE "PriceSyp" = 0 AND "BasePriceMonthly" > 0
                """, ct);

            _log.LogInformation("[schema-patch] Plans.PriceSyp / Plans.PriceUsd columns added and backfilled.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Plans dual-currency patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    // ── Matching + Coverage patch ─────────────────────────────────────────────

    private async Task ApplyMatchingAndCoveragePatchAsync(CancellationToken ct)
    {
        try
        {
            // Plan.ProductArea — nullable product area discriminator
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Plans" ADD COLUMN IF NOT EXISTS "ProductArea" character varying(50)""", ct);

            // BuyerRequest structured location IDs — text to match EF Core GuidToStringConverter
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "BuyerRequests" ADD COLUMN IF NOT EXISTS "CityId" text""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "BuyerRequests" ADD COLUMN IF NOT EXISTS "NeighborhoodId" text""", ct);

            // If previously added as uuid, migrate to text
            await _db.Database.ExecuteSqlRawAsync(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='BuyerRequests' AND column_name='CityId' AND data_type='uuid')
                    THEN ALTER TABLE "BuyerRequests"
                         ALTER COLUMN "CityId"         TYPE text USING "CityId"::text,
                         ALTER COLUMN "NeighborhoodId" TYPE text USING "NeighborhoodId"::text;
                    END IF;
                END $$;
                """, ct);

            // Companies structured location IDs — text to match EF Core GuidToStringConverter
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Companies" ADD COLUMN IF NOT EXISTS "CityId" text""", ct);
            await _db.Database.ExecuteSqlRawAsync(
                """ALTER TABLE "Companies" ADD COLUMN IF NOT EXISTS "NeighborhoodId" text""", ct);

            // If previously added as uuid, migrate to text
            await _db.Database.ExecuteSqlRawAsync(
                """
                DO $$
                BEGIN
                    IF EXISTS (SELECT 1 FROM information_schema.columns
                               WHERE table_name='Companies' AND column_name='CityId' AND data_type='uuid')
                    THEN ALTER TABLE "Companies"
                         ALTER COLUMN "CityId"         TYPE text USING "CityId"::text,
                         ALTER COLUMN "NeighborhoodId" TYPE text USING "NeighborhoodId"::text;
                    END IF;
                END $$;
                """, ct);

            _log.LogInformation("[schema-patch] Matching schema applied (Plans.ProductArea, BuyerRequests.CityId/NeighborhoodId, Companies.CityId/NeighborhoodId).");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] Matching + Coverage patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    // ── Dedicated patch so UserCoverages is never silently skipped ───────────────
    private async Task ApplyUserCoveragesTablePatchAsync(CancellationToken ct)
    {
        try
        {
            // If the table was previously created with uuid columns (before EF Core
            // GuidToStringConverter was taken into account), migrate every uuid
            // column to text so EF Core comparisons (uuid = character varying) stop
            // failing with Npgsql error 42883.
            await _db.Database.ExecuteSqlRawAsync(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'UserCoverages'
                          AND column_name = 'Id'
                          AND data_type   = 'uuid'
                    ) THEN
                        DROP INDEX IF EXISTS "IX_UserCoverages_UserId";
                        DROP INDEX IF EXISTS "IX_UserCoverages_Unique";
                        ALTER TABLE "UserCoverages"
                            ALTER COLUMN "Id"             TYPE text USING "Id"::text,
                            ALTER COLUMN "UserId"         TYPE text USING "UserId"::text,
                            ALTER COLUMN "CityId"         TYPE text USING "CityId"::text,
                            ALTER COLUMN "NeighborhoodId" TYPE text USING "NeighborhoodId"::text;
                    END IF;
                END $$;
                """, ct);

            // Create with text columns (matches EF Core GuidToStringConverter)
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "UserCoverages" (
                    "Id"             text        NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
                    "UserId"         text        NOT NULL,
                    "CityId"         text        NOT NULL,
                    "NeighborhoodId" text,
                    "CoverageType"   varchar(20) NOT NULL DEFAULT 'city_wide',
                    "CreatedAt"      timestamptz NOT NULL DEFAULT now(),
                    "UpdatedAt"      timestamptz NOT NULL DEFAULT now()
                )
                """, ct);

            // UserId index — speeds up the per-user GET query
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE INDEX IF NOT EXISTS "IX_UserCoverages_UserId"
                    ON "UserCoverages" ("UserId")
                """, ct);

            // Unique constraint — prevents duplicate coverage registrations
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE UNIQUE INDEX IF NOT EXISTS "IX_UserCoverages_Unique"
                    ON "UserCoverages" ("UserId", "CityId", "CoverageType", "NeighborhoodId")
                """, ct);

            _log.LogInformation("[schema-patch] UserCoverages table + indexes ensured (text columns).");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] UserCoverages patch failed (non-critical): {Msg}", ex.Message);
        }
    }

    private async Task ApplyLocationSuggestionsPatchAsync(CancellationToken ct)
    {
        try
        {
            // Migrate existing uuid columns to text if needed
            await _db.Database.ExecuteSqlRawAsync(
                """
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name  = 'LocationSuggestions'
                          AND column_name = 'Id'
                          AND data_type   = 'uuid'
                    ) THEN
                        ALTER TABLE "LocationSuggestions"
                            ALTER COLUMN "Id"       TYPE text USING "Id"::text,
                            ALTER COLUMN "ParentId" TYPE text USING "ParentId"::text;
                    END IF;
                END $$;
                """, ct);

            // Create with text columns to match EF Core GuidToStringConverter
            await _db.Database.ExecuteSqlRawAsync(
                """
                CREATE TABLE IF NOT EXISTS "LocationSuggestions" (
                    "Id"        text         NOT NULL DEFAULT gen_random_uuid()::text PRIMARY KEY,
                    "Name"      varchar(200) NOT NULL,
                    "Type"      varchar(20)  NOT NULL,
                    "ParentId"  text,
                    "Status"    varchar(20)  NOT NULL DEFAULT 'pending',
                    "CreatedAt" timestamptz  NOT NULL DEFAULT now(),
                    "UpdatedAt" timestamptz  NOT NULL DEFAULT now()
                )
                """, ct);

            _log.LogInformation("[schema-patch] LocationSuggestions table ensured (text columns).");
        }
        catch (Exception ex)
        {
            _log.LogWarning("[schema-patch] LocationSuggestions patch failed (non-critical): {Msg}", ex.Message);
        }
    }
}
