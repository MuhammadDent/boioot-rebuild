using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Persistence.Seeding;

/// <summary>
/// Seeds the subscription catalog: Plans, FeatureDefinitions, LimitDefinitions,
/// PlanFeatures, PlanLimits, PlanPricings, and BlogSeoSettings.
///
/// All seeding uses EF Core (AddRange + SaveChanges with check-first) instead
/// of INSERT OR IGNORE.  UPDATE corrections use parameterized SQL which is
/// provider-portable.  Each seed block is idempotent.
/// </summary>
public sealed class PlanCatalogSeeder
{
    private readonly BoiootDbContext _ctx;
    private readonly ILogger<PlanCatalogSeeder> _log;

    public PlanCatalogSeeder(BoiootDbContext ctx, ILogger<PlanCatalogSeeder> log)
    {
        _ctx = ctx;
        _log = log;
    }

    public async Task SeedAsync(CancellationToken ct = default)
    {
        await SeedPlansAsync(ct);
        await SeedFeatureDefinitionsAsync(ct);
        await SeedLimitDefinitionsAsync(ct);
        await SeedPlanFeaturesAsync(ct);
        await SeedPlanLimitsAsync(ct);
        await SeedPlanPricingsAsync(ct);
        await ApplyPlanCorrectionsAsync(ct);
        await SeedBlogSeoSettingsAsync(ct);
    }

    // ── Plans ─────────────────────────────────────────────────────────────────

    private async Task SeedPlansAsync(CancellationToken ct)
    {
        var existingIds = (await _ctx.Plans
            .IgnoreQueryFilters()
            .Select(p => p.Id)
            .ToListAsync(ct)).ToHashSet();

        var allPlans = BuildPlanCatalog();
        var newPlans = allPlans.Where(p => !existingIds.Contains(p.Id)).ToList();

        if (newPlans.Count > 0)
        {
            _ctx.Plans.AddRange(newPlans);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new plans.", newPlans.Count);
        }
        else
        {
            _log.LogDebug("All plans already exist — skipping plan insert.");
        }
    }

    private static List<Plan> BuildPlanCatalog()
    {
        static Plan P(string id, string name, string code,
            int listing, int project, int agent, int featured,
            decimal monthly, decimal yearly,
            string? accountType, string category, int rank, int order,
            bool isRecommended = false) =>
            new()
            {
                Id                    = Guid.Parse(id),
                Name                  = name,
                Code                  = code,
                ListingLimit          = listing,
                ProjectLimit          = project,
                AgentLimit            = agent,
                FeaturedSlots         = featured,
                BasePriceMonthly      = monthly,
                BasePriceYearly       = yearly,
                IsActive              = true,
                BillingMode           = "InternalOnly",
                Rank                  = rank,
                DisplayOrder          = order,
                IsPublic              = true,
                IsRecommended         = isRecommended,
                ApplicableAccountType = accountType == null ? null : Enum.TryParse<AccountType>(accountType, out var at) ? at : null,
                PlanCategory          = category,
            };

        return new List<Plan>
        {
            // ── Individual plans (01–04) ──────────────────────────────────────
            P("00000001-0000-0000-0000-000000000000", "Free",            "free_user",          2,  0,  0,  0,     0,     0, "Individual", "Individual",  0,  1),
            P("00000002-0000-0000-0000-000000000000", "Silver",          "silver",             5,  0,  3,  1,  1500, 15000, "Individual", "Individual",  1,  2),
            P("00000003-0000-0000-0000-000000000000", "Gold",            "gold",              20,  2, 10,  5,  3500, 35000, "Individual", "Individual",  2,  3),
            P("00000004-0000-0000-0000-000000000000", "Platinum",        "platinum",          -1, -1, -1, 20,  7000, 70000, "Individual", "Individual",  3,  4),
            // ── Business plans (05–09) ────────────────────────────────────────
            P("00000005-0000-0000-0000-000000000000", "OwnerPro",        "owner_pro",          5,  0,  0,  0,  1000,  9000, "Individual", "Business",   10,  0),
            P("00000006-0000-0000-0000-000000000000", "BrokerPro",       "broker_pro",        20,  0,  3,  2,  2500, 22000, "Individual", "Business",   11,  1),
            P("00000007-0000-0000-0000-000000000000", "BrokerPremium",   "broker_premium",    50,  5, 10,  5,  5000, 44000, "Individual", "Business",   12,  2),
            P("00000008-0000-0000-0000-000000000000", "OfficeStarter",   "office_starter",   100, 10, 20, 10, 10000, 88000, "Office",     "Business",   13,  3),
            P("00000009-0000-0000-0000-000000000000", "OfficeGrowth",    "office_growth",     -1, -1, -1, 20, 20000,176000, "Office",     "Business",   14,  4),
            // ── Developer plans (0a–0b) ───────────────────────────────────────
            P("0000000a-0000-0000-0000-000000000000", "DeveloperBusiness","developer_business",50,  5, 10, 10, 15000,130000, "Company",    "Business",   15, 15),
            P("0000000b-0000-0000-0000-000000000000", "DeveloperPremium", "developer_premium", -1, -1, -1, 30, 30000,260000, "Company",    "Business",   16, 16, isRecommended: true),
        };
    }

