using Boioot.Application.Exceptions;
using Boioot.Application.Features.Plans.DTOs;
using Boioot.Application.Features.Plans.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Plans;

public class AdminPlanService : IAdminPlanService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<AdminPlanService> _logger;

    public AdminPlanService(BoiootDbContext db, ILogger<AdminPlanService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── GetAllPlansAsync ──────────────────────────────────────────────────────
    // Uses a safe join-projection approach for limits + features.
    // We deliberately do NOT use Include/ThenInclude because some junction
    // table rows may have invalid (non-hex) GUID values in their Id column,
    // which causes SqliteValueReader.GetGuid() to throw FormatException.
    // By projecting only the columns we need (Key, Value, IsEnabled) EF never
    // reads the junction-table Id columns at all → completely safe.
    public async Task<List<PlanSummaryResponse>> GetAllPlansAsync(CancellationToken ct = default)
    {
        var plans = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .OrderBy(p => p.DisplayOrder)
            .ThenBy(p => p.CreatedAt)
            .ToListAsync(ct);

        if (plans.Count == 0) return [];

        var planIds = plans.Select(p => p.Id).ToHashSet();

        // Reads only (SubscriptionPlanId, Key, Value) — never reads PlanLimit.Id
        var limitPairs = await (
            from pl in _db.Set<PlanLimit>()
            where planIds.Contains(pl.SubscriptionPlanId)
            join ld in _db.Set<LimitDefinition>() on pl.LimitDefinitionId equals ld.Id
            select new { PlanId = pl.SubscriptionPlanId, ld.Key, pl.Value }
        ).ToListAsync(ct);

        // Reads only (SubscriptionPlanId, Key, IsEnabled) — never reads PlanFeature.Id
        var featurePairs = await (
            from pf in _db.Set<PlanFeature>()
            where planIds.Contains(pf.SubscriptionPlanId)
            join fd in _db.Set<FeatureDefinition>() on pf.FeatureDefinitionId equals fd.Id
            select new { PlanId = pf.SubscriptionPlanId, fd.Key, pf.IsEnabled }
        ).ToListAsync(ct);

        var limitsByPlan   = limitPairs  .GroupBy(x => x.PlanId).ToDictionary(g => g.Key, g => g.ToList());
        var featuresByPlan = featurePairs.GroupBy(x => x.PlanId).ToDictionary(g => g.Key, g => g.ToList());

        return plans.Select(p =>
        {
            var lims  = limitsByPlan  .TryGetValue(p.Id, out var l) ? l : [];
            var feats = featuresByPlan.TryGetValue(p.Id, out var f) ? f : [];

            int    LimitVal(string key)  => (int)(lims .FirstOrDefault(x => x.Key == key)?.Value ?? 0);
            bool   FeatEnabled(string key) => feats.Any(x => x.Key == key && x.IsEnabled);

            return new PlanSummaryResponse
            {
                Id                      = p.Id,
                Name                    = p.Name,
                Code                    = p.Code,
                DisplayNameAr           = p.DisplayNameAr,
                DisplayNameEn           = p.DisplayNameEn,
                AudienceType            = p.AudienceType,
                Tier                    = p.Tier,
                Description             = p.Description,
                IsActive                = p.IsActive,
                BasePriceMonthly        = p.BasePriceMonthly,
                BasePriceYearly         = p.BasePriceYearly,
                ApplicableAccountType   = p.ApplicableAccountType?.ToString(),
                CreatedAt               = p.CreatedAt,
                DisplayOrder            = p.DisplayOrder,
                IsPublic                = p.IsPublic,
                IsRecommended           = p.IsRecommended,
                PlanCategory            = p.PlanCategory,
                BillingMode             = p.BillingMode,
                Rank                    = p.Rank,
                BadgeText               = p.BadgeText,
                PlanColor               = p.PlanColor,
                PlanBillingType         = p.PlanBillingType,
                RecurringCycle          = p.RecurringCycle,
                DurationDays            = p.DurationDays,
                ConsumptionPolicy       = p.ConsumptionPolicy,
                ExpiryRule              = p.ExpiryRule,
                DowngradePlanCode       = p.DowngradePlanCode,
                HasTrial                = p.HasTrial,
                TrialDays               = p.TrialDays,
                RequiresPaymentForTrial = p.RequiresPaymentForTrial,
                IsDefaultForNewUsers    = p.IsDefaultForNewUsers,
                AvailableForSelfSignup  = p.AvailableForSelfSignup,
                RequiresAdminApproval   = p.RequiresAdminApproval,
                AllowAddOns             = p.AllowAddOns,
                AllowUpgrade            = p.AllowUpgrade,
                AllowDowngrade          = p.AllowDowngrade,
                AutoDowngradeOnExpiry   = p.AutoDowngradeOnExpiry,
                // ── Key Limits ──────────────────────────────────────────────
                ListingsLimit    = LimitVal("max_active_listings"),
                AgentsLimit      = LimitVal("max_agents"),
                ProjectsLimit    = LimitVal("max_projects"),
                ImagesPerListing = LimitVal("max_images_per_listing"),
                FeaturedSlots    = LimitVal("max_featured_slots"),
                // ── Feature Indicators ───────────────────────────────────────
                HasAnalytics        = FeatEnabled("analytics_dashboard"),
                HasFeaturedListings = FeatEnabled("featured_listings"),
                HasProjectMgmt      = FeatEnabled("project_management"),
                HasWhatsApp         = FeatEnabled("whatsapp_contact"),
                HasVerifiedBadge    = FeatEnabled("verified_badge"),
                HasPrioritySupport  = FeatEnabled("priority_support"),
            };
        }).ToList();
    }

    // ── GetPlanDetailAsync ────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> GetPlanDetailAsync(Guid planId, CancellationToken ct = default)
    {
        // ── Step 1: Purge orphaned junction rows (FK safety, portable EF delete) ────
        try
        {
            var validFdIds = await _db.Set<FeatureDefinition>()
                .Select(fd => fd.Id).ToListAsync(ct);
            await _db.Set<PlanFeature>()
                .Where(pf => pf.SubscriptionPlanId == planId && !validFdIds.Contains(pf.FeatureDefinitionId))
                .ExecuteDeleteAsync(ct);

            var validLdIds = await _db.Set<LimitDefinition>()
                .Select(ld => ld.Id).ToListAsync(ct);
            await _db.Set<PlanLimit>()
                .Where(pl => pl.SubscriptionPlanId == planId && !validLdIds.Contains(pl.LimitDefinitionId))
                .ExecuteDeleteAsync(ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning("Orphan cleanup skipped for plan {PlanId}: {Msg}", planId, ex.Message);
        }

        // ── Step 2: Load plan with navigation properties ──────────────────────
        var plan = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .Include(p => p.PlanLimits)
                .ThenInclude(pl => pl.LimitDefinition)
            .Include(p => p.PlanFeatures)
                .ThenInclude(pf => pf.FeatureDefinition)
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة غير موجودة", 404);

        // ── Step 3: Auto-ensure rows exist for every active definition ────────
        bool dirty = false;

        var allLimitDefs = await _db.Set<LimitDefinition>()
            .Where(ld => ld.IsActive).ToListAsync(ct);
        var existingLimitIds = plan.PlanLimits
            .Select(pl => pl.LimitDefinitionId).ToHashSet();
        foreach (var ld in allLimitDefs.Where(ld => !existingLimitIds.Contains(ld.Id)))
        {
            _db.Set<PlanLimit>().Add(new PlanLimit
            {
                SubscriptionPlanId = plan.Id,
                LimitDefinitionId  = ld.Id,
                Value              = 0
            });
            dirty = true;
        }

        var allFeatureDefs = await _db.Set<FeatureDefinition>()
            .Where(fd => fd.IsActive).ToListAsync(ct);
        var existingFeatureIds = plan.PlanFeatures
            .Select(pf => pf.FeatureDefinitionId).ToHashSet();
        foreach (var fd in allFeatureDefs.Where(fd => !existingFeatureIds.Contains(fd.Id)))
        {
            _db.Set<PlanFeature>().Add(new PlanFeature
            {
                SubscriptionPlanId  = plan.Id,
                FeatureDefinitionId = fd.Id,
                IsEnabled           = false
            });
            dirty = true;
        }

        if (dirty)
        {
            try
            {
                await _db.SaveChangesAsync(ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning("Auto-populate SaveChanges skipped for plan {PlanId}: {Msg}", planId, ex.Message);
                _db.ChangeTracker.Clear();
            }

            plan = await _db.Set<Plan>()
                .IgnoreQueryFilters()
                .Include(p => p.PlanLimits)
                    .ThenInclude(pl => pl.LimitDefinition)
                .Include(p => p.PlanFeatures)
                    .ThenInclude(pf => pf.FeatureDefinition)
                .FirstOrDefaultAsync(p => p.Id == planId, ct)!;
        }

        return MapToDetail(plan!);
    }

    // ── CreatePlanAsync ───────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> CreatePlanAsync(CreatePlanRequest request, CancellationToken ct = default)
    {
        AccountType? accountType = null;
        if (!string.IsNullOrWhiteSpace(request.ApplicableAccountType) &&
            Enum.TryParse<AccountType>(request.ApplicableAccountType, out var at))
            accountType = at;

        var plan = new Plan
        {
            Name                    = request.Name.Trim(),
            DisplayNameAr           = string.IsNullOrWhiteSpace(request.DisplayNameAr) ? null : request.DisplayNameAr.Trim(),
            DisplayNameEn           = string.IsNullOrWhiteSpace(request.DisplayNameEn) ? null : request.DisplayNameEn.Trim(),
            AudienceType            = string.IsNullOrWhiteSpace(request.AudienceType)  ? null : request.AudienceType.Trim().ToLowerInvariant(),
            Tier                    = string.IsNullOrWhiteSpace(request.Tier)           ? null : request.Tier.Trim().ToLowerInvariant(),
            Description             = request.Description?.Trim(),
            BasePriceMonthly        = request.BasePriceMonthly,
            BasePriceYearly         = request.BasePriceYearly,
            ApplicableAccountType   = accountType,
            DisplayOrder            = request.DisplayOrder,
            BadgeText               = string.IsNullOrWhiteSpace(request.BadgeText)    ? null : request.BadgeText.Trim(),
            PlanColor               = string.IsNullOrWhiteSpace(request.PlanColor)    ? null : request.PlanColor.Trim(),
            PlanCategory            = string.IsNullOrWhiteSpace(request.PlanCategory) ? null : request.PlanCategory.Trim(),
            BillingMode             = string.IsNullOrWhiteSpace(request.BillingMode)  ? "InternalOnly" : request.BillingMode.Trim(),
            PlanBillingType         = string.IsNullOrWhiteSpace(request.PlanBillingType) ? "recurring" : request.PlanBillingType.Trim(),
            RecurringCycle          = string.IsNullOrWhiteSpace(request.RecurringCycle)  ? null : request.RecurringCycle.Trim(),
            DurationDays            = request.DurationDays,
            ConsumptionPolicy       = string.IsNullOrWhiteSpace(request.ConsumptionPolicy) ? "none" : request.ConsumptionPolicy.Trim(),
            ExpiryRule              = string.IsNullOrWhiteSpace(request.ExpiryRule) ? "expire_by_date" : request.ExpiryRule.Trim(),
            DowngradePlanCode       = string.IsNullOrWhiteSpace(request.DowngradePlanCode) ? null : request.DowngradePlanCode.Trim(),
            IsActive                = true,
            HasTrial                = request.HasTrial,
            TrialDays               = request.TrialDays,
            RequiresPaymentForTrial = request.RequiresPaymentForTrial,
            IsDefaultForNewUsers    = request.IsDefaultForNewUsers,
            AvailableForSelfSignup  = request.AvailableForSelfSignup,
            RequiresAdminApproval   = request.RequiresAdminApproval,
            AllowAddOns             = request.AllowAddOns,
            AllowUpgrade            = request.AllowUpgrade,
            AllowDowngrade          = request.AllowDowngrade,
            AutoDowngradeOnExpiry   = request.AutoDowngradeOnExpiry,
        };

        _db.Set<Plan>().Add(plan);
        await _db.SaveChangesAsync(ct);

        // Auto-create PlanLimit rows for all active LimitDefinitions (default 0)
        var limitDefs = await _db.Set<LimitDefinition>()
            .Where(ld => ld.IsActive)
            .ToListAsync(ct);

        foreach (var ld in limitDefs)
        {
            _db.Set<PlanLimit>().Add(new PlanLimit
            {
                SubscriptionPlanId = plan.Id,
                LimitDefinitionId  = ld.Id,
                Value              = 0
            });
        }

        // Auto-create PlanFeature rows for all active FeatureDefinitions (default disabled)
        var featureDefs = await _db.Set<FeatureDefinition>()
            .Where(fd => fd.IsActive)
            .ToListAsync(ct);

        foreach (var fd in featureDefs)
        {
            _db.Set<PlanFeature>().Add(new PlanFeature
            {
                SubscriptionPlanId  = plan.Id,
                FeatureDefinitionId = fd.Id,
                IsEnabled           = false
            });
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan created: {PlanId} — {Name}", plan.Id, plan.Name);

        return await GetPlanDetailAsync(plan.Id, ct);
    }

    // ── UpdatePlanAsync ───────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> UpdatePlanAsync(
        Guid planId, UpdatePlanRequest request, CancellationToken ct = default)
    {
        var plan = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة غير موجودة", 404);

        AccountType? accountType = null;
        if (!string.IsNullOrWhiteSpace(request.ApplicableAccountType) &&
            Enum.TryParse<AccountType>(request.ApplicableAccountType, out var at))
            accountType = at;

        plan.Name                    = request.Name.Trim();
        plan.DisplayNameAr           = string.IsNullOrWhiteSpace(request.DisplayNameAr) ? null : request.DisplayNameAr.Trim();
        plan.DisplayNameEn           = string.IsNullOrWhiteSpace(request.DisplayNameEn) ? null : request.DisplayNameEn.Trim();
        plan.AudienceType            = string.IsNullOrWhiteSpace(request.AudienceType)  ? null : request.AudienceType.Trim().ToLowerInvariant();
        plan.Tier                    = string.IsNullOrWhiteSpace(request.Tier)           ? null : request.Tier.Trim().ToLowerInvariant();
        plan.Description             = request.Description?.Trim();
        plan.BasePriceMonthly        = request.BasePriceMonthly;
        plan.BasePriceYearly         = request.BasePriceYearly;
        plan.IsActive                = request.IsActive;
        plan.ApplicableAccountType   = accountType;
        plan.DisplayOrder            = request.DisplayOrder;
        plan.IsPublic                = request.IsPublic;
        plan.IsRecommended           = request.IsRecommended;
        plan.PlanCategory            = request.PlanCategory?.Trim();
        plan.BillingMode             = request.BillingMode;
        plan.BadgeText               = string.IsNullOrWhiteSpace(request.BadgeText) ? null : request.BadgeText.Trim();
        plan.PlanColor               = string.IsNullOrWhiteSpace(request.PlanColor)  ? null : request.PlanColor.Trim();
        plan.HasTrial                = request.HasTrial;
        plan.TrialDays               = request.TrialDays;
        plan.RequiresPaymentForTrial = request.RequiresPaymentForTrial;
        plan.IsDefaultForNewUsers    = request.IsDefaultForNewUsers;
        plan.AvailableForSelfSignup  = request.AvailableForSelfSignup;
        plan.RequiresAdminApproval   = request.RequiresAdminApproval;
        plan.AllowAddOns             = request.AllowAddOns;
        plan.AllowUpgrade            = request.AllowUpgrade;
        plan.AllowDowngrade          = request.AllowDowngrade;
        plan.AutoDowngradeOnExpiry   = request.AutoDowngradeOnExpiry;
        plan.PlanBillingType         = string.IsNullOrWhiteSpace(request.PlanBillingType) ? "recurring" : request.PlanBillingType.Trim();
        plan.RecurringCycle          = string.IsNullOrWhiteSpace(request.RecurringCycle)  ? null : request.RecurringCycle.Trim();
        plan.DurationDays            = request.DurationDays;
        plan.ConsumptionPolicy       = string.IsNullOrWhiteSpace(request.ConsumptionPolicy) ? "none" : request.ConsumptionPolicy.Trim();
        plan.ExpiryRule              = string.IsNullOrWhiteSpace(request.ExpiryRule) ? "expire_by_date" : request.ExpiryRule.Trim();
        plan.DowngradePlanCode       = string.IsNullOrWhiteSpace(request.DowngradePlanCode) ? null : request.DowngradePlanCode.Trim();

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan updated: {PlanId} — {Name}", plan.Id, plan.Name);

        return await GetPlanDetailAsync(plan.Id, ct);
    }

    // ── DeletePlanAsync ───────────────────────────────────────────────────────
    public async Task DeletePlanAsync(Guid planId, CancellationToken ct = default)
    {
        var plan = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == planId, ct)
            ?? throw new BoiootException("الخطة غير موجودة", 404);

        var hasActiveSubscriptions = await _db.Subscriptions
            .AnyAsync(s => s.PlanId == planId && s.IsActive, ct);

        if (hasActiveSubscriptions)
            throw new BoiootException(
                "لا يمكن أرشفة الخطة — يوجد حسابات مشتركة بها حالياً", 409);

        plan.IsActive = false;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan archived: {PlanId}", planId);
    }

    // ── DuplicatePlanAsync ────────────────────────────────────────────────────
    public async Task<PlanDetailResponse> DuplicatePlanAsync(Guid sourcePlanId, CancellationToken ct = default)
    {
        var source = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .Include(p => p.PlanLimits)
            .Include(p => p.PlanFeatures)
            .FirstOrDefaultAsync(p => p.Id == sourcePlanId, ct)
            ?? throw new BoiootException("الخطة المصدر غير موجودة", 404);

        var copy = new Plan
        {
            Name                    = $"{source.Name} (نسخة)",
            Code                    = null,
            DisplayNameAr           = source.DisplayNameAr != null ? $"{source.DisplayNameAr} (نسخة)" : null,
            DisplayNameEn           = source.DisplayNameEn != null ? $"{source.DisplayNameEn} (Copy)" : null,
            AudienceType            = source.AudienceType,
            Tier                    = source.Tier,
            Description             = source.Description,
            BasePriceMonthly        = source.BasePriceMonthly,
            BasePriceYearly         = source.BasePriceYearly,
            ApplicableAccountType   = source.ApplicableAccountType,
            DisplayOrder            = source.DisplayOrder + 1,
            BadgeText               = source.BadgeText,
            PlanColor               = source.PlanColor,
            IsActive                = false,
            IsPublic                = false,
            IsRecommended           = false,
            PlanCategory            = source.PlanCategory,
            BillingMode             = source.BillingMode,
            Rank                    = source.Rank,
            PlanBillingType         = source.PlanBillingType,
            RecurringCycle          = source.RecurringCycle,
            DurationDays            = source.DurationDays,
            ConsumptionPolicy       = source.ConsumptionPolicy,
            ExpiryRule              = source.ExpiryRule,
            DowngradePlanCode       = source.DowngradePlanCode,
            HasTrial                = source.HasTrial,
            TrialDays               = source.TrialDays,
            RequiresPaymentForTrial = source.RequiresPaymentForTrial,
            IsDefaultForNewUsers    = false,
            AvailableForSelfSignup  = source.AvailableForSelfSignup,
            RequiresAdminApproval   = source.RequiresAdminApproval,
            AllowAddOns             = source.AllowAddOns,
            AllowUpgrade            = source.AllowUpgrade,
            AllowDowngrade          = source.AllowDowngrade,
            AutoDowngradeOnExpiry   = source.AutoDowngradeOnExpiry,
        };

        _db.Set<Plan>().Add(copy);
        await _db.SaveChangesAsync(ct);

        foreach (var srcLimit in source.PlanLimits)
        {
            _db.Set<PlanLimit>().Add(new PlanLimit
            {
                SubscriptionPlanId = copy.Id,
                LimitDefinitionId  = srcLimit.LimitDefinitionId,
                Value              = srcLimit.Value
            });
        }

        foreach (var srcFeat in source.PlanFeatures)
        {
            _db.Set<PlanFeature>().Add(new PlanFeature
            {
                SubscriptionPlanId  = copy.Id,
                FeatureDefinitionId = srcFeat.FeatureDefinitionId,
                IsEnabled           = srcFeat.IsEnabled
            });
        }

        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Plan duplicated: {SourceId} → {CopyId}", sourcePlanId, copy.Id);

        return await GetPlanDetailAsync(copy.Id, ct);
    }

    // ── SetLimitAsync ─────────────────────────────────────────────────────────
    // SAFE: uses raw SQL UPDATE/INSERT to avoid EF materialising PlanLimit.Id.
    // Reading PlanLimit.Id via EF fails for rows whose Id is stored as a
    // non-hex string in SQLite (FormatException → 500). Raw SQL never touches
    // the Id column on reads.
    public async Task<PlanLimitItem> SetLimitAsync(
        Guid planId, string limitKey, int value, CancellationToken ct = default)
    {
        var planExists = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .AnyAsync(p => p.Id == planId, ct);
        if (!planExists)
            throw new BoiootException("الخطة غير موجودة", 404);

        var limitDef = await _db.Set<LimitDefinition>()
            .FirstOrDefaultAsync(ld => ld.Key == limitKey && ld.IsActive, ct)
            ?? throw new BoiootException($"تعريف الحد '{limitKey}' غير موجود", 404);

        // Use EF change tracker for upsert — avoids the DbType.Guid → binary blob
        // issue that affected ExecuteSqlRawAsync on Microsoft.Data.Sqlite.
        // EF Core's own parameterization converts Guid to TEXT correctly.
        var existing = await _db.Set<PlanLimit>()
            .FirstOrDefaultAsync(pl => pl.SubscriptionPlanId == planId && pl.LimitDefinitionId == limitDef.Id, ct);

        bool inserted;
        if (existing is not null)
        {
            existing.Value = value;
            inserted = false;
        }
        else
        {
            _db.Set<PlanLimit>().Add(new PlanLimit
            {
                SubscriptionPlanId = planId,
                LimitDefinitionId  = limitDef.Id,
                Value              = value,
            });
            inserted = true;
        }
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("SetLimit: plan={PlanId} key={Key} value={Value} (op={N})",
            planId, limitKey, value, inserted ? "inserted" : "updated");

        return new PlanLimitItem
        {
            LimitDefinitionId = limitDef.Id,
            Key               = limitDef.Key,
            Name              = limitDef.Name,
            Unit              = limitDef.Unit,
            Value             = value
        };
    }

    // ── SetFeatureAsync ───────────────────────────────────────────────────────
    public async Task<PlanFeatureItem> SetFeatureAsync(
        Guid planId, string featureKey, bool isEnabled, CancellationToken ct = default)
    {
        var planExists = await _db.Set<Plan>()
            .IgnoreQueryFilters()
            .AnyAsync(p => p.Id == planId, ct);
        if (!planExists)
            throw new BoiootException("الخطة غير موجودة", 404);

        var featureDef = await _db.Set<FeatureDefinition>()
            .FirstOrDefaultAsync(fd => fd.Key == featureKey && fd.IsActive, ct)
            ?? throw new BoiootException($"تعريف الميزة '{featureKey}' غير موجود", 404);

        // Use EF change tracker for upsert — avoids the DbType.Guid → binary blob
        // issue that affected ExecuteSqlRawAsync on Microsoft.Data.Sqlite.
        var existing = await _db.Set<PlanFeature>()
            .FirstOrDefaultAsync(pf => pf.SubscriptionPlanId == planId && pf.FeatureDefinitionId == featureDef.Id, ct);

        bool inserted;
        if (existing is not null)
        {
            existing.IsEnabled = isEnabled;
            inserted = false;
        }
        else
        {
            _db.Set<PlanFeature>().Add(new PlanFeature
            {
                SubscriptionPlanId  = planId,
                FeatureDefinitionId = featureDef.Id,
                IsEnabled           = isEnabled,
            });
            inserted = true;
        }
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("SetFeature: plan={PlanId} key={Key} enabled={IsEnabled} (op={N})",
            planId, featureKey, isEnabled, inserted ? "inserted" : "updated");

        return new PlanFeatureItem
        {
            FeatureDefinitionId = featureDef.Id,
            Key                 = featureDef.Key,
            Name                = featureDef.Name,
            Description         = featureDef.Description,
            FeatureGroup        = featureDef.FeatureGroup,
            Icon                = featureDef.Icon,
            IsEnabled           = isEnabled
        };
    }

    // ── Mapping helpers ───────────────────────────────────────────────────────

    private static int LimitValue(Plan p, string key)
    {
        var row = p.PlanLimits
            .FirstOrDefault(pl => pl.LimitDefinition?.Key == key);
        return row is null ? 0 : (int)row.Value;
    }

    private static bool FeatureEnabled(Plan p, string key)
        => p.PlanFeatures
            .Any(pf => pf.FeatureDefinition?.Key == key && pf.IsEnabled);

    private static PlanSummaryResponse MapToSummary(Plan p) => new()
    {
        Id                      = p.Id,
        Name                    = p.Name,
        Code                    = p.Code,
        DisplayNameAr           = p.DisplayNameAr,
        DisplayNameEn           = p.DisplayNameEn,
        AudienceType            = p.AudienceType,
        Tier                    = p.Tier,
        Description             = p.Description,
        IsActive                = p.IsActive,
        BasePriceMonthly        = p.BasePriceMonthly,
        BasePriceYearly         = p.BasePriceYearly,
        ApplicableAccountType   = p.ApplicableAccountType?.ToString(),
        CreatedAt               = p.CreatedAt,
        DisplayOrder            = p.DisplayOrder,
        IsPublic                = p.IsPublic,
        IsRecommended           = p.IsRecommended,
        PlanCategory            = p.PlanCategory,
        BillingMode             = p.BillingMode,
        Rank                    = p.Rank,
        BadgeText               = p.BadgeText,
        PlanColor               = p.PlanColor,
        HasTrial                = p.HasTrial,
        TrialDays               = p.TrialDays,
        RequiresPaymentForTrial = p.RequiresPaymentForTrial,
        IsDefaultForNewUsers    = p.IsDefaultForNewUsers,
        AvailableForSelfSignup  = p.AvailableForSelfSignup,
        RequiresAdminApproval   = p.RequiresAdminApproval,
        AllowAddOns             = p.AllowAddOns,
        AllowUpgrade            = p.AllowUpgrade,
        AllowDowngrade          = p.AllowDowngrade,
        AutoDowngradeOnExpiry   = p.AutoDowngradeOnExpiry,
        // ── Key Limits ──────────────────────────────────────────────────────
        ListingsLimit     = LimitValue(p, "max_active_listings"),
        AgentsLimit       = LimitValue(p, "max_agents"),
        ProjectsLimit     = LimitValue(p, "max_projects"),
        ImagesPerListing  = LimitValue(p, "max_images_per_listing"),
        FeaturedSlots     = LimitValue(p, "max_featured_slots"),
        // ── Feature Indicators ───────────────────────────────────────────────
        HasAnalytics        = FeatureEnabled(p, "analytics_dashboard"),
        HasFeaturedListings = FeatureEnabled(p, "featured_listings"),
        HasProjectMgmt      = FeatureEnabled(p, "project_management"),
        HasWhatsApp         = FeatureEnabled(p, "whatsapp_contact"),
        HasVerifiedBadge    = FeatureEnabled(p, "verified_badge"),
        HasPrioritySupport  = FeatureEnabled(p, "priority_support"),
    };

    private static PlanDetailResponse MapToDetail(Plan p) => new()
    {
        Id                      = p.Id,
        Name                    = p.Name,
        Code                    = p.Code,
        DisplayNameAr           = p.DisplayNameAr,
        DisplayNameEn           = p.DisplayNameEn,
        AudienceType            = p.AudienceType,
        Tier                    = p.Tier,
        Description             = p.Description,
        IsActive                = p.IsActive,
        BasePriceMonthly        = p.BasePriceMonthly,
        BasePriceYearly         = p.BasePriceYearly,
        ApplicableAccountType   = p.ApplicableAccountType?.ToString(),
        CreatedAt               = p.CreatedAt,
        DisplayOrder            = p.DisplayOrder,
        IsPublic                = p.IsPublic,
        IsRecommended           = p.IsRecommended,
        PlanCategory            = p.PlanCategory,
        BillingMode             = p.BillingMode,
        Rank                    = p.Rank,
        BadgeText               = p.BadgeText,
        PlanColor               = p.PlanColor,
        PlanBillingType         = p.PlanBillingType,
        RecurringCycle          = p.RecurringCycle,
        DurationDays            = p.DurationDays,
        ConsumptionPolicy       = p.ConsumptionPolicy,
        ExpiryRule              = p.ExpiryRule,
        DowngradePlanCode       = p.DowngradePlanCode,
        HasTrial                = p.HasTrial,
        TrialDays               = p.TrialDays,
        RequiresPaymentForTrial = p.RequiresPaymentForTrial,
        IsDefaultForNewUsers    = p.IsDefaultForNewUsers,
        AvailableForSelfSignup  = p.AvailableForSelfSignup,
        RequiresAdminApproval   = p.RequiresAdminApproval,
        AllowAddOns             = p.AllowAddOns,
        AllowUpgrade            = p.AllowUpgrade,
        AllowDowngrade          = p.AllowDowngrade,
        AutoDowngradeOnExpiry   = p.AutoDowngradeOnExpiry,
        // ── Key Limits (denormalized from PlanLimits) ────────────────────────
        ListingsLimit     = LimitValue(p, "max_active_listings"),
        AgentsLimit       = LimitValue(p, "max_agents"),
        ProjectsLimit     = LimitValue(p, "max_projects"),
        ImagesPerListing  = LimitValue(p, "max_images_per_listing"),
        FeaturedSlots     = LimitValue(p, "max_featured_slots"),
        // ── Feature Indicators (denormalized from PlanFeatures) ──────────────
        HasAnalytics        = FeatureEnabled(p, "analytics_dashboard"),
        HasFeaturedListings = FeatureEnabled(p, "featured_listings"),
        HasProjectMgmt      = FeatureEnabled(p, "project_management"),
        HasWhatsApp         = FeatureEnabled(p, "whatsapp_contact"),
        HasVerifiedBadge    = FeatureEnabled(p, "verified_badge"),
        HasPrioritySupport  = FeatureEnabled(p, "priority_support"),
        // ── Full Limits + Features arrays ────────────────────────────────────
        Limits = p.PlanLimits
            .Where(pl => pl.LimitDefinition != null)
            .OrderBy(pl => pl.LimitDefinition.Key)
            .Select(pl => new PlanLimitItem
            {
                LimitDefinitionId = pl.LimitDefinitionId,
                Key               = pl.LimitDefinition.Key,
                Name              = pl.LimitDefinition.Name,
                Unit              = pl.LimitDefinition.Unit,
                Value             = (int)pl.Value
            }).ToList(),
        Features = p.PlanFeatures
            .Where(pf => pf.FeatureDefinition != null)
            .OrderBy(pf => pf.FeatureDefinition.FeatureGroup)
            .ThenBy(pf => pf.FeatureDefinition.Key)
            .Select(pf => new PlanFeatureItem
            {
                FeatureDefinitionId = pf.FeatureDefinitionId,
                Key                 = pf.FeatureDefinition.Key,
                Name                = pf.FeatureDefinition.Name,
                Description         = pf.FeatureDefinition.Description,
                FeatureGroup        = pf.FeatureDefinition.FeatureGroup,
                Icon                = pf.FeatureDefinition.Icon,
                IsEnabled           = pf.IsEnabled
            }).ToList()
    };
}
