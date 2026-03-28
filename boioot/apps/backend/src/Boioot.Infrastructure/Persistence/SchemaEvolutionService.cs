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

        // All ALTER TABLE patches use SQLite DDL syntax (TEXT / INTEGER / REAL types,
        // ADD COLUMN keyword, partial indexes with WHERE).  On SQL Server and other
        // providers, the full schema is created by EF Core Migrations — no patching needed.
        if (!_isSqlite)
        {
            _log.LogInformation("Non-SQLite provider detected — skipping legacy schema patches (handled by EF migrations).");
            return;
        }

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
        await ApplyPlanNamingPatchesAsync(ct);
        await ApplyPlanFeaturePatchesAsync(ct);
        await ApplyUserTagsPatchesAsync(ct);
        await ApplyVerificationRequestsPatchesAsync(ct);
        await ApplyMonetizationPhase1PatchesAsync(ct);
        await ApplySubscriptionRequestActionsPatchesAsync(ct);

        await ApplySqliteIndexPatchesAsync(ct);
        await ApplyWalCheckpointAsync(ct);

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
        await TryAlter("Users", "LastLoginAt",        "TEXT",                        ct);

        // User-level identity verification (admin-controlled, all user types)
        await TryAlter("Users", "IsVerified",         "INTEGER NOT NULL DEFAULT 0",  ct);
        await TryAlter("Users", "VerifiedAt",         "TEXT",                        ct);
        await TryAlter("Users", "VerifiedBy",         "TEXT",                        ct);

        // Multi-level verification (Phase 2)
        await TryAlter("Users", "VerificationStatus",         "TEXT NOT NULL DEFAULT 'None'", ct);
        await TryAlter("Users", "VerificationLevel",          "INTEGER NOT NULL DEFAULT 0",   ct);
        await TryAlter("Users", "PhoneVerified",              "INTEGER NOT NULL DEFAULT 0",   ct);
        await TryAlter("Users", "EmailVerified",              "INTEGER NOT NULL DEFAULT 0",   ct);
        await TryAlter("Users", "IdentityVerificationStatus", "TEXT NOT NULL DEFAULT 'None'", ct);
        await TryAlter("Users", "BusinessVerificationStatus", "TEXT NOT NULL DEFAULT 'None'", ct);
        await TryAlter("Users", "VerificationBadge",          "TEXT",                         ct);
        await TryAlter("Users", "VerificationNotes",          "TEXT",                         ct);
        await TryAlter("Users", "RejectionReason",            "TEXT",                         ct);

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

        // Normalize all GUID columns in Blog tables to lowercase so that EF Core's
        // GuidToStringConverter (which always writes lowercase) can JOIN correctly.
        // SQLite string comparison is case-sensitive, so uppercase GUIDs from older inserts
        // would silently fail the INNER JOIN between BlogPosts.CreatedByUserId and Users.Id.
        // Step 1: normalize non-PK GUID columns in BlogPosts first (no FK concerns).
        await TryExec(
            "UPDATE BlogPosts SET " +
            "CreatedByUserId = LOWER(CreatedByUserId), " +
            "UpdatedByUserId = CASE WHEN UpdatedByUserId IS NULL THEN NULL ELSE LOWER(UpdatedByUserId) END, " +
            "PublishedByUserId = CASE WHEN PublishedByUserId IS NULL THEN NULL ELSE LOWER(PublishedByUserId) END " +
            "WHERE CreatedByUserId != LOWER(CreatedByUserId)",
            ct, warnOnError: true);

        // Step 2: disable FK enforcement, update PKs, re-enable.
        await TryExec("PRAGMA foreign_keys = OFF", ct, warnOnError: true);

        await TryExec(
            "UPDATE BlogPostCategories SET " +
            "BlogCategoryId = LOWER(BlogCategoryId) " +
            "WHERE BlogCategoryId != LOWER(BlogCategoryId)",
            ct, warnOnError: true);

        await TryExec(
            "UPDATE BlogCategories SET Id = LOWER(Id) WHERE Id != LOWER(Id)",
            ct, warnOnError: true);

        await TryExec(
            "UPDATE BlogPostCategories SET " +
            "BlogPostId = LOWER(BlogPostId) " +
            "WHERE BlogPostId != LOWER(BlogPostId)",
            ct, warnOnError: true);

        await TryExec(
            "UPDATE BlogPosts SET Id = LOWER(Id) WHERE Id != LOWER(Id)",
            ct, warnOnError: true);

        await TryExec("PRAGMA foreign_keys = ON", ct, warnOnError: true);
    }

    private async Task ApplyAccountPatchesAsync(CancellationToken ct)
    {
        await TryExec("DROP INDEX IF EXISTS ix_accounts_owneruserid", ct);
        await TryAlter("Accounts", "CreatedByUserId",     "TEXT NOT NULL DEFAULT ''", ct);
        await TryAlter("Accounts", "PrimaryAdminUserId",  "TEXT",                    ct);

        await TryAlter("AccountUsers", "OrganizationUserRole", "TEXT NOT NULL DEFAULT 'Agent'", ct);
        await TryAlter("AccountUsers", "IsPrimary",            "INTEGER NOT NULL DEFAULT 0",    ct);
        await TryAlter("AccountUsers", "IsActive",             "INTEGER NOT NULL DEFAULT 1",    ct);

        // DATA CORRECTION: Fix Office accounts that were assigned AccountType='Company'
        // before the AuthService bug-fix (CompanyOwner+RealEstateOffice must be 'Office').
        // Idempotent: only updates rows where AccountType is still wrong.
        await TryExec(@"
            UPDATE Accounts
            SET    AccountType = 'Office'
            WHERE  AccountType = 'Company'
            AND    Id IN (
                SELECT a.Id
                FROM   Accounts       a
                JOIN   Companies      co ON co.Id = a.Id
                WHERE  co.CompanyType = 'RealEstateOffice'
            )", ct, warnOnError: true);
    }

    private async Task ApplySubscriptionPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Subscriptions", "IsActive",                "INTEGER NOT NULL DEFAULT 1", ct);
        await TryAlter("Subscriptions", "PricingId",               "TEXT",                       ct);
        await TryAlter("Subscriptions", "AutoRenew",               "INTEGER NOT NULL DEFAULT 1", ct);
        // Phase 3A lifecycle fields
        await TryAlter("Subscriptions", "Status",                  "TEXT NOT NULL DEFAULT 'Active'", ct);
        await TryAlter("Subscriptions", "TrialEndsAt",             "TEXT",                           ct);
        await TryAlter("Subscriptions", "CurrentPeriodStart",      "TEXT",                           ct);
        await TryAlter("Subscriptions", "CurrentPeriodEnd",        "TEXT",                           ct);
        await TryAlter("Subscriptions", "CanceledAt",              "TEXT",                           ct);
        await TryAlter("Subscriptions", "EndedAt",                 "TEXT",                           ct);
        await TryAlter("Subscriptions", "ExternalProvider",        "TEXT",                           ct);
        await TryAlter("Subscriptions", "ExternalSubscriptionId",  "TEXT",                           ct);
        // Phase 4: consumption tracking for one_time_fixed_term plans
        await TryAlter("Subscriptions", "ListingQuotaUsed",        "INTEGER NOT NULL DEFAULT 0",     ct);

        // SubscriptionHistory table (Phase 3A audit log)
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS ""SubscriptionHistories"" (
                ""Id""              TEXT NOT NULL PRIMARY KEY,
                ""SubscriptionId""  TEXT NOT NULL,
                ""EventType""       TEXT NOT NULL,
                ""OldPlanId""       TEXT,
                ""NewPlanId""       TEXT,
                ""Notes""           TEXT,
                ""CreatedByUserId"" TEXT,
                ""CreatedAtUtc""    TEXT NOT NULL
            )", ct);
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

        // ── Hybrid billing model (Phase 4) ────────────────────────────────────
        await TryAlter("Plans", "PlanBillingType",   "TEXT NOT NULL DEFAULT 'recurring'",                       ct);
        await TryAlter("Plans", "RecurringCycle",    "TEXT",                                                     ct);
        await TryAlter("Plans", "DurationDays",      "INTEGER",                                                  ct);
        await TryAlter("Plans", "ConsumptionPolicy", "TEXT NOT NULL DEFAULT 'none'",                             ct);
        await TryAlter("Plans", "ExpiryRule",        "TEXT NOT NULL DEFAULT 'expire_by_date'",                   ct);
        await TryAlter("Plans", "DowngradePlanCode", "TEXT",                                                     ct);

        await TryAlter("Plans", "AllowRepurchaseOnConsumption",  "INTEGER NOT NULL DEFAULT 0", ct);
        await TryAlter("Plans", "AllowEarlyRenewalOnConsumption","INTEGER NOT NULL DEFAULT 0", ct);

        // Backfill: mark existing free-tier plans as free_default (by Tier only — avoids missing-column risk)
        await TryExec(
            "UPDATE Plans SET PlanBillingType = 'free_default' " +
            "WHERE Tier = 'free' " +
            "AND PlanBillingType = 'recurring'",
            ct, warnOnError: true);
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
        await TryAlter("FeatureDefinitions", "Icon",      "TEXT",                              ct);
        await TryAlter("FeatureDefinitions", "Type",      "TEXT NOT NULL DEFAULT 'boolean'",   ct);
        await TryAlter("FeatureDefinitions", "Scope",     "TEXT NOT NULL DEFAULT 'system'",    ct);
        await TryAlter("FeatureDefinitions", "IsSystem",  "INTEGER NOT NULL DEFAULT 0",        ct);
        await TryAlter("FeatureDefinitions", "SortOrder", "INTEGER NOT NULL DEFAULT 0",        ct);
    }

    private async Task ApplyPlanNamingPatchesAsync(CancellationToken ct)
    {
        await TryAlter("Plans", "DisplayNameAr", "TEXT",                                       ct);
        await TryAlter("Plans", "DisplayNameEn", "TEXT",                                       ct);
        await TryAlter("Plans", "AudienceType",  "TEXT",                                       ct);
        await TryAlter("Plans", "Tier",          "TEXT",                                       ct);
    }

    private async Task ApplyPlanFeaturePatchesAsync(CancellationToken ct)
    {
        // Rename PlanId → SubscriptionPlanId if the table was created with the old column name.
        await TryExec("ALTER TABLE PlanFeatures RENAME COLUMN PlanId TO SubscriptionPlanId", ct);

        // Drop stale indexes that referenced the old column name.
        await TryExec("DROP INDEX IF EXISTS ix_planfeatures_plan_feature", ct);
        await TryExec("DROP INDEX IF EXISTS ix_planfeatures_planid", ct);

        // Phase 3A hardening: access policy on feature definitions.
        await TryAlter("FeatureDefinitions", "AccessPolicy", "TEXT", ct);

        // Set "admin_only" for features that are granted by admin, not by subscription plan.
        await TryExec(
            "UPDATE FeatureDefinitions SET AccessPolicy = 'admin_only' " +
            "WHERE \"Key\" IN ('verified_badge', 'homepage_exposure') AND (AccessPolicy IS NULL OR AccessPolicy = '')",
            ct);
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

    // ── SubscriptionRequestActions table ─────────────────────────────────────

    private async Task ApplySubscriptionRequestActionsPatchesAsync(CancellationToken ct)
    {
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS ""SubscriptionRequestActions"" (
                ""Id""                TEXT NOT NULL PRIMARY KEY,
                ""RequestId""         TEXT NOT NULL,
                ""ActionType""        TEXT NOT NULL DEFAULT '',
                ""Decision""          TEXT NOT NULL DEFAULT '',
                ""Title""             TEXT NOT NULL DEFAULT '',
                ""Note""              TEXT NOT NULL DEFAULT '',
                ""SentInternally""    INTEGER NOT NULL DEFAULT 0,
                ""SentByEmail""       INTEGER NOT NULL DEFAULT 0,
                ""EmailFailed""       INTEGER NOT NULL DEFAULT 0,
                ""PerformedByUserId"" TEXT NOT NULL,
                ""CreatedAt""         TEXT NOT NULL,
                ""UpdatedAt""         TEXT NOT NULL
            )", ct);

        await TryExec(
            @"CREATE INDEX IF NOT EXISTS IX_SubscriptionRequestActions_RequestId
              ON ""SubscriptionRequestActions""(""RequestId"")", ct, warnOnError: true);
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

    private async Task ApplyUserTagsPatchesAsync(CancellationToken ct)
    {
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS UserTags (
                Id          TEXT NOT NULL PRIMARY KEY,
                UserId      TEXT NOT NULL,
                Tag         TEXT NOT NULL,
                CreatedAt   TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (UserId) REFERENCES Users(Id)
            )", ct, warnOnError: true);

        await TryExec("CREATE INDEX IF NOT EXISTS IX_UserTags_UserId ON UserTags(UserId)", ct, warnOnError: true);
        await TryExec("CREATE UNIQUE INDEX IF NOT EXISTS IX_UserTags_User_Tag ON UserTags(UserId, Tag)", ct, warnOnError: true);
    }

    private async Task ApplyVerificationRequestsPatchesAsync(CancellationToken ct)
    {
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS ""VerificationRequests"" (
                ""Id""               TEXT NOT NULL PRIMARY KEY,
                ""UserId""           TEXT NOT NULL,
                ""VerificationType"" TEXT NOT NULL DEFAULT 'Identity',
                ""Status""           TEXT NOT NULL DEFAULT 'Draft',
                ""SubmittedAt""      TEXT,
                ""ReviewedAt""       TEXT,
                ""ReviewedBy""       TEXT,
                ""UserNotes""        TEXT,
                ""AdminNotes""       TEXT,
                ""RejectionReason""  TEXT,
                ""CreatedAt""        TEXT NOT NULL DEFAULT (datetime('now')),
                ""UpdatedAt""        TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (""UserId"") REFERENCES ""Users""(""Id"")
            )", ct, warnOnError: true);

        await TryExec(@"CREATE INDEX IF NOT EXISTS IX_VerificationRequests_UserId
            ON ""VerificationRequests""(""UserId"")", ct, warnOnError: true);
        await TryExec(@"CREATE INDEX IF NOT EXISTS IX_VerificationRequests_Status
            ON ""VerificationRequests""(""Status"")", ct, warnOnError: true);

        await TryExec(@"
            CREATE TABLE IF NOT EXISTS ""VerificationDocuments"" (
                ""Id""                      TEXT NOT NULL PRIMARY KEY,
                ""VerificationRequestId""   TEXT NOT NULL,
                ""DocumentType""            TEXT NOT NULL DEFAULT 'Other',
                ""FileName""                TEXT NOT NULL DEFAULT '',
                ""FileUrl""                 TEXT NOT NULL DEFAULT '',
                ""MimeType""                TEXT,
                ""Status""                  TEXT NOT NULL DEFAULT 'Pending',
                ""Notes""                   TEXT,
                ""CreatedAt""               TEXT NOT NULL DEFAULT (datetime('now')),
                ""UpdatedAt""               TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (""VerificationRequestId"") REFERENCES ""VerificationRequests""(""Id"")
            )", ct, warnOnError: true);

        await TryExec(@"CREATE INDEX IF NOT EXISTS IX_VerificationDocuments_RequestId
            ON ""VerificationDocuments""(""VerificationRequestId"")", ct, warnOnError: true);
    }

    // ── Monetization Phase 1 (Lead Unlock table + correct office plan limits) ──

    private async Task ApplyMonetizationPhase1PatchesAsync(CancellationToken ct)
    {
        // Create LeadUnlocks table (idempotent — CREATE TABLE IF NOT EXISTS)
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS LeadUnlocks (
                Id                TEXT NOT NULL PRIMARY KEY,
                UnlockerAccountId TEXT NOT NULL,
                PropertyId        TEXT NOT NULL,
                UnlockType        TEXT NOT NULL DEFAULT 'PerLead',
                UnlockedAt        TEXT NOT NULL DEFAULT (datetime('now')),
                ExpiresAt         TEXT,
                PricePaid         REAL,
                CreatedAt         TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (PropertyId) REFERENCES Properties(Id)
            )", ct, warnOnError: true);

        await TryExec(@"CREATE INDEX IF NOT EXISTS IX_LeadUnlocks_UnlockerAccountId
            ON LeadUnlocks(UnlockerAccountId)", ct, warnOnError: true);
        await TryExec(@"CREATE INDEX IF NOT EXISTS IX_LeadUnlocks_PropertyId
            ON LeadUnlocks(PropertyId)", ct, warnOnError: true);
        await TryExec(@"CREATE INDEX IF NOT EXISTS IX_LeadUnlocks_Account_Month
            ON LeadUnlocks(UnlockerAccountId, UnlockedAt)", ct, warnOnError: true);

        // ── Correct office_free (00000008) limits to Phase 1 target values ──────
        // Previously seeded as 100 listings / 20 agents; corrected to 3 / 1.
        await TryExec(@"
            UPDATE PlanLimits
            SET Value = 3
            WHERE SubscriptionPlanId = '00000008-0000-0000-0000-000000000000'
              AND LimitDefinitionId  = 'add00001-0000-0000-0000-000000000000'",
            ct, warnOnError: true);

        await TryExec(@"
            UPDATE PlanLimits
            SET Value = 1
            WHERE SubscriptionPlanId = '00000008-0000-0000-0000-000000000000'
              AND LimitDefinitionId  = 'add00002-0000-0000-0000-000000000000'",
            ct, warnOnError: true);

        // ── Correct office_basic (00000009) limits ────────────────────────────
        // Previously seeded as -1 (unlimited); corrected to 20 / 5.
        await TryExec(@"
            UPDATE PlanLimits
            SET Value = 20
            WHERE SubscriptionPlanId = '00000009-0000-0000-0000-000000000000'
              AND LimitDefinitionId  = 'add00001-0000-0000-0000-000000000000'",
            ct, warnOnError: true);

        await TryExec(@"
            UPDATE PlanLimits
            SET Value = 5
            WHERE SubscriptionPlanId = '00000009-0000-0000-0000-000000000000'
              AND LimitDefinitionId  = 'add00002-0000-0000-0000-000000000000'",
            ct, warnOnError: true);

        // ── Threaded comments: add ParentCommentId to BuyerRequestComments ────
        await TryAlter("BuyerRequestComments", "ParentCommentId", "TEXT", ct);

        // ── SpecialRequests ────────────────────────────────────────────────────
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS SpecialRequests (
                Id               TEXT NOT NULL PRIMARY KEY,
                PublicCode       TEXT NOT NULL DEFAULT '',
                CreatedByUserId  TEXT,
                FullName         TEXT NOT NULL DEFAULT '',
                Phone            TEXT NOT NULL DEFAULT '',
                WhatsApp         TEXT,
                Email            TEXT,
                Message          TEXT NOT NULL DEFAULT '',
                Status           TEXT NOT NULL DEFAULT 'New',
                Source           TEXT,
                AssignedToUserId TEXT,
                NotesInternal    TEXT,
                ClosedAt         TEXT,
                CreatedAt        TEXT NOT NULL DEFAULT (datetime('now')),
                UpdatedAt        TEXT NOT NULL DEFAULT (datetime('now')),
                FOREIGN KEY (CreatedByUserId)  REFERENCES Users(Id) ON DELETE SET NULL,
                FOREIGN KEY (AssignedToUserId) REFERENCES Users(Id) ON DELETE SET NULL
            )", ct);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_SpecialRequests_Status ON SpecialRequests(Status)", ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_SpecialRequests_CreatedAt ON SpecialRequests(CreatedAt DESC)", ct, warnOnError: true);

        // ── SpecialRequests: add RequestType + Attachments columns ────────────
        await TryAlter("SpecialRequests", "RequestType",  "TEXT", ct);
        await TryAlter("SpecialRequests", "Attachments",  "TEXT", ct);

        // ── SpecialRequestTypes ────────────────────────────────────────────────
        await TryExec(@"
            CREATE TABLE IF NOT EXISTS SpecialRequestTypes (
                Id        TEXT NOT NULL PRIMARY KEY,
                Label     TEXT NOT NULL DEFAULT '',
                Value     TEXT NOT NULL DEFAULT '',
                SortOrder INTEGER NOT NULL DEFAULT 0,
                IsActive  INTEGER NOT NULL DEFAULT 1,
                CreatedAt TEXT NOT NULL DEFAULT (datetime('now')),
                UpdatedAt TEXT NOT NULL DEFAULT (datetime('now'))
            )", ct);

        // Seed default types if the table is empty
        await TryExec(@"
            INSERT OR IGNORE INTO SpecialRequestTypes (Id, Label, Value, SortOrder, IsActive)
            VALUES
              ('00000100-0000-0000-0000-000000000001', 'شراء عقار',     'buy',     1, 1),
              ('00000100-0000-0000-0000-000000000002', 'بيع عقار',      'sell',    2, 1),
              ('00000100-0000-0000-0000-000000000003', 'استثمار',       'invest',  3, 1),
              ('00000100-0000-0000-0000-000000000004', 'خدمات خاصة',   'special', 4, 1),
              ('00000100-0000-0000-0000-000000000005', 'خدمات قانونية','legal',   5, 1)
        ", ct);

        // ── Properties table performance indexes ──────────────────────────────
        // These indexes cover the most common WHERE and ORDER BY clauses used
        // across public listing pages, dashboard analytics, and admin views.
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_Status      ON Properties(Status)",                         ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_City        ON Properties(City)",                           ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_ListingType ON Properties(ListingType)",                    ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_CreatedAt   ON Properties(CreatedAt DESC)",                 ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_IsDeleted   ON Properties(IsDeleted)",                     ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_OwnerId     ON Properties(OwnerId)",                       ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_CompanyId   ON Properties(CompanyId)",                     ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_AccountId   ON Properties(AccountId)",                     ct, warnOnError: true);
        // Composite: public listing page (status + isDeleted + createdAt is the most common filter)
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_Status_IsDeleted_CreatedAt ON Properties(Status, IsDeleted, CreatedAt DESC)", ct, warnOnError: true);
        await TryExec("CREATE INDEX IF NOT EXISTS IX_Properties_City_Status ON Properties(City, Status)",                  ct, warnOnError: true);
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