    // ── FeatureDefinitions ────────────────────────────────────────────────────

    private async Task SeedFeatureDefinitionsAsync(CancellationToken ct)
    {
        var existing = (await _ctx.FeatureDefinitions
            .Select(f => f.Key)
            .ToListAsync(ct)).ToHashSet();

        var catalog = new[]
        {
            FD("fd000001-0000-0000-0000-000000000000", "analytics_dashboard", "لوحة التحليلات",         "وصول إلى إحصائيات وأداء الإعلانات",               "business",      "📊"),
            FD("fd000002-0000-0000-0000-000000000000", "priority_support",    "دعم ذو أولوية",          "أولوية الوصول لفريق الدعم الفني",                 "support",       "🛠"),
            FD("fd000003-0000-0000-0000-000000000000", "featured_listings",   "إعلانات مميزة",          "إبراز الإعلانات في نتائج البحث",                  "marketing",     "⭐"),
            FD("fd000004-0000-0000-0000-000000000000", "project_management",  "إدارة المشاريع",         "أدوات إنشاء وإدارة المشاريع العقارية والوحدات",    "business",      "🏗"),
            FD("fd000005-0000-0000-0000-000000000000", "video_upload",        "رفع الفيديو",            "إمكانية رفع فيديو للإعلان",                       "content",       "🎥"),
            FD("fd000006-0000-0000-0000-000000000000", "multiple_photos",     "صور متعددة للإعلان",     "رفع أكثر من صورة للإعلان الواحد",                  "content",       "📸"),
            FD("fd000007-0000-0000-0000-000000000000", "whatsapp_contact",    "تواصل عبر واتساب",       "إظهار زر واتساب في صفحة الإعلان",                  "communication", "💬"),
            FD("fd000008-0000-0000-0000-000000000000", "verified_badge",      "شارة التحقق",            "عرض علامة التحقق على الملف الشخصي والإعلانات",     "marketing",     "✅"),
            FD("fd000009-0000-0000-0000-000000000000", "homepage_exposure",   "ظهور في الصفحة الرئيسية","عرض الإعلانات ضمن قسم مميز في الصفحة الرئيسية",   "marketing",     "🏠"),
        };

        var newFDs = catalog.Where(f => !existing.Contains(f.Key)).ToList();
        if (newFDs.Count > 0)
        {
            _ctx.FeatureDefinitions.AddRange(newFDs);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new FeatureDefinitions.", newFDs.Count);
        }

        // Apply group + icon corrections (idempotent — runs every startup).
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE FeatureDefinitions SET FeatureGroup = 'marketing'     WHERE Key IN ('featured_listings', 'verified_badge', 'homepage_exposure');
            UPDATE FeatureDefinitions SET FeatureGroup = 'content'       WHERE Key IN ('video_upload', 'multiple_photos');
            UPDATE FeatureDefinitions SET FeatureGroup = 'business'      WHERE Key IN ('analytics_dashboard', 'project_management');
            UPDATE FeatureDefinitions SET FeatureGroup = 'communication' WHERE Key = 'whatsapp_contact';
            UPDATE FeatureDefinitions SET FeatureGroup = 'support'       WHERE Key = 'priority_support'", ct);

        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE FeatureDefinitions SET Icon = '📊' WHERE Key = 'analytics_dashboard';
            UPDATE FeatureDefinitions SET Icon = '🛠' WHERE Key = 'priority_support';
            UPDATE FeatureDefinitions SET Icon = '⭐' WHERE Key = 'featured_listings';
            UPDATE FeatureDefinitions SET Icon = '🏗' WHERE Key = 'project_management';
            UPDATE FeatureDefinitions SET Icon = '🎥' WHERE Key = 'video_upload';
            UPDATE FeatureDefinitions SET Icon = '📸' WHERE Key = 'multiple_photos';
            UPDATE FeatureDefinitions SET Icon = '💬' WHERE Key = 'whatsapp_contact';
            UPDATE FeatureDefinitions SET Icon = '✅' WHERE Key = 'verified_badge';
            UPDATE FeatureDefinitions SET Icon = '🏠' WHERE Key = 'homepage_exposure'", ct);
    }

    private static FeatureDefinition FD(string id, string key, string name,
        string? description, string group, string icon) => new()
    {
        Id           = Guid.Parse(id),
        Key          = key,
        Name         = name,
        Description  = description,
        FeatureGroup = group,
        Icon         = icon,
        IsActive     = true,
    };

