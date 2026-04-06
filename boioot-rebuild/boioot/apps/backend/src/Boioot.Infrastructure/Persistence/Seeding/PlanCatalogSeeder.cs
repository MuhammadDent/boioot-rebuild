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
        await ApplyPlanNameNormalizationAsync(ct);
        await CorrectMisassignedSubscriptionsAsync(ct);
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
            _ctx.ChangeTracker.Clear();
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
            // ── New normalized plans (0c–0d) ──────────────────────────────────
            P("0000000c-0000-0000-0000-000000000000", "BrokerAdvanced",   "broker_advanced",   -1,  8, 20,  15, 7500, 65000, "Individual", "Business",   22, 22),
            P("0000000d-0000-0000-0000-000000000000", "OfficeAdvanced",   "office_advanced",   -1, -1, -1,  30,30000,260000, "Office",     "Business",   32, 32, isRecommended: true),
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
            // marketing group (SortOrder 10-19)
            FD("fd000003-0000-0000-0000-000000000000", "featured_listings",   "إعلانات مميزة",          "إبراز الإعلانات في نتائج البحث",                  "marketing",     "⭐",  "boolean", "listing",   10),
            FD("fd000009-0000-0000-0000-000000000000", "homepage_exposure",   "ظهور في الصفحة الرئيسية","عرض الإعلانات ضمن قسم مميز في الصفحة الرئيسية",   "marketing",     "🏠",  "boolean", "listing",   11),
            FD("fd000008-0000-0000-0000-000000000000", "verified_badge",      "شارة التحقق",            "عرض علامة التحقق على الملف الشخصي والإعلانات",     "marketing",     "✅",  "boolean", "user",      12),
            // content group (SortOrder 20-29)
            FD("fd000006-0000-0000-0000-000000000000", "multiple_photos",     "صور متعددة للإعلان",     "رفع أكثر من صورة للإعلان الواحد",                  "content",       "📸",  "boolean", "listing",   20),
            FD("fd000005-0000-0000-0000-000000000000", "video_upload",        "رفع الفيديو",            "إمكانية رفع فيديو للإعلان",                       "content",       "🎥",  "boolean", "listing",   21),
            // business group (SortOrder 30-39)
            FD("fd000001-0000-0000-0000-000000000000", "analytics_dashboard", "لوحة التحليلات",         "وصول إلى إحصائيات وأداء الإعلانات",               "business",      "📊",  "boolean", "analytics", 30),
            FD("fd000004-0000-0000-0000-000000000000", "project_management",  "إدارة المشاريع",         "أدوات إنشاء وإدارة المشاريع العقارية والوحدات",    "business",      "🏗",  "boolean", "system",    31),
            // communication group (SortOrder 40-49)
            FD("fd000007-0000-0000-0000-000000000000", "whatsapp_contact",    "تواصل عبر واتساب",       "إظهار زر واتساب في صفحة الإعلان",                  "communication", "💬",  "boolean", "messaging", 40),
            FD("fd00000a-0000-0000-0000-000000000000", "internal_chat",       "المراسلة الداخلية",       "إمكانية التواصل مع البائعين والمشترين عبر المنصة",  "communication", "✉️",  "boolean", "messaging", 41),
            // support group (SortOrder 50-59)
            FD("fd000002-0000-0000-0000-000000000000", "priority_support",    "دعم ذو أولوية",          "أولوية الوصول لفريق الدعم الفني",                 "support",       "🛠",  "boolean", "user",      50),
        };

        var newFDs = catalog.Where(f => !existing.Contains(f.Key)).ToList();
        if (newFDs.Count > 0)
        {
            _ctx.FeatureDefinitions.AddRange(newFDs);
            await _ctx.SaveChangesAsync(ct);
            _ctx.ChangeTracker.Clear();
            _log.LogInformation("Seeded {Count} new FeatureDefinitions.", newFDs.Count);
        }

        // Idempotent correction — run every startup to back-fill any gaps in existing rows.
        var fds = await _ctx.FeatureDefinitions.ToListAsync(ct);

        // key → (group, icon, type, scope, isSystem, sortOrder)
        var fdMetaMap = new Dictionary<string, (string group, string icon, string type, string scope, bool isSystem, int sortOrder)>(StringComparer.Ordinal)
        {
            ["featured_listings"]   = ("marketing",     "⭐",  "boolean", "listing",   true,  10),
            ["homepage_exposure"]   = ("marketing",     "🏠",  "boolean", "listing",   true,  11),
            ["verified_badge"]      = ("marketing",     "✅",  "boolean", "user",      true,  12),
            ["multiple_photos"]     = ("content",       "📸",  "boolean", "listing",   true,  20),
            ["video_upload"]        = ("content",       "🎥",  "boolean", "listing",   true,  21),
            ["analytics_dashboard"] = ("business",      "📊",  "boolean", "analytics", true,  30),
            ["project_management"]  = ("business",      "🏗",  "boolean", "system",    true,  31),
            ["whatsapp_contact"]    = ("communication", "💬",  "boolean", "messaging", true,  40),
            ["internal_chat"]       = ("communication", "✉️",  "boolean", "messaging", true,  41),
            ["priority_support"]    = ("support",       "🛠",  "boolean", "user",      true,  50),
        };

        foreach (var fd in fds)
        {
            if (!fdMetaMap.TryGetValue(fd.Key, out var meta)) continue;
            fd.FeatureGroup = meta.group;
            fd.Icon         = meta.icon;
            fd.Type         = meta.type;
            fd.Scope        = meta.scope;
            fd.IsSystem     = meta.isSystem;
            fd.SortOrder    = meta.sortOrder;
        }
        await _ctx.SaveChangesAsync(ct);
    }

    private static FeatureDefinition FD(string id, string key, string name,
        string? description, string group, string icon,
        string type, string scope, int sortOrder) => new()
    {
        Id           = Guid.Parse(id),
        Key          = key,
        Name         = name,
        Description  = description,
        FeatureGroup = group,
        Icon         = icon,
        IsActive     = true,
        Type         = type,
        Scope        = scope,
        IsSystem     = true,
        SortOrder    = sortOrder,
    };

    // ── LimitDefinitions ──────────────────────────────────────────────────────

    private async Task SeedLimitDefinitionsAsync(CancellationToken ct)
    {
        var existing = (await _ctx.LimitDefinitions
            .Select(l => l.Key)
            .ToListAsync(ct)).ToHashSet();

        var catalog = new[]
        {
            LD("add00001-0000-0000-0000-000000000000", "max_active_listings",    "الحد الأقصى للإعلانات النشطة",    "عدد الإعلانات المسموح بها في نفس الوقت",                 "إعلان",   "integer", "account"),
            LD("add00002-0000-0000-0000-000000000000", "max_agents",             "الحد الأقصى للوكلاء",             "عدد الوكلاء المسموح بهم في الحساب",                       "وكيل",    "integer", "account"),
            LD("add00003-0000-0000-0000-000000000000", "max_projects",           "الحد الأقصى للمشاريع",            "عدد المشاريع العقارية المسموح بها",                        "مشروع",   "integer", "account"),
            LD("add00004-0000-0000-0000-000000000000", "max_project_units",      "الحد الأقصى لوحدات المشروع",      "إجمالي الوحدات العقارية المسموح بها عبر جميع المشاريع",   "وحدة",    "integer", "account"),
            LD("add00005-0000-0000-0000-000000000000", "max_images_per_listing", "الحد الأقصى للصور لكل إعلان",    "عدد الصور المسموح برفعها في الإعلان الواحد",              "صورة",    "integer", "listing"),
            LD("add00006-0000-0000-0000-000000000000", "max_featured_slots",     "الإعلانات المميزة المتاحة",        "عدد الإعلانات المميزة المسموح بها في نفس الوقت",           "إعلان",   "integer", "account"),
            // Depends on: video_upload feature being enabled for that plan.
            // Value 0 = no video upload allowed; ≥1 = number of videos per listing.
            // Currently the property schema supports one VideoUrl field, so value is
            // either 0 (blocked) or 1 (allowed) for most plans.
            LD("add00007-0000-0000-0000-000000000000", "max_videos_per_listing",  "الحد الأقصى للفيديوهات لكل إعلان",  "عدد مقاطع الفيديو المسموح بها في الإعلان الواحد (0 = محجوب)", "فيديو",      "integer", "listing"),
            LD("add00008-0000-0000-0000-000000000000", "max_conversations",        "الحد الأقصى للمحادثات",               "عدد المحادثات المتزامنة المسموح بها للحساب (-1 = غير محدود)",   "محادثة",     "integer", "account"),
            LD("add00009-0000-0000-0000-000000000000", "monthly_lead_unlocks",     "فتح بيانات التواصل الشهري",           "عدد مرات كشف بيانات التواصل المسموح بها شهرياً (-1 = غير محدود)", "فتح",       "integer", "account"),
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
            .AsNoTracking()
            .Select(pf => pf.Id)
            .ToListAsync(ct)).ToHashSet();

        var catalog = BuildPlanFeatureCatalog();
        var newPFs = catalog.Where(pf => !existingIds.Contains(pf.Id)).ToList();

        if (newPFs.Count > 0)
        {
            _ctx.ChangeTracker.Clear();
            _ctx.PlanFeatures.AddRange(newPFs);
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation("Seeded {Count} new PlanFeatures.", newPFs.Count);
        }

        // Apply IsEnabled corrections (idempotent, portable EF change tracker).
        var pfCorrections = new Dictionary<Guid, bool>
        {
            [Guid.Parse("ce000001-0000-0000-0000-000000000000")] = true,
            [Guid.Parse("ce000004-0000-0000-0000-000000000000")] = true,
            [Guid.Parse("ce000006-0000-0000-0000-000000000000")] = false,
        };
        var pfIds = pfCorrections.Keys.ToList();
        var pfsToFix = await _ctx.PlanFeatures
            .Where(pf => pfIds.Contains(pf.Id))
            .ToListAsync(ct);
        foreach (var pf in pfsToFix)
            pf.IsEnabled = pfCorrections[pf.Id];
        await _ctx.SaveChangesAsync(ct);
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

        const string fd1  = "fd000001-0000-0000-0000-000000000000"; // analytics_dashboard
        const string fd2  = "fd000002-0000-0000-0000-000000000000"; // priority_support
        const string fd3  = "fd000003-0000-0000-0000-000000000000"; // featured_listings
        const string fd4  = "fd000004-0000-0000-0000-000000000000"; // project_management
        const string fd5  = "fd000005-0000-0000-0000-000000000000"; // video_upload
        const string fd6  = "fd000006-0000-0000-0000-000000000000"; // multiple_photos
        const string fd7  = "fd000007-0000-0000-0000-000000000000"; // whatsapp_contact
        const string fd8  = "fd000008-0000-0000-0000-000000000000"; // verified_badge
        const string fd9  = "fd000009-0000-0000-0000-000000000000"; // homepage_exposure
        const string fd0a = "fd00000a-0000-0000-0000-000000000000"; // internal_chat

        const string p01 = "00000001-0000-0000-0000-000000000000"; // Free
        const string p02 = "00000002-0000-0000-0000-000000000000"; // Silver
        const string p03 = "00000003-0000-0000-0000-000000000000"; // Gold
        const string p04 = "00000004-0000-0000-0000-000000000000"; // Platinum
        const string p05 = "00000005-0000-0000-0000-000000000000"; // OwnerPro
        const string p06 = "00000006-0000-0000-0000-000000000000"; // BrokerPro
        const string p07 = "00000007-0000-0000-0000-000000000000"; // BrokerPremium
        const string p08 = "00000008-0000-0000-0000-000000000000"; // OfficeStarter
        const string p09 = "00000009-0000-0000-0000-000000000000"; // OfficeGrowth
        const string p0a = "0000000a-0000-0000-0000-000000000000"; // DeveloperBusiness → company_basic
        const string p0b = "0000000b-0000-0000-0000-000000000000"; // DeveloperPremium  → company_enterprise
        const string p0c = "0000000c-0000-0000-0000-000000000000"; // BrokerAdvanced
        const string p0d = "0000000d-0000-0000-0000-000000000000"; // OfficeAdvanced

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
            // ── Business plans 05–07: missing fds 4–9 (da000001–da000012) ──
            // OwnerPro (05)
            PF("da000001-0000-0000-0000-000000000000", p05, fd4, false),
            PF("da000002-0000-0000-0000-000000000000", p05, fd5, false),
            PF("da000003-0000-0000-0000-000000000000", p05, fd6, true),
            PF("da000004-0000-0000-0000-000000000000", p05, fd7, true),
            PF("da000005-0000-0000-0000-000000000000", p05, fd8, false),
            PF("da000006-0000-0000-0000-000000000000", p05, fd9, false),
            // BrokerPro (06)
            PF("da000007-0000-0000-0000-000000000000", p06, fd4, false),
            PF("da000008-0000-0000-0000-000000000000", p06, fd5, false),
            PF("da000009-0000-0000-0000-000000000000", p06, fd6, true),
            PF("da00000a-0000-0000-0000-000000000000", p06, fd7, true),
            PF("da00000b-0000-0000-0000-000000000000", p06, fd8, false),
            PF("da00000c-0000-0000-0000-000000000000", p06, fd9, false),
            // BrokerPremium (07)
            PF("da00000d-0000-0000-0000-000000000000", p07, fd4, false),
            PF("da00000e-0000-0000-0000-000000000000", p07, fd5, true),
            PF("da00000f-0000-0000-0000-000000000000", p07, fd6, true),
            PF("da000010-0000-0000-0000-000000000000", p07, fd7, true),
            PF("da000011-0000-0000-0000-000000000000", p07, fd8, true),
            PF("da000012-0000-0000-0000-000000000000", p07, fd9, false),
            // ── Office/Developer plans 08–0b: missing fds 5–9 (da000013–da000026) ──
            // OfficeStarter (08)
            PF("da000013-0000-0000-0000-000000000000", p08, fd5, false),
            PF("da000014-0000-0000-0000-000000000000", p08, fd6, true),
            PF("da000015-0000-0000-0000-000000000000", p08, fd7, true),
            PF("da000016-0000-0000-0000-000000000000", p08, fd8, true),
            PF("da000017-0000-0000-0000-000000000000", p08, fd9, false),
            // OfficeGrowth (09)
            PF("da000018-0000-0000-0000-000000000000", p09, fd5, true),
            PF("da000019-0000-0000-0000-000000000000", p09, fd6, true),
            PF("da00001a-0000-0000-0000-000000000000", p09, fd7, true),
            PF("da00001b-0000-0000-0000-000000000000", p09, fd8, true),
            PF("da00001c-0000-0000-0000-000000000000", p09, fd9, true),
            // DeveloperBusiness (0a)
            PF("da00001d-0000-0000-0000-000000000000", p0a, fd5, true),
            PF("da00001e-0000-0000-0000-000000000000", p0a, fd6, true),
            PF("da00001f-0000-0000-0000-000000000000", p0a, fd7, true),
            PF("da000020-0000-0000-0000-000000000000", p0a, fd8, true),
            PF("da000021-0000-0000-0000-000000000000", p0a, fd9, false),
            // DeveloperPremium (0b)
            PF("da000022-0000-0000-0000-000000000000", p0b, fd5, true),
            PF("da000023-0000-0000-0000-000000000000", p0b, fd6, true),
            PF("da000024-0000-0000-0000-000000000000", p0b, fd7, true),
            PF("da000025-0000-0000-0000-000000000000", p0b, fd8, true),
            PF("da000026-0000-0000-0000-000000000000", p0b, fd9, true),
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
            // ── internal_chat (fd0a) for all 11 plans (eb000001–eb00000b) ──────
            // Free & Silver: false — no internal chat on basic plans.
            // All paid plans: true — internal chat enabled.
            PF("eb000001-0000-0000-0000-000000000000", p01, fd0a, false), // Free
            PF("eb000002-0000-0000-0000-000000000000", p02, fd0a, false), // Silver
            PF("eb000003-0000-0000-0000-000000000000", p03, fd0a, true),  // Gold
            PF("eb000004-0000-0000-0000-000000000000", p04, fd0a, true),  // Platinum
            PF("eb000005-0000-0000-0000-000000000000", p05, fd0a, true),  // OwnerPro
            PF("eb000006-0000-0000-0000-000000000000", p06, fd0a, true),  // BrokerPro
            PF("eb000007-0000-0000-0000-000000000000", p07, fd0a, true),  // BrokerPremium
            PF("eb000008-0000-0000-0000-000000000000", p08, fd0a, true),  // OfficeStarter
            PF("eb000009-0000-0000-0000-000000000000", p09, fd0a, true),  // OfficeGrowth
            PF("eb00000a-0000-0000-0000-000000000000", p0a, fd0a, true),  // DeveloperBusiness
            PF("eb00000b-0000-0000-0000-000000000000", p0b, fd0a, true),  // DeveloperPremium
            // ── BrokerAdvanced (0c) ────────────────────────────────────────────
            PF("ec000001-0000-0000-0000-000000000000", p0c, fd1, true),
            PF("ec000002-0000-0000-0000-000000000000", p0c, fd2, true),
            PF("ec000003-0000-0000-0000-000000000000", p0c, fd3, true),
            PF("ec000004-0000-0000-0000-000000000000", p0c, fd4, true),
            PF("ec000005-0000-0000-0000-000000000000", p0c, fd5, true),
            PF("ec000006-0000-0000-0000-000000000000", p0c, fd6, true),
            PF("ec000007-0000-0000-0000-000000000000", p0c, fd7, true),
            PF("ec000008-0000-0000-0000-000000000000", p0c, fd8, true),
            PF("ec000009-0000-0000-0000-000000000000", p0c, fd9, true),
            PF("ec00000a-0000-0000-0000-000000000000", p0c, fd0a, true),
            // ── OfficeAdvanced (0d) ────────────────────────────────────────────
            PF("ed000001-0000-0000-0000-000000000000", p0d, fd1, true),
            PF("ed000002-0000-0000-0000-000000000000", p0d, fd2, true),
            PF("ed000003-0000-0000-0000-000000000000", p0d, fd3, true),
            PF("ed000004-0000-0000-0000-000000000000", p0d, fd4, true),
            PF("ed000005-0000-0000-0000-000000000000", p0d, fd5, true),
            PF("ed000006-0000-0000-0000-000000000000", p0d, fd6, true),
            PF("ed000007-0000-0000-0000-000000000000", p0d, fd7, true),
            PF("ed000008-0000-0000-0000-000000000000", p0d, fd8, true),
            PF("ed000009-0000-0000-0000-000000000000", p0d, fd9, true),
            PF("ed00000a-0000-0000-0000-000000000000", p0d, fd0a, true),
        };
    }

    // ── PlanLimits ────────────────────────────────────────────────────────────

    private async Task SeedPlanLimitsAsync(CancellationToken ct)
    {
        var existingIds = (await _ctx.PlanLimits
            .AsNoTracking()
            .Select(pl => pl.Id)
            .ToListAsync(ct)).ToHashSet();

        var catalog = BuildPlanLimitCatalog();
        var newPLs = catalog.Where(pl => !existingIds.Contains(pl.Id)).ToList();

        if (newPLs.Count > 0)
        {
            _ctx.ChangeTracker.Clear();
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
        const string ld7 = "add00007-0000-0000-0000-000000000000"; // max_videos_per_listing (0=blocked)
        const string ld8 = "add00008-0000-0000-0000-000000000000"; // max_conversations
        const string ld9 = "add00009-0000-0000-0000-000000000000"; // monthly_lead_unlocks

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
        const string p0c = "0000000c-0000-0000-0000-000000000000"; // broker_advanced
        const string p0d = "0000000d-0000-0000-0000-000000000000"; // office_advanced

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
            // ── Missing ld4/ld5/ld6 for business/developer plans (c3000001–c3000011) ──
            // OwnerPro (05): ld4=max_project_units, ld5=max_images_per_listing, ld6=max_featured_slots
            PL("c3000001-0000-0000-0000-000000000000", p05, ld4,   0),
            PL("c3000002-0000-0000-0000-000000000000", p05, ld5,   8),
            PL("c3000003-0000-0000-0000-000000000000", p05, ld6,   0),
            // BrokerPro (06)
            PL("c3000004-0000-0000-0000-000000000000", p06, ld4,   0),
            PL("c3000005-0000-0000-0000-000000000000", p06, ld5,  15),
            PL("c3000006-0000-0000-0000-000000000000", p06, ld6,   2),
            // BrokerPremium (07)
            PL("c3000007-0000-0000-0000-000000000000", p07, ld4,   0),
            PL("c3000008-0000-0000-0000-000000000000", p07, ld5,  25),
            PL("c3000009-0000-0000-0000-000000000000", p07, ld6,   5),
            // OfficeStarter (08): ld5 + ld6 only (ld4 already seeded above)
            PL("c300000a-0000-0000-0000-000000000000", p08, ld5,  25),
            PL("c300000b-0000-0000-0000-000000000000", p08, ld6,  10),
            // OfficeGrowth (09): ld5 + ld6 only
            PL("c300000c-0000-0000-0000-000000000000", p09, ld5,  -1),
            PL("c300000d-0000-0000-0000-000000000000", p09, ld6,  20),
            // DeveloperBusiness (0a): ld5 + ld6 only (ld4 already seeded above)
            PL("c300000e-0000-0000-0000-000000000000", p0a, ld5,  30),
            PL("c300000f-0000-0000-0000-000000000000", p0a, ld6,  10),
            // DeveloperPremium (0b): ld5 + ld6 only
            PL("c3000010-0000-0000-0000-000000000000", p0b, ld5,  -1),
            PL("c3000011-0000-0000-0000-000000000000", p0b, ld6,  30),
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
            // ── max_videos_per_listing (ld7): mirrors the video_upload feature flag ─
            // 0 = blocked (video_upload=false for that plan)
            // ≥1 = allowed count (schema currently supports 1 VideoUrl per listing)
            PL("c4000001-0000-0000-0000-000000000000", p01, ld7,  0), // Free:             blocked
            PL("c4000002-0000-0000-0000-000000000000", p02, ld7,  0), // Silver:           blocked
            PL("c4000003-0000-0000-0000-000000000000", p03, ld7,  1), // Gold:             1 video
            PL("c4000004-0000-0000-0000-000000000000", p04, ld7,  3), // Platinum:         3 videos
            PL("c4000005-0000-0000-0000-000000000000", p05, ld7,  2), // OwnerAdvanced:    2 videos
            PL("c4000006-0000-0000-0000-000000000000", p06, ld7,  0), // BrokerFree:       blocked
            PL("c4000007-0000-0000-0000-000000000000", p07, ld7,  1), // BrokerPremium:    1 video
            PL("c4000008-0000-0000-0000-000000000000", p08, ld7,  0), // OfficeStarter:    blocked
            PL("c4000009-0000-0000-0000-000000000000", p09, ld7,  2), // OfficeGrowth:     2 videos
            PL("c400000a-0000-0000-0000-000000000000", p0a, ld7,  2), // DeveloperBusiness:2 videos
            PL("c400000b-0000-0000-0000-000000000000", p0b, ld7,  3), // DeveloperPremium: 3 videos
            // ── BrokerAdvanced (0c) ────────────────────────────────────────────
            PL("c5000001-0000-0000-0000-000000000000", p0c, ld1,  -1),
            PL("c5000002-0000-0000-0000-000000000000", p0c, ld2,  20),
            PL("c5000003-0000-0000-0000-000000000000", p0c, ld3,   8),
            PL("c5000004-0000-0000-0000-000000000000", p0c, ld4,   0),
            PL("c5000005-0000-0000-0000-000000000000", p0c, ld5,  -1),
            PL("c5000006-0000-0000-0000-000000000000", p0c, ld6,  15),
            PL("c5000007-0000-0000-0000-000000000000", p0c, ld7,   2),
            // ── OfficeAdvanced (0d) ────────────────────────────────────────────
            PL("c6000001-0000-0000-0000-000000000000", p0d, ld1,  -1),
            PL("c6000002-0000-0000-0000-000000000000", p0d, ld2,  -1),
            PL("c6000003-0000-0000-0000-000000000000", p0d, ld3,  -1),
            PL("c6000004-0000-0000-0000-000000000000", p0d, ld4,  -1),
            PL("c6000005-0000-0000-0000-000000000000", p0d, ld5,  -1),
            PL("c6000006-0000-0000-0000-000000000000", p0d, ld6,  30),
            PL("c6000007-0000-0000-0000-000000000000", p0d, ld7,   3),
            // ── Phase 1: max_conversations + monthly_lead_unlocks (ld8/ld9) ──────
            // office_free  (08): 10 conversations, 0 lead unlocks/month
            PL("c7000001-0000-0000-0000-000000000000", p08, ld8,  10),
            PL("c7000002-0000-0000-0000-000000000000", p08, ld9,   0),
            // office_basic (09): 50 conversations, 10 lead unlocks/month
            PL("c7000003-0000-0000-0000-000000000000", p09, ld8,  50),
            PL("c7000004-0000-0000-0000-000000000000", p09, ld9,  10),
            // office_advanced (0d): unlimited conversations, unlimited lead unlocks
            PL("c7000005-0000-0000-0000-000000000000", p0d, ld8,  -1),
            PL("c7000006-0000-0000-0000-000000000000", p0d, ld9,  -1),
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
            // ── New plans (0c–0d) ──────────────────────────────────────────────
            PP("ef000016-0000-0000-0000-000000000000", "0000000c-0000-0000-0000-000000000000", "Monthly",   7500),
            PP("ef000017-0000-0000-0000-000000000000", "0000000c-0000-0000-0000-000000000000", "Yearly",   65000),
            PP("ef000018-0000-0000-0000-000000000000", "0000000d-0000-0000-0000-000000000000", "Monthly",  30000),
            PP("ef000019-0000-0000-0000-000000000000", "0000000d-0000-0000-0000-000000000000", "Yearly",  260000),
        };
    }

    // ── Plan data corrections (idempotent, portable EF change tracker) ──────────

    private async Task ApplyPlanCorrectionsAsync(CancellationToken ct)
    {
        var allPlanIds = new List<Guid>
        {
            Guid.Parse("00000001-0000-0000-0000-000000000000"),
            Guid.Parse("00000002-0000-0000-0000-000000000000"),
            Guid.Parse("00000003-0000-0000-0000-000000000000"),
            Guid.Parse("00000004-0000-0000-0000-000000000000"),
            Guid.Parse("00000005-0000-0000-0000-000000000000"),
            Guid.Parse("00000006-0000-0000-0000-000000000000"),
            Guid.Parse("00000007-0000-0000-0000-000000000000"),
            Guid.Parse("00000008-0000-0000-0000-000000000000"),
            Guid.Parse("00000009-0000-0000-0000-000000000000"),
            Guid.Parse("0000000a-0000-0000-0000-000000000000"),
            Guid.Parse("0000000b-0000-0000-0000-000000000000"),
        };

        var plans = await _ctx.Plans
            .IgnoreQueryFilters()
            .Where(p => allPlanIds.Contains(p.Id))
            .ToDictionaryAsync(p => p.Id, ct);

        void Apply(string id, Action<Plan> mutate)
        {
            if (plans.TryGetValue(Guid.Parse(id), out var plan)) mutate(plan);
        }

        // ── Metadata descriptions ─────────────────────────────────────────────
        Apply("00000001-0000-0000-0000-000000000000", p =>
        {
            p.ImageLimitPerListing  = 5;  p.VideoAllowed = false; p.AnalyticsAccess = false;
            p.Description           = "للمستخدمين الأفراد الذين يرغبون في نشر إعلانات محدودة";
            p.ApplicableAccountType = AccountType.Individual;
            p.Features              = "[\"2 إعلانات شهرياً\",\"5 صور لكل إعلان\",\"بحث وتصفح عادي\"]";
        });
        Apply("00000002-0000-0000-0000-000000000000", p =>
        {
            p.ImageLimitPerListing  = 10; p.VideoAllowed = false; p.AnalyticsAccess = false;
            p.Description           = "للمكاتب العقارية الصغيرة والوسيطة";
            p.ApplicableAccountType = AccountType.Office;
            p.Features              = "[\"5 إعلانات شهرياً\",\"10 صور لكل إعلان\",\"3 وكلاء\",\"إعلان مميز واحد\",\"دعم فني\"]";
        });
        Apply("00000003-0000-0000-0000-000000000000", p =>
        {
            p.ImageLimitPerListing  = 20; p.VideoAllowed = true; p.AnalyticsAccess = true;
            p.Description           = "للمكاتب والشركات العقارية المتوسطة والكبيرة";
            p.ApplicableAccountType = null;
            p.Features              = "[\"20 إعلاناً شهرياً\",\"20 صورة لكل إعلان\",\"رفع فيديو\",\"10 وكلاء\",\"5 إعلانات مميزة\",\"لوحة إحصائيات\",\"2 مشروع\"]";
        });
        Apply("00000004-0000-0000-0000-000000000000", p =>
        {
            p.ImageLimitPerListing  = -1; p.VideoAllowed = true; p.AnalyticsAccess = true;
            p.Description           = "للشركات الكبرى وشركات التطوير العقاري";
            p.ApplicableAccountType = AccountType.Company;
            p.Features              = "[\"إعلانات غير محدودة\",\"صور غير محدودة\",\"رفع فيديو\",\"وكلاء غير محدودون\",\"إعلانات مميزة 20\",\"لوحة إحصائيات متقدمة\",\"مشاريع غير محدودة\",\"دعم أولوية\"]";
        });
        Apply("0000000a-0000-0000-0000-000000000000", p =>
        {
            p.ImageLimitPerListing = 30; p.VideoAllowed = true; p.AnalyticsAccess = true;
            p.Description          = "لشركات التطوير العقاري الناشئة — مشاريع متعددة وفرق عمل";
        });
        Apply("0000000b-0000-0000-0000-000000000000", p =>
        {
            p.ImageLimitPerListing = -1;  p.VideoAllowed = true; p.AnalyticsAccess = true;
            p.IsRecommended        = true;
            p.Description          = "لكبرى شركات التطوير العقاري — طاقة غير محدودة ودعم أولوية";
        });

        // ── Name corrections ──────────────────────────────────────────────────
        Apply("00000006-0000-0000-0000-000000000000", p => { if (p.Name == "AgentPro")       p.Name = "BrokerPro"; });
        Apply("00000007-0000-0000-0000-000000000000", p => { if (p.Name == "AgentPremium")   p.Name = "BrokerPremium"; });
        Apply("00000009-0000-0000-0000-000000000000", p => { if (p.Name == "BusinessGrowth") p.Name = "OfficeGrowth"; });

        // ── ApplicableAccountType corrections ─────────────────────────────────
        Apply("00000006-0000-0000-0000-000000000000", p => p.ApplicableAccountType = AccountType.Individual);
        Apply("00000007-0000-0000-0000-000000000000", p => p.ApplicableAccountType = AccountType.Individual);
        Apply("00000008-0000-0000-0000-000000000000", p => p.ApplicableAccountType = AccountType.Office);
        Apply("00000009-0000-0000-0000-000000000000", p => p.ApplicableAccountType = AccountType.Office);

        // ── Rank / DisplayOrder / PlanCategory ───────────────────────────────
        Apply("00000001-0000-0000-0000-000000000000", p => { p.Rank =  0; p.DisplayOrder =  1; p.PlanCategory = "Individual"; });
        Apply("00000002-0000-0000-0000-000000000000", p => { p.Rank =  1; p.DisplayOrder =  2; p.PlanCategory = "Individual"; });
        Apply("00000003-0000-0000-0000-000000000000", p => { p.Rank =  2; p.DisplayOrder =  3; p.PlanCategory = "Individual"; });
        Apply("00000004-0000-0000-0000-000000000000", p => { p.Rank =  3; p.DisplayOrder =  4; p.PlanCategory = "Individual"; });
        Apply("00000005-0000-0000-0000-000000000000", p => { p.Rank = 10; p.DisplayOrder =  0; p.PlanCategory = "Business";   });
        Apply("00000006-0000-0000-0000-000000000000", p => { p.Rank = 11; p.DisplayOrder =  1; p.PlanCategory = "Business";   });
        Apply("00000007-0000-0000-0000-000000000000", p => { p.Rank = 12; p.DisplayOrder =  2; p.PlanCategory = "Business";   });
        Apply("00000008-0000-0000-0000-000000000000", p => { p.Rank = 13; p.DisplayOrder =  3; p.PlanCategory = "Business";   });
        Apply("00000009-0000-0000-0000-000000000000", p => { p.Rank = 14; p.DisplayOrder =  4; p.PlanCategory = "Business";   });
        Apply("0000000a-0000-0000-0000-000000000000", p => { p.Rank = 15; p.DisplayOrder = 15; p.PlanCategory = "Business";   });
        Apply("0000000b-0000-0000-0000-000000000000", p => { p.Rank = 16; p.DisplayOrder = 16; p.PlanCategory = "Business";   });

        // ── Code seeds (only if not already set by an admin) ─────────────────
        var codeMap = new Dictionary<string, string>
        {
            ["00000001-0000-0000-0000-000000000000"] = "free_user",
            ["00000002-0000-0000-0000-000000000000"] = "silver",
            ["00000003-0000-0000-0000-000000000000"] = "gold",
            ["00000004-0000-0000-0000-000000000000"] = "platinum",
            ["00000005-0000-0000-0000-000000000000"] = "owner_pro",
            ["00000006-0000-0000-0000-000000000000"] = "broker_pro",
            ["00000007-0000-0000-0000-000000000000"] = "broker_premium",
            ["00000008-0000-0000-0000-000000000000"] = "office_starter",
            ["00000009-0000-0000-0000-000000000000"] = "office_growth",
            ["0000000a-0000-0000-0000-000000000000"] = "developer_business",
            ["0000000b-0000-0000-0000-000000000000"] = "developer_premium",
        };
        foreach (var (id, code) in codeMap)
            Apply(id, p => { if (string.IsNullOrEmpty(p.Code)) p.Code = code; });

        await _ctx.SaveChangesAsync(ct);
    }

    // ── Plan naming normalization (idempotent, force-updates all 13 plans) ──────
    //
    // Normalizes Code, DisplayNameAr, DisplayNameEn, AudienceType, Tier.
    // Also resets BasePriceMonthly to 0 for every "free" tier plan.
    // Runs AFTER ApplyPlanCorrectionsAsync — safe to run on every startup.

    private async Task ApplyPlanNameNormalizationAsync(CancellationToken ct)
    {
        // Map: planId → (code, displayNameAr, displayNameEn, audienceType, tier, priceMonthly? null=keep)
        var norm = new Dictionary<Guid, (string code, string ar, string en, string audience, string tier, decimal? price)>
        {
            [Guid.Parse("00000001-0000-0000-0000-000000000000")] = ("seeker_free",       "مجاني للباحث",     "Seeker Free",        "seeker",  "free",       0m),
            [Guid.Parse("00000002-0000-0000-0000-000000000000")] = ("seeker_advanced",   "متقدم للباحث",     "Seeker Advanced",    "seeker",  "advanced",   null),
            [Guid.Parse("00000003-0000-0000-0000-000000000000")] = ("owner_free",        "مجاني للمالك",     "Owner Free",         "owner",   "free",       0m),
            [Guid.Parse("00000004-0000-0000-0000-000000000000")] = ("owner_basic",       "أساسي للمالك",     "Owner Basic",        "owner",   "basic",      null),
            [Guid.Parse("00000005-0000-0000-0000-000000000000")] = ("owner_advanced",    "متقدم للمالك",     "Owner Advanced",     "owner",   "advanced",   null),
            [Guid.Parse("00000006-0000-0000-0000-000000000000")] = ("broker_free",       "مجاني للوسيط",     "Broker Free",        "broker",  "free",       0m),
            [Guid.Parse("00000007-0000-0000-0000-000000000000")] = ("broker_basic",      "أساسي للوسيط",     "Broker Basic",       "broker",  "basic",      null),
            [Guid.Parse("00000008-0000-0000-0000-000000000000")] = ("office_free",       "مجاني للمكتب",     "Office Free",        "office",  "free",       0m),
            [Guid.Parse("00000009-0000-0000-0000-000000000000")] = ("office_basic",      "أساسي للمكتب",     "Office Basic",       "office",  "basic",      null),
            [Guid.Parse("0000000a-0000-0000-0000-000000000000")] = ("company_basic",     "أساسي للشركة",     "Company Basic",      "company", "basic",      null),
            [Guid.Parse("0000000b-0000-0000-0000-000000000000")] = ("company_enterprise","مؤسسي للشركة",     "Company Enterprise", "company", "enterprise", null),
            [Guid.Parse("0000000c-0000-0000-0000-000000000000")] = ("broker_advanced",   "متقدم للوسيط",     "Broker Advanced",    "broker",  "advanced",   null),
            [Guid.Parse("0000000d-0000-0000-0000-000000000000")] = ("office_advanced",   "متقدم للمكتب",     "Office Advanced",    "office",  "advanced",   null),
        };

        var planIds = norm.Keys.ToList();
        var plans = await _ctx.Plans
            .IgnoreQueryFilters()
            .Where(p => planIds.Contains(p.Id))
            .ToListAsync(ct);

        foreach (var plan in plans)
        {
            if (!norm.TryGetValue(plan.Id, out var n)) continue;
            plan.Code          = n.code;
            plan.DisplayNameAr = n.ar;
            plan.DisplayNameEn = n.en;
            plan.AudienceType  = n.audience;
            plan.Tier          = n.tier;
            if (n.price.HasValue)
                plan.BasePriceMonthly = n.price.Value;
        }

        await _ctx.SaveChangesAsync(ct);
        _log.LogInformation("Applied plan naming normalization to {Count} plans.", plans.Count);
    }

    // ── Correct mis-assigned subscriptions (seeker_free → role-correct plan) ──
    // Runs on every startup; no-op when there is nothing to fix.

    private async Task CorrectMisassignedSubscriptionsAsync(CancellationToken ct)
    {
        var seekerFreeId = Guid.Parse("00000001-0000-0000-0000-000000000000");

        // Only look at active subscriptions pointing to seeker_free
        var wrongSubs = await _ctx.Subscriptions
            .IgnoreQueryFilters()
            .Where(s => s.IsActive && s.PlanId == seekerFreeId)
            .Include(s => s.Account)
                .ThenInclude(a => a.AccountUsers)
                    .ThenInclude(au => au.User)
            .ToListAsync(ct);

        int corrected = 0;

        foreach (var sub in wrongSubs)
        {
            var primaryAdmin = sub.Account.AccountUsers
                .FirstOrDefault(au => au.IsPrimary)?.User
                ?? sub.Account.AccountUsers.FirstOrDefault()?.User;

            if (primaryAdmin == null) continue;

            // Seeker (User) accounts are correctly on seeker_free — skip them
            if (primaryAdmin.Role == UserRole.User) continue;

            Guid correctPlanId;

            switch (sub.Account.AccountType)
            {
                case AccountType.Individual:
                    // Owner registered as individual
                    correctPlanId = Guid.Parse("00000003-0000-0000-0000-000000000000"); // owner_free
                    break;

                case AccountType.Office:
                    // Broker (independent) gets broker_free; other office roles get office_free
                    correctPlanId = primaryAdmin.Role == UserRole.Broker
                        ? Guid.Parse("00000006-0000-0000-0000-000000000000") // broker_free
                        : Guid.Parse("00000008-0000-0000-0000-000000000000"); // office_free
                    break;

                case AccountType.Company:
                    // CompanyOwner: distinguish RealEstateOffice vs DeveloperCompany
                    var agent = await _ctx.Agents
                        .IgnoreQueryFilters()
                        .Include(a => a.Company)
                        .FirstOrDefaultAsync(a => a.UserId == primaryAdmin.Id, ct);

                    correctPlanId = agent?.Company?.CompanyType == "RealEstateOffice"
                        ? Guid.Parse("00000008-0000-0000-0000-000000000000") // office_free
                        : Guid.Parse("0000000a-0000-0000-0000-000000000000"); // company_basic
                    break;

                default:
                    continue;
            }

            sub.PlanId    = correctPlanId;
            sub.UpdatedAt = DateTime.UtcNow;
            corrected++;
        }

        if (corrected > 0)
        {
            await _ctx.SaveChangesAsync(ct);
            _log.LogInformation(
                "CorrectMisassignedSubscriptions: fixed {Count} subscription(s) from seeker_free to role-appropriate plan.",
                corrected);
        }
        else
        {
            _log.LogDebug("CorrectMisassignedSubscriptions: no mis-assigned subscriptions found.");
        }
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
