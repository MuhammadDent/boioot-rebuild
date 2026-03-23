using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence;

/// <summary>
/// Applies incremental, idempotent schema patches for databases that pre-date
/// EF Core Migrations.  Each patch uses try/catch so an already-applied column
/// or index is silently skipped.
///
/// PORTABILITY NOTE:
///   These patches use SQLite DDL syntax (TEXT / INTEGER / REAL types, partial
///   indexes with WHERE).  When migrating to SQL Server, these patches become
///   unnecessary for new deployments — EF Core Migrations handle the schema.
///   For legacy SQLite databases, they remain until all instances have been
///   migrated.  New schema changes must go into EF Core migration files, NOT
///   into this service.
/// </summary>
public sealed class SchemaEvolutionService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<SchemaEvolutionService> _log;
    private readonly bool _isSqlite;

    public SchemaEvolutionService(BoiootDbContext db, ILogger<SchemaEvolutionService> log)
    {
        _db       = db;
        _log      = log;
        _isSqlite = db.Database.ProviderName?.Contains("Sqlite", StringComparison.OrdinalIgnoreCase) ?? false;
    }

    public async Task ApplyPatchesAsync(CancellationToken ct = default)
    {
        _log.LogInformation("Applying schema evolution patches...");

        await ApplyPropertyPatchesAsync(ct);
        await ApplyLocationPatchesAsync(ct);
        await ApplyUserPatchesAsync(ct);
        await ApplyCompanyPatchesAsync(ct);
        await ApplyProjectPatchesAsync(ct);
        await ApplyAgentPatchesAsync(ct);
        await ApplyMessagePatchesAsync(ct);
        await ApplyRequestPatchesAsync(ct);
        await ApplyBlogPatchesAsync(ct);
        await ApplyAccountPatchesAsync(ct);
        await ApplySubscriptionPatchesAsync(ct);
        await ApplyPlanPatchesAsync(ct);
        await ApplyInvoicePatchesAsync(ct);
        await ApplyFeatureDefinitionPatchesAsync(ct);
        await ApplyPlanFeaturePatchesAsync(ct);

        if (_isSqlite)
        {
            await ApplySqliteIndexPatchesAsync(ct);
            await ApplyWalCheckpointAsync(ct);
        }

        _log.LogInformation("Schema evolution patches complete.");
    }

    // ── Column patches ────────────────────────────────────────────────────────

    private async Task ApplyPropertyPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Properties", "Neighborhood",      "TEXT",                          ct);
        await TryAlter("Properties", "Currency",          "TEXT NOT NULL DEFAULT 'SYP'",   ct);
        await TryAlter("Properties", "Province",          "TEXT",                          ct);
        await TryAlter("Properties", "OwnerId",           "TEXT",                          ct);
        await TryAlter("Properties", "HallsCount",        "INTEGER",                       ct);
        await TryAlter("Properties", "PaymentType",       "TEXT NOT NULL DEFAULT 'OneTime'", ct);
        await TryAlter("Properties", "InstallmentsCount", "INTEGER",                       ct);
        await TryAlter("Properties", "HasCommission",     "INTEGER NOT NULL DEFAULT 0",    ct);
        await TryAlter("Properties", "CommissionType",    "TEXT",                          ct);
        await TryAlter("Properties", "CommissionValue",   "REAL",                          ct);
        await TryAlter("Properties", "OwnershipType",     "TEXT",                          ct);
        await TryAlter("Properties", "Floor",             "TEXT",                          ct);
        await TryAlter("Properties", "PropertyAge",       "INTEGER",                       ct);
        await TryAlter("Properties", "Features",          "TEXT",                          ct);
        await TryAlter("Properties", "VideoUrl",          "TEXT",                          ct);
        await TryAlter("Properties", "ViewCount",         "INTEGER NOT NULL DEFAULT 0",    ct);
        await TryAlter("Properties", "AccountId",         "TEXT",                          ct);
        await TryAlter("Properties", "CreatedByUserId",   "TEXT NOT NULL DEFAULT ''",      ct);
        await TryAlter("Properties", "CreatedByRole",     "TEXT NOT NULL DEFAULT ''",      ct);
        await TryAlter("Properties", "CreatedByCompanyId","TEXT",                          ct);
    }

    private async Task ApplyLocationPatchesAsync(CancellationToken ct)
    {
        await TryAlter("LocationCities",        "Province",       "TEXT NOT NULL DEFAULT ''", ct);
        await TryAlter("LocationCities",        "NormalizedName", "TEXT NOT NULL DEFAULT ''", ct);
        await TryAlter("LocationCities",        "IsActive",       "INTEGER NOT NULL DEFAULT 1", ct);
        await TryAlter("LocationNeighborhoods", "NormalizedName", "TEXT NOT NULL DEFAULT ''", ct);
        await TryAlter("LocationNeighborhoods", "IsActive",       "INTEGER NOT NULL DEFAULT 1", ct);

        // Backfill NormalizedName for existing rows (Arabic normalization approximation).
        // char(0x...) is SQLite syntax — this block only runs on SQLite.
        if (_isSqlite)
        {
            await TryExec(@"
                UPDATE LocationCities SET NormalizedName =
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        REPLACE(Name, char(0x0640), ''),
                        char(0x0623), char(0x0627)),
                        char(0x0625), char(0x0627)),
                        char(0x0622), char(0x0627)),
                        char(0x0649), char(0x064A)),
                    '  ', ' '))
                WHERE NormalizedName = '' OR NormalizedName IS NULL", ct);

            await TryExec(@"
                UPDATE LocationNeighborhoods SET NormalizedName =
                    TRIM(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(
                        REPLACE(Name, char(0x0640), ''),
                        char(0x0623), char(0x0627)),
                        char(0x0625), char(0x0627)),
                        char(0x0622), char(0x0627)),
                        char(0x0649), char(0x064A)),
                    '  ', ' '))
                WHERE NormalizedName = '' OR NormalizedName IS NULL", ct);
        }

        // Deactivate duplicate cities — keep the canonical (MIN Id) per (Province, NormalizedName).
        await TryExec(@"
            UPDATE LocationCities
            SET IsActive = 0
            WHERE IsActive = 1
              AND NormalizedName != ''
              AND Id NOT IN (
                  SELECT MIN(Id)
                  FROM LocationCities
                  WHERE IsActive = 1 AND NormalizedName != ''
                  GROUP BY Province, NormalizedName
              )", ct, warnOnError: true);

        await TryExec(@"
            UPDATE LocationNeighborhoods
            SET IsActive = 0
            WHERE IsActive = 1
              AND NormalizedName != ''
              AND Id NOT IN (
                  SELECT MIN(Id)
                  FROM LocationNeighborhoods
                  WHERE IsActive = 1 AND NormalizedName != ''
                  GROUP BY City, NormalizedName
              )", ct, warnOnError: true);
    }

    private async Task ApplyUserPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Users", "ProfileImageUrl",    "TEXT",                        ct);
        await TryAlter("Users", "TrialListingsUsed",  "INTEGER NOT NULL DEFAULT 0",  ct);

        // Backfill TrialListingsUsed for existing User-role accounts using EF.
        try
        {
            var trialUsers = await _db.Set<Boioot.Domain.Entities.User>()
                .Where(u => u.Role == Boioot.Domain.Enums.UserRole.User && u.TrialListingsUsed == 0)
                .ToListAsync(ct);

            foreach (var u in trialUsers)
            {
                var ownerIdStr   = u.Id.ToString();
                var allTimeCount = await _db.Set<Boioot.Domain.Entities.Property>()
                    .CountAsync(p => p.OwnerId == ownerIdStr, ct);
                if (allTimeCount > 0)
                    u.TrialListingsUsed = allTimeCount;
            }

            if (trialUsers.Any(u => u.TrialListingsUsed > 0))
                await _db.SaveChangesAsync(ct);
        }
        catch (Exception ex)
        {
            _log.LogWarning("TrialListingsUsed backfill skipped: {msg}", ex.Message);
        }
    }

    private async Task ApplyCompanyPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Companies", "Province",           "TEXT",                       ct);
        await TryAlter("Companies", "Neighborhood",       "TEXT",                       ct);
        await TryAlter("Companies", "WhatsApp",           "TEXT",                       ct);
        await TryAlter("Companies", "Latitude",           "REAL",                       ct);
        await TryAlter("Companies", "Longitude",          "REAL",                       ct);
        await TryAlter("Companies", "IsProfileComplete",  "INTEGER NOT NULL DEFAULT 0", ct);
    }

    private async Task ApplyProjectPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Projects", "Province", "TEXT", ct);
    }

    private async Task ApplyAgentPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Agents", "BrokerId", "TEXT", ct);
    }

    private async Task ApplyMessagePatchesAsync(CancellationToken ct)
    {
        await TryAlter("Messages", "AttachmentData", "TEXT", ct);
        await TryAlter("Messages", "AttachmentName", "TEXT", ct);
    }

    private async Task ApplyRequestPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Requests", "UserId", "TEXT", ct);
    }

    private async Task ApplyBlogPatchesAsync(CancellationToken ct)
    {
        await TryAlter("BlogPosts", "CoverImageAlt",      "TEXT",                          ct);
        await TryAlter("BlogPosts", "Tags",               "TEXT",                          ct);
        await TryAlter("BlogPosts", "SeoMode",            "TEXT NOT NULL DEFAULT 'Auto'",  ct);
        await TryAlter("BlogPosts", "OgTitle",            "TEXT",                          ct);
        await TryAlter("BlogPosts", "OgDescription",      "TEXT",                          ct);
        await TryAlter("BlogPosts", "SeoTitleMode",       "TEXT NOT NULL DEFAULT 'Auto'",  ct);
        await TryAlter("BlogPosts", "SeoDescriptionMode", "TEXT NOT NULL DEFAULT 'Auto'",  ct);
        await TryAlter("BlogPosts", "SlugMode",           "TEXT NOT NULL DEFAULT 'Auto'",  ct);

        await TryAlter("BlogSeoSettings", "DefaultBlogListSeoTitle",
            "TEXT NOT NULL DEFAULT 'المدونة | بيوت'", ct);
        await TryAlter("BlogSeoSettings", "DefaultBlogListSeoDescription",
            "TEXT NOT NULL DEFAULT 'تصفح أحدث المقالات العقارية من بيوت سوريا'", ct);
        await TryAlter("BlogSeoSettings", "DefaultOgTitleTemplate",
            "TEXT NOT NULL DEFAULT '{PostTitle} | {SiteName}'", ct);
        await TryAlter("BlogSeoSettings", "DefaultOgDescriptionTemplate",
            "TEXT NOT NULL DEFAULT '{Excerpt}'", ct);
    }

    private async Task ApplyAccountPatchesAsync(CancellationToken ct)
    {
        await TryExec("DROP INDEX IF EXISTS ix_accounts_owneruserid", ct);
        await TryAlter("Accounts", "CreatedByUserId",     "TEXT NOT NULL DEFAULT ''", ct);
        await TryAlter("Accounts", "PrimaryAdminUserId",  "TEXT",                    ct);

        await TryAlter("AccountUsers", "OrganizationUserRole", "TEXT NOT NULL DEFAULT 'Agent'", ct);
        await TryAlter("AccountUsers", "IsPrimary",            "INTEGER NOT NULL DEFAULT 0",    ct);
        await TryAlter("AccountUsers", "IsActive",             "INTEGER NOT NULL DEFAULT 1",    ct);
    }

    private async Task ApplySubscriptionPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Subscriptions", "IsActive",   "INTEGER NOT NULL DEFAULT 1", ct);
        await TryAlter("Subscriptions", "PricingId",  "TEXT",                       ct);
        await TryAlter("Subscriptions", "AutoRenew",  "INTEGER NOT NULL DEFAULT 1", ct);
    }

    private async Task ApplyPlanPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Plans", "ImageLimitPerListing",    "INTEGER NOT NULL DEFAULT 5",            ct);
        await TryAlter("Plans", "VideoAllowed",            "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "AnalyticsAccess",         "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "Features",                "TEXT",                                  ct);
        await TryAlter("Plans", "Description",             "TEXT",                                  ct);
        await TryAlter("Plans", "ApplicableAccountType",   "TEXT",                                  ct);
        await TryAlter("Plans", "Rank",                    "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "DisplayOrder",            "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "IsPublic",                "INTEGER NOT NULL DEFAULT 1",            ct);
        await TryAlter("Plans", "IsRecommended",           "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "PlanCategory",            "TEXT",                                  ct);
        await TryAlter("Plans", "BillingMode",             "TEXT NOT NULL DEFAULT 'InternalOnly'",  ct);
        await TryAlter("Plans", "Code",                    "TEXT",                                  ct);
        await TryAlter("Plans", "BadgeText",               "TEXT",                                  ct);
        await TryAlter("Plans", "PlanColor",               "TEXT",                                  ct);
        await TryAlter("Plans", "HasTrial",                "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "TrialDays",               "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "RequiresPaymentForTrial", "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "IsDefaultForNewUsers",    "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "AvailableForSelfSignup",  "INTEGER NOT NULL DEFAULT 1",            ct);
        await TryAlter("Plans", "RequiresAdminApproval",   "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "AllowAddOns",             "INTEGER NOT NULL DEFAULT 0",            ct);
        await TryAlter("Plans", "AllowUpgrade",            "INTEGER NOT NULL DEFAULT 1",            ct);
        await TryAlter("Plans", "AllowDowngrade",          "INTEGER NOT NULL DEFAULT 1",            ct);
        await TryAlter("Plans", "AutoDowngradeOnExpiry",   "INTEGER NOT NULL DEFAULT 1",            ct);
    }

    private async Task ApplyInvoicePatchesAsync(CancellationToken ct)
    {
        await TryAlter("Invoices", "ExpiresAt",        "TEXT", ct);
        await TryAlter("Invoices", "ApprovedBy",       "TEXT", ct);
        await TryAlter("Invoices", "ApprovedAt",       "TEXT", ct);
        await TryAlter("Invoices", "RejectedBy",       "TEXT", ct);
        await TryAlter("Invoices", "RejectedAt",       "TEXT", ct);
        await TryAlter("Invoices", "StripeSessionUrl", "TEXT", ct);
    }

    private async Task ApplyFeatureDefinitionPatchesAsync(CancellationToken ct)
    {
        await TryAlter("FeatureDefinitions", "Icon", "TEXT", ct);
    }

    private async Task ApplyPlanFeaturePatchesAsync(CancellationToken ct)
    {
        // Rename PlanId → SubscriptionPlanId if the table was created with the old column name.
        await TryExec("ALTER TABLE PlanFeatures RENAME COLUMN PlanId TO SubscriptionPlanId", ct);

        // Drop stale indexes that referenced the old column name.
        await TryExec("DROP INDEX IF EXISTS ix_planfeatures_plan_feature", ct);
        await TryExec("DROP INDEX IF EXISTS ix_planfeatures_planid", ct);
    }

    // ── SQLite-specific index patches ─────────────────────────────────────────

    private async Task ApplySqliteIndexPatchesAsync(CancellationToken ct)
    {
        // Remove legacy non-filtered indexes (replaced by IsActive-scoped versions below).
        await TryExec("DROP INDEX IF EXISTS IX_LocationCities_Name",                    ct);
        await TryExec("DROP INDEX IF EXISTS IX_LocationNeighborhoods_Name_City",        ct);
        await TryExec("DROP INDEX IF EXISTS IX_LocationCities_Province_NormalizedName", ct);
        await TryExec("DROP INDEX IF EXISTS IX_LocationNeighborhoods_NormalizedName_City", ct);

        // Filtered unique indexes: only scoped to IsActive=1 rows so deactivated
        // duplicates can coexist without blocking future active inserts.
        // WHERE-clause filtered indexes are SQLite/SQL Server compatible but the
        // syntax here uses SQLite form. These are maintained here (not in EF config)
        // because EF Core Fluent API does not support partial index expressions for SQLite.
        await TryExec(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_LocationCities_Province_NormalizedName_Active " +
            "ON LocationCities(Province, NormalizedName) " +
            "WHERE IsActive = 1 AND NormalizedName != ''", ct, warnOnError: true);

        await TryExec(
            "CREATE UNIQUE INDEX IF NOT EXISTS IX_LocationNeighborhoods_NormalizedName_City_Active " +
            "ON LocationNeighborhoods(NormalizedName, City) " +
            "WHERE IsActive = 1 AND NormalizedName != ''", ct, warnOnError: true);

        // Remove old invalid PlanLimits rows with non-hex 'cl' prefix GUIDs.
        await TryExec("DELETE FROM PlanLimits   WHERE Id LIKE 'cl%'", ct);
        await TryExec("DELETE FROM PlanPricings WHERE Id LIKE 'pp%'", ct);

        // Purge orphaned PlanFeature / PlanLimit rows caused by partial old seeds.
        await TryExec(
            "DELETE FROM PlanFeatures WHERE FeatureDefinitionId NOT IN (SELECT Id FROM FeatureDefinitions)", ct);
        await TryExec(
            "DELETE FROM PlanLimits WHERE LimitDefinitionId NOT IN (SELECT Id FROM LimitDefinitions)", ct);
    }

    // ── WAL checkpoint + pool reset (SQLite only) ─────────────────────────────

    private async Task ApplyWalCheckpointAsync(CancellationToken ct)
    {
        try
        {
            await _db.Database.ExecuteSqlRawAsync("PRAGMA wal_checkpoint(FULL)", ct);
            _log.LogInformation("WAL checkpoint completed.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("WAL checkpoint failed (non-fatal): {msg}", ex.Message);
        }

        try
        {
            SqliteConnection.ClearAllPools();
            _log.LogInformation("SQLite connection pool cleared.");
        }
        catch (Exception ex)
        {
            _log.LogWarning("ClearAllPools failed (non-fatal): {msg}", ex.Message);
        }
    }

    // ── Helper methods ────────────────────────────────────────────────────────

    private async Task TryAlter(string table, string column, string definition, CancellationToken ct)
    {
        try
        {
            await _db.Database.ExecuteSqlRawAsync(
                $"ALTER TABLE {table} ADD COLUMN {column} {definition}", ct);
        }
        catch
        {
            // Column already exists — expected on repeated startups.
        }
    }

    private async Task TryExec(string sql, CancellationToken ct, bool warnOnError = false)
    {
        try
        {
            await _db.Database.ExecuteSqlRawAsync(sql, ct);
        }
        catch (Exception ex)
        {
            if (warnOnError)
                _log.LogWarning("Schema patch skipped: {msg}", ex.Message);
        }
    }
}