    // ── LimitDefinitions ──────────────────────────────────────────────────────

    private async Task SeedLimitDefinitionsAsync(CancellationToken ct)
    {
        var existing = (await _ctx.LimitDefinitions
            .Select(l => l.Key)
            .ToListAsync(ct)).ToHashSet();

        var catalog = new[]
        {
            LD("add00001-0000-0000-0000-000000000000", "max_active_listings",  "الحد الأقصى للإعلانات النشطة",  "عدد الإعلانات المسموح بها في نفس الوقت",                "إعلان", "integer", "account"),
            LD("add00002-0000-0000-0000-000000000000", "max_agents",           "الحد الأقصى للوكلاء",           "عدد الوكلاء المسموح بهم في الحساب",                      "وكيل",  "integer", "account"),
            LD("add00003-0000-0000-0000-000000000000", "max_projects",         "الحد الأقصى للمشاريع",          "عدد المشاريع العقارية المسموح بها",                       "مشروع", "integer", "account"),
            LD("add00004-0000-0000-0000-000000000000", "max_project_units",    "الحد الأقصى لوحدات المشروع",    "إجمالي الوحدات العقارية المسموح بها عبر جميع المشاريع",  "وحدة",  "integer", "account"),
            LD("add00005-0000-0000-0000-000000000000", "max_images_per_listing","الحد الأقصى للصور لكل إعلان",  "عدد الصور المسموح برفعها في الإعلان الواحد",             "صورة",  "integer", "listing"),
            LD("add00006-0000-0000-0000-000000000000", "max_featured_slots",   "الإعلانات المميزة المتاحة",      "عدد الإعلانات المميزة المسموح بها في نفس الوقت",          "إعلان", "integer", "account"),
        };

        var newLDs = catalog.Where(l => !existing.Contains(l.Key)).ToList();
        if (newLDs.Count > 0)
        {
            _ctx.LimitDefinitions.AddRange(newLDs);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new LimitDefinitions.", newLDs.Count);
        }
    }

    private static LimitDefinition LD(string id, string key, string name,
        string? description, string unit, string valueType, string scope) => new()
    {
        Id             = Guid.Parse(id),
        Key            = key,
        Name           = name,
        Description    = description,
        Unit           = unit,
        ValueType      = valueType,
        AppliesToScope = scope,
        IsActive       = true,
    };

    // ── PlanFeatures ──────────────────────────────────────────────────────────

    private async Task SeedPlanFeaturesAsync(CancellationToken ct)
    {
        var existingIds = (await _ctx.PlanFeatures
            .Select(pf => pf.Id)
            .ToListAsync(ct)).ToHashSet();

        var catalog = BuildPlanFeatureCatalog();
        var newPFs = catalog.Where(pf => !existingIds.Contains(pf.Id)).ToList();

        if (newPFs.Count > 0)
        {
            _ctx.PlanFeatures.AddRange(newPFs);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new PlanFeatures.", newPFs.Count);
        }

        // Apply IsEnabled corrections (idempotent).
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE PlanFeatures SET IsEnabled = 1 WHERE Id = 'ce000001-0000-0000-0000-000000000000';
            UPDATE PlanFeatures SET IsEnabled = 1 WHERE Id = 'ce000004-0000-0000-0000-000000000000';
            UPDATE PlanFeatures SET IsEnabled = 0 WHERE Id = 'ce000006-0000-0000-0000-000000000000'", ct);
    }

    private static List<PlanFeature> BuildPlanFeatureCatalog()
    {
        static PlanFeature PF(string id, string planId, string fdId, bool enabled) => new()
        {
            Id                  = Guid.Parse(id),
            SubscriptionPlanId  = Guid.Parse(planId),
            FeatureDefinitionId = Guid.Parse(fdId),
            IsEnabled           = enabled,
        };

        const string fd1 = "fd000001-0000-0000-0000-000000000000"; // analytics_dashboard
        const string fd2 = "fd000002-0000-0000-0000-000000000000"; // priority_support
        const string fd3 = "fd000003-0000-0000-0000-000000000000"; // featured_listings
        const string fd4 = "fd000004-0000-0000-0000-000000000000"; // project_management
        const string fd5 = "fd000005-0000-0000-0000-000000000000"; // video_upload
        const string fd6 = "fd000006-0000-0000-0000-000000000000"; // multiple_photos
        const string fd7 = "fd000007-0000-0000-0000-000000000000"; // whatsapp_contact
        const string fd8 = "fd000008-0000-0000-0000-000000000000"; // verified_badge
        const string fd9 = "fd000009-0000-0000-0000-000000000000"; // homepage_exposure

        const string p01 = "00000001-0000-0000-0000-000000000000"; // Free
        const string p02 = "00000002-0000-0000-0000-000000000000"; // Silver
        const string p03 = "00000003-0000-0000-0000-000000000000"; // Gold
        const string p04 = "00000004-0000-0000-0000-000000000000"; // Platinum
        const string p05 = "00000005-0000-0000-0000-000000000000"; // OwnerPro
        const string p06 = "00000006-0000-0000-0000-000000000000"; // BrokerPro
        const string p07 = "00000007-0000-0000-0000-000000000000"; // BrokerPremium
        const string p08 = "00000008-0000-0000-0000-000000000000"; // OfficeStarter
        const string p09 = "00000009-0000-0000-0000-000000000000"; // OfficeGrowth
        const string p0a = "0000000a-0000-0000-0000-000000000000"; // DeveloperBusiness
        const string p0b = "0000000b-0000-0000-0000-000000000000"; // DeveloperPremium

        return new List<PlanFeature>
        {
            // ── Plans 05–09 (ce000001–ce00001f) ─────────────────────────────
            PF("ce000001-0000-0000-0000-000000000000", p05, fd1, true),
            PF("ce000002-0000-0000-0000-000000000000", p05, fd2, false),
            PF("ce000003-0000-0000-0000-000000000000", p05, fd3, false),
            PF("ce000004-0000-0000-0000-000000000000", p06, fd1, true),
            PF("ce000005-0000-0000-0000-000000000000", p06, fd2, false),
            PF("ce000006-0000-0000-0000-000000000000", p06, fd3, false),
            PF("ce000007-0000-0000-0000-000000000000", p07, fd1, true),
            PF("ce000008-0000-0000-0000-000000000000", p07, fd2, false),
            PF("ce000009-0000-0000-0000-000000000000", p07, fd3, true),
            PF("ce00000a-0000-0000-0000-000000000000", p08, fd1, true),
            PF("ce00000b-0000-0000-0000-000000000000", p08, fd2, true),
            PF("ce00000c-0000-0000-0000-000000000000", p08, fd3, true),
            PF("ce00000d-0000-0000-0000-000000000000", p09, fd1, true),
            PF("ce00000e-0000-0000-0000-000000000000", p09, fd2, true),
            PF("ce00000f-0000-0000-0000-000000000000", p09, fd3, true),
            // ── Plans 0a–0b (ce000010–ce000017) ─────────────────────────────
            PF("ce000010-0000-0000-0000-000000000000", p0a, fd1, true),
            PF("ce000011-0000-0000-0000-000000000000", p0a, fd2, false),
            PF("ce000012-0000-0000-0000-000000000000", p0a, fd3, true),
            PF("ce000013-0000-0000-0000-000000000000", p0a, fd4, true),
            PF("ce000014-0000-0000-0000-000000000000", p0b, fd1, true),
            PF("ce000015-0000-0000-0000-000000000000", p0b, fd2, true),
            PF("ce000016-0000-0000-0000-000000000000", p0b, fd3, true),
            PF("ce000017-0000-0000-0000-000000000000", p0b, fd4, true),
            // ── Plans 08–09: project_management (ce000018–ce000019) ──────────
            PF("ce000018-0000-0000-0000-000000000000", p08, fd4, true),
            PF("ce000019-0000-0000-0000-000000000000", p09, fd4, true),
            // ── Plans 01–04 (cf000001–cf000024) ─────────────────────────────
            // Free (01)
            PF("cf000001-0000-0000-0000-000000000000", p01, fd1, false),
            PF("cf000002-0000-0000-0000-000000000000", p01, fd2, false),
            PF("cf000003-0000-0000-0000-000000000000", p01, fd3, false),
            PF("cf000004-0000-0000-0000-000000000000", p01, fd4, false),
            PF("cf000005-0000-0000-0000-000000000000", p01, fd5, false),
            PF("cf000006-0000-0000-0000-000000000000", p01, fd6, false),
            PF("cf000007-0000-0000-0000-000000000000", p01, fd7, true),
            PF("cf000008-0000-0000-0000-000000000000", p01, fd8, false),
            PF("cf000009-0000-0000-0000-000000000000", p01, fd9, false),
            // Silver (02)
            PF("cf00000a-0000-0000-0000-000000000000", p02, fd1, false),
            PF("cf00000b-0000-0000-0000-000000000000", p02, fd2, false),
            PF("cf00000c-0000-0000-0000-000000000000", p02, fd3, false),
            PF("cf00000d-0000-0000-0000-000000000000", p02, fd4, false),
            PF("cf00000e-0000-0000-0000-000000000000", p02, fd5, false),
            PF("cf00000f-0000-0000-0000-000000000000", p02, fd6, true),
            PF("cf000010-0000-0000-0000-000000000000", p02, fd7, true),
            PF("cf000011-0000-0000-0000-000000000000", p02, fd8, false),
            PF("cf000012-0000-0000-0000-000000000000", p02, fd9, false),
            // Gold (03)
            PF("cf000013-0000-0000-0000-000000000000", p03, fd1, true),
            PF("cf000014-0000-0000-0000-000000000000", p03, fd2, false),
            PF("cf000015-0000-0000-0000-000000000000", p03, fd3, true),
            PF("cf000016-0000-0000-0000-000000000000", p03, fd4, false),
            PF("cf000017-0000-0000-0000-000000000000", p03, fd5, true),
            PF("cf000018-0000-0000-0000-000000000000", p03, fd6, true),
            PF("cf000019-0000-0000-0000-000000000000", p03, fd7, true),
            PF("cf00001a-0000-0000-0000-000000000000", p03, fd8, true),
            PF("cf00001b-0000-0000-0000-000000000000", p03, fd9, false),
            // Platinum (04)
            PF("cf00001c-0000-0000-0000-000000000000", p04, fd1, true),
            PF("cf00001d-0000-0000-0000-000000000000", p04, fd2, true),
            PF("cf00001e-0000-0000-0000-000000000000", p04, fd3, true),
            PF("cf00001f-0000-0000-0000-000000000000", p04, fd4, false),
            PF("cf000020-0000-0000-0000-000000000000", p04, fd5, true),
            PF("cf000021-0000-0000-0000-000000000000", p04, fd6, true),
            PF("cf000022-0000-0000-0000-000000000000", p04, fd7, true),
            PF("cf000023-0000-0000-0000-000000000000", p04, fd8, true),
            PF("cf000024-0000-0000-0000-000000000000", p04, fd9, true),
        };
    }

    // ── PlanLimits ────────────────────────────────────────────────────────────

    private async Task SeedPlanLimitsAsync(CancellationToken ct)
    {
        var existingIds = (await _ctx.PlanLimits
            .Select(pl => pl.Id)
            .ToListAsync(ct)).ToHashSet();

        var catalog = BuildPlanLimitCatalog();
        var newPLs = catalog.Where(pl => !existingIds.Contains(pl.Id)).ToList();

        if (newPLs.Count > 0)
        {
            _ctx.PlanLimits.AddRange(newPLs);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new PlanLimits.", newPLs.Count);
        }
    }

    private static List<PlanLimit> BuildPlanLimitCatalog()
    {
        static PlanLimit PL(string id, string planId, string ldId, decimal value) => new()
        {
            Id                = Guid.Parse(id),
            SubscriptionPlanId = Guid.Parse(planId),
            LimitDefinitionId = Guid.Parse(ldId),
            Value             = value,
        };

        const string ld1 = "add00001-0000-0000-0000-000000000000"; // max_active_listings
        const string ld2 = "add00002-0000-0000-0000-000000000000"; // max_agents
        const string ld3 = "add00003-0000-0000-0000-000000000000"; // max_projects
        const string ld4 = "add00004-0000-0000-0000-000000000000"; // max_project_units
        const string ld5 = "add00005-0000-0000-0000-000000000000"; // max_images_per_listing
        const string ld6 = "add00006-0000-0000-0000-000000000000"; // max_featured_slots

        const string p01 = "00000001-0000-0000-0000-000000000000";
        const string p02 = "00000002-0000-0000-0000-000000000000";
        const string p03 = "00000003-0000-0000-0000-000000000000";
        const string p04 = "00000004-0000-0000-0000-000000000000";
        const string p05 = "00000005-0000-0000-0000-000000000000";
        const string p06 = "00000006-0000-0000-0000-000000000000";
        const string p07 = "00000007-0000-0000-0000-000000000000";
        const string p08 = "00000008-0000-0000-0000-000000000000";
        const string p09 = "00000009-0000-0000-0000-000000000000";
        const string p0a = "0000000a-0000-0000-0000-000000000000";
        const string p0b = "0000000b-0000-0000-0000-000000000000";

        return new List<PlanLimit>
        {
            // ── Plans 05–09 ────────────────────────────────────────────────────
            PL("c1000001-0000-0000-0000-000000000000", p05, ld1,   5),
            PL("c1000002-0000-0000-0000-000000000000", p05, ld2,   0),
            PL("c1000003-0000-0000-0000-000000000000", p05, ld3,   0),
            PL("c1000004-0000-0000-0000-000000000000", p06, ld1,  20),
            PL("c1000005-0000-0000-0000-000000000000", p06, ld2,   3),
            PL("c1000006-0000-0000-0000-000000000000", p06, ld3,   0),
            PL("c1000007-0000-0000-0000-000000000000", p07, ld1,  50),
            PL("c1000008-0000-0000-0000-000000000000", p07, ld2,  10),
            PL("c1000009-0000-0000-0000-000000000000", p07, ld3,   5),
            PL("c100000a-0000-0000-0000-000000000000", p08, ld1, 100),
            PL("c100000b-0000-0000-0000-000000000000", p08, ld2,  20),
            PL("c100000c-0000-0000-0000-000000000000", p08, ld3,  10),
            PL("c100000d-0000-0000-0000-000000000000", p09, ld1,  -1),
            PL("c100000e-0000-0000-0000-000000000000", p09, ld2,  -1),
            PL("c100000f-0000-0000-0000-000000000000", p09, ld3,  -1),
            // ── Plans 0a–0b ────────────────────────────────────────────────────
            PL("c1000010-0000-0000-0000-000000000000", p0a, ld1,  50),
            PL("c1000011-0000-0000-0000-000000000000", p0a, ld2,  10),
            PL("c1000012-0000-0000-0000-000000000000", p0a, ld3,   5),
            PL("c1000013-0000-0000-0000-000000000000", p0a, ld4, 200),
            PL("c1000014-0000-0000-0000-000000000000", p0b, ld1,  -1),
            PL("c1000015-0000-0000-0000-000000000000", p0b, ld2,  -1),
            PL("c1000016-0000-0000-0000-000000000000", p0b, ld3,  -1),
            PL("c1000017-0000-0000-0000-000000000000", p0b, ld4,  -1),
            // ── Plans 08–09: max_project_units ─────────────────────────────────
            PL("c1000018-0000-0000-0000-000000000000", p08, ld4, 100),
            PL("c1000019-0000-0000-0000-000000000000", p09, ld4,  -1),
            // ── Plans 01–04 ────────────────────────────────────────────────────
            PL("c2000001-0000-0000-0000-000000000000", p01, ld1,  2),
            PL("c2000002-0000-0000-0000-000000000000", p01, ld2,  0),
            PL("c2000003-0000-0000-0000-000000000000", p01, ld3,  0),
            PL("c2000004-0000-0000-0000-000000000000", p01, ld4,  0),
            PL("c2000005-0000-0000-0000-000000000000", p01, ld5,  4),
            PL("c2000006-0000-0000-0000-000000000000", p01, ld6,  0),
            PL("c2000007-0000-0000-0000-000000000000", p02, ld1,  5),
            PL("c2000008-0000-0000-0000-000000000000", p02, ld2,  0),
            PL("c2000009-0000-0000-0000-000000000000", p02, ld3,  0),
            PL("c200000a-0000-0000-0000-000000000000", p02, ld4,  0),
            PL("c200000b-0000-0000-0000-000000000000", p02, ld5,  8),
            PL("c200000c-0000-0000-0000-000000000000", p02, ld6,  1),
            PL("c200000d-0000-0000-0000-000000000000", p03, ld1, 20),
            PL("c200000e-0000-0000-0000-000000000000", p03, ld2,  0),
            PL("c200000f-0000-0000-0000-000000000000", p03, ld3,  0),
            PL("c2000010-0000-0000-0000-000000000000", p03, ld4,  0),
            PL("c2000011-0000-0000-0000-000000000000", p03, ld5, 15),
            PL("c2000012-0000-0000-0000-000000000000", p03, ld6,  5),
            PL("c2000013-0000-0000-0000-000000000000", p04, ld1, -1),
            PL("c2000014-0000-0000-0000-000000000000", p04, ld2, -1),
            PL("c2000015-0000-0000-0000-000000000000", p04, ld3, -1),
            PL("c2000016-0000-0000-0000-000000000000", p04, ld4, -1),
            PL("c2000017-0000-0000-0000-000000000000", p04, ld5, -1),
            PL("c2000018-0000-0000-0000-000000000000", p04, ld6, 20),
        };
    }

    // ── PlanPricings ──────────────────────────────────────────────────────────

    private async Task SeedPlanPricingsAsync(CancellationToken ct)
    {
        var existingIds = (await _ctx.PlanPricings
            .Select(p => p.Id)
            .ToListAsync(ct)).ToHashSet();

        var catalog = BuildPlanPricingCatalog();
        var newPPs = catalog.Where(pp => !existingIds.Contains(pp.Id)).ToList();

        if (newPPs.Count > 0)
        {
            _ctx.PlanPricings.AddRange(newPPs);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new PlanPricings.", newPPs.Count);
        }
    }

    private static List<PlanPricing> BuildPlanPricingCatalog()
    {
        static PlanPricing PP(string id, string planId, string cycle, decimal amount) => new()
        {
            Id           = Guid.Parse(id),
            PlanId       = Guid.Parse(planId),
            BillingCycle = cycle,
            PriceAmount  = amount,
            CurrencyCode = "SYP",
            IsActive     = true,
            IsPublic     = true,
        };

        return new List<PlanPricing>
        {
            PP("ef000001-0000-0000-0000-000000000000", "00000001-0000-0000-0000-000000000000", "Monthly",      0),
            PP("ef000002-0000-0000-0000-000000000000", "00000002-0000-0000-0000-000000000000", "Monthly",   1500),
            PP("ef000003-0000-0000-0000-000000000000", "00000002-0000-0000-0000-000000000000", "Yearly",   15000),
            PP("ef000004-0000-0000-0000-000000000000", "00000003-0000-0000-0000-000000000000", "Monthly",   3500),
            PP("ef000005-0000-0000-0000-000000000000", "00000003-0000-0000-0000-000000000000", "Yearly",   35000),
            PP("ef000006-0000-0000-0000-000000000000", "00000004-0000-0000-0000-000000000000", "Monthly",   7000),
            PP("ef000007-0000-0000-0000-000000000000", "00000004-0000-0000-0000-000000000000", "Yearly",   70000),
            PP("ef000008-0000-0000-0000-000000000000", "00000005-0000-0000-0000-000000000000", "Monthly",   1000),
            PP("ef000009-0000-0000-0000-000000000000", "00000005-0000-0000-0000-000000000000", "Yearly",    9000),
            PP("ef00000a-0000-0000-0000-000000000000", "00000006-0000-0000-0000-000000000000", "Monthly",   2500),
            PP("ef00000b-0000-0000-0000-000000000000", "00000006-0000-0000-0000-000000000000", "Yearly",   22000),
            PP("ef00000c-0000-0000-0000-000000000000", "00000007-0000-0000-0000-000000000000", "Monthly",   5000),
            PP("ef00000d-0000-0000-0000-000000000000", "00000007-0000-0000-0000-000000000000", "Yearly",   44000),
            PP("ef00000e-0000-0000-0000-000000000000", "00000008-0000-0000-0000-000000000000", "Monthly",  10000),
            PP("ef00000f-0000-0000-0000-000000000000", "00000008-0000-0000-0000-000000000000", "Yearly",   88000),
            PP("ef000010-0000-0000-0000-000000000000", "00000009-0000-0000-0000-000000000000", "Monthly",  20000),
            PP("ef000011-0000-0000-0000-000000000000", "00000009-0000-0000-0000-000000000000", "Yearly",  176000),
            PP("ef000012-0000-0000-0000-000000000000", "0000000a-0000-0000-0000-000000000000", "Monthly",  15000),
            PP("ef000013-0000-0000-0000-000000000000", "0000000a-0000-0000-0000-000000000000", "Yearly",  130000),
            PP("ef000014-0000-0000-0000-000000000000", "0000000b-0000-0000-0000-000000000000", "Monthly",  30000),
            PP("ef000015-0000-0000-0000-000000000000", "0000000b-0000-0000-0000-000000000000", "Yearly",  260000),
        };
    }

    // ── Plan data corrections (idempotent UPDATEs) ────────────────────────────

    private async Task ApplyPlanCorrectionsAsync(CancellationToken ct)
    {
        // Descriptions and metadata
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = 5,  VideoAllowed = 0, AnalyticsAccess = 0,
                Description           = 'للمستخدمين الأفراد الذين يرغبون في نشر إعلانات محدودة',
                ApplicableAccountType = 'Individual',
                Features              = '[""2 إعلانات شهرياً"",""5 صور لكل إعلان"",""بحث وتصفح عادي""]'
            WHERE Id = '00000001-0000-0000-0000-000000000000'", ct);

        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = 10, VideoAllowed = 0, AnalyticsAccess = 0,
                Description           = 'للمكاتب العقارية الصغيرة والوسيطة',
                ApplicableAccountType = 'Office',
                Features              = '[""5 إعلانات شهرياً"",""10 صور لكل إعلان"",""3 وكلاء"",""إعلان مميز واحد"",""دعم فني""]'
            WHERE Id = '00000002-0000-0000-0000-000000000000'", ct);

        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = 20, VideoAllowed = 1, AnalyticsAccess = 1,
                Description           = 'للمكاتب والشركات العقارية المتوسطة والكبيرة',
                ApplicableAccountType = NULL,
                Features              = '[""20 إعلاناً شهرياً"",""20 صورة لكل إعلان"",""رفع فيديو"",""10 وكلاء"",""5 إعلانات مميزة"",""لوحة إحصائيات"",""2 مشروع""]'
            WHERE Id = '00000003-0000-0000-0000-000000000000'", ct);

        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing  = -1, VideoAllowed = 1, AnalyticsAccess = 1,
                Description           = 'للشركات الكبرى وشركات التطوير العقاري',
                ApplicableAccountType = 'Company',
                Features              = '[""إعلانات غير محدودة"",""صور غير محدودة"",""رفع فيديو"",""وكلاء غير محدودون"",""إعلانات مميزة 20"",""لوحة إحصائيات متقدمة"",""مشاريع غير محدودة"",""دعم أولوية""]'
            WHERE Id = '00000004-0000-0000-0000-000000000000'", ct);

        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET
                ImageLimitPerListing = 30, VideoAllowed = 1, AnalyticsAccess = 1,
                Description = 'لشركات التطوير العقاري الناشئة — مشاريع متعددة وفرق عمل'
            WHERE Id = '0000000a-0000-0000-0000-000000000000';
            UPDATE Plans SET
                ImageLimitPerListing = -1, VideoAllowed = 1, AnalyticsAccess = 1, IsRecommended = 1,
                Description = 'لكبرى شركات التطوير العقاري — طاقة غير محدودة ودعم أولوية'
            WHERE Id = '0000000b-0000-0000-0000-000000000000'", ct);

        // Name corrections (idempotent)
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET Name = 'BrokerPro'     WHERE Id = '00000006-0000-0000-0000-000000000000' AND Name = 'AgentPro';
            UPDATE Plans SET Name = 'BrokerPremium' WHERE Id = '00000007-0000-0000-0000-000000000000' AND Name = 'AgentPremium';
            UPDATE Plans SET Name = 'OfficeGrowth'  WHERE Id = '00000009-0000-0000-0000-000000000000' AND Name = 'BusinessGrowth'", ct);

        // ApplicableAccountType corrections
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET ApplicableAccountType = 'Individual' WHERE Id = '00000006-0000-0000-0000-000000000000';
            UPDATE Plans SET ApplicableAccountType = 'Individual' WHERE Id = '00000007-0000-0000-0000-000000000000';
            UPDATE Plans SET ApplicableAccountType = 'Office'     WHERE Id = '00000008-0000-0000-0000-000000000000';
            UPDATE Plans SET ApplicableAccountType = 'Office'     WHERE Id = '00000009-0000-0000-0000-000000000000'", ct);

        // Rank + DisplayOrder + PlanCategory (idempotent)
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET Rank = 0,  DisplayOrder = 1,  PlanCategory = 'Individual' WHERE Id = '00000001-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 1,  DisplayOrder = 2,  PlanCategory = 'Individual' WHERE Id = '00000002-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 2,  DisplayOrder = 3,  PlanCategory = 'Individual' WHERE Id = '00000003-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 3,  DisplayOrder = 4,  PlanCategory = 'Individual' WHERE Id = '00000004-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 10, DisplayOrder = 0,  PlanCategory = 'Business'   WHERE Id = '00000005-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 11, DisplayOrder = 1,  PlanCategory = 'Business'   WHERE Id = '00000006-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 12, DisplayOrder = 2,  PlanCategory = 'Business'   WHERE Id = '00000007-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 13, DisplayOrder = 3,  PlanCategory = 'Business'   WHERE Id = '00000008-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 14, DisplayOrder = 4,  PlanCategory = 'Business'   WHERE Id = '00000009-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 15, DisplayOrder = 15, PlanCategory = 'Business'   WHERE Id = '0000000a-0000-0000-0000-000000000000';
            UPDATE Plans SET Rank = 16, DisplayOrder = 16, PlanCategory = 'Business'   WHERE Id = '0000000b-0000-0000-0000-000000000000'", ct);

        // Code seeds (idempotent — SET NULL-safe because Code is nullable)
        await _ctx.Database.ExecuteSqlRawAsync(@"
            UPDATE Plans SET Code = 'free_user'          WHERE Id = '00000001-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'silver'             WHERE Id = '00000002-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'gold'               WHERE Id = '00000003-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'platinum'           WHERE Id = '00000004-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'owner_pro'          WHERE Id = '00000005-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'broker_pro'         WHERE Id = '00000006-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'broker_premium'     WHERE Id = '00000007-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'office_starter'     WHERE Id = '00000008-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'office_growth'      WHERE Id = '00000009-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'developer_business' WHERE Id = '0000000a-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '');
            UPDATE Plans SET Code = 'developer_premium'  WHERE Id = '0000000b-0000-0000-0000-000000000000' AND (Code IS NULL OR Code = '')", ct);
    }

    // ── BlogSeoSettings (singleton) ───────────────────────────────────────────

    private async Task SeedBlogSeoSettingsAsync(CancellationToken ct)
    {
        var seoId = Guid.Parse("00000000-0000-0000-0000-000000000001");
        var exists = await _ctx.BlogSeoSettings.AnyAsync(s => s.Id == seoId, ct);
        if (exists) return;

        _ctx.BlogSeoSettings.Add(new BlogSeoSettings
        {
            Id                               = seoId,
            SiteName                         = "بيوت",
            DefaultPostSeoTitleTemplate      = "{PostTitle} | {SiteName}",
            DefaultPostSeoDescriptionTemplate= "{Excerpt}",
            DefaultBlogListSeoTitle          = "المدونة | بيوت",
            DefaultBlogListSeoDescription    = "تصفح أحدث المقالات العقارية من بيوت سوريا",
        });

        await _ctx.SaveChangesAsync(ct);
        _log.LogInformation("Seeded BlogSeoSettings singleton.");
    }
}
