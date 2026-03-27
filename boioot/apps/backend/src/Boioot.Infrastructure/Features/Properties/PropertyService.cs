using Boioot.Application.Common.Models;
using Boioot.Application.Common.Services;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Properties.Interfaces;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Properties;

public class PropertyService : IPropertyService
{
    private readonly BoiootDbContext _context;
    private readonly ICompanyOwnershipService _ownership;
    private readonly IPlanEntitlementService _entitlement;
    private readonly IAccountResolver _accountResolver;
    private readonly ILogger<PropertyService> _logger;

    public PropertyService(
        BoiootDbContext context,
        ICompanyOwnershipService ownership,
        IPlanEntitlementService entitlement,
        IAccountResolver accountResolver,
        ILogger<PropertyService> logger)
    {
        _context        = context;
        _ownership      = ownership;
        _entitlement    = entitlement;
        _accountResolver = accountResolver;
        _logger         = logger;
    }

    public async Task<PagedResult<PropertyResponse>> GetPublicListAsync(
        PropertyFilters filters, CancellationToken ct = default)
    {
        var page = Math.Max(1, filters.Page);
        var pageSize = Math.Clamp(filters.PageSize, 1, 50);

        var query = _context.Properties
            .AsNoTracking()
            .Include(p => p.Company)
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.Status == PropertyStatus.Available);

        query = ApplyFilters(query, filters);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PropertyResponse>(
            items.Select(MapToResponse).ToList(),
            page, pageSize, total);
    }

    public async Task<PropertyResponse> GetByIdPublicAsync(Guid id, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .AsNoTracking()
            .Include(p => p.Company)
            .Include(p => p.Images)
            .Include(p => p.AmenitySelections).ThenInclude(s => s.Amenity)
            .FirstOrDefaultAsync(p => p.Id == id && p.Status != PropertyStatus.Inactive, ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        // Atomic view counter increment — portable EF bulk update (no round-trip load)
        await _context.Properties
            .Where(p => p.Id == id)
            .ExecuteUpdateAsync(s => s.SetProperty(p => p.ViewCount, p => p.ViewCount + 1), ct);
        property.ViewCount++;

        var response = MapToResponse(property);

        // ── Advertiser info backfill ──────────────────────────────────────────
        // Priority: OwnerId → AgentId (Agent.UserId) → first agent of company
        // For each resolved user: fill name, phone, photo, recipientId
        // Fall back to company data when user data is missing.

        string? resolvedRecipientId = null;

        if (!string.IsNullOrEmpty(property.OwnerId) &&
            Guid.TryParse(property.OwnerId, out var ownerGuid))
        {
            // Case 1: personal listing — owner is a registered user
            var user = await _context.Users
                .AsNoTracking()
                .Select(u => new { u.Id, u.FullName, u.Phone, u.ProfileImageUrl })
                .FirstOrDefaultAsync(u => u.Id == ownerGuid, ct);
            if (user != null)
            {
                resolvedRecipientId = user.Id.ToString();
                response.OwnerName  = user.FullName;
                response.OwnerPhone = !string.IsNullOrEmpty(user.Phone) ? user.Phone : property.Company?.Phone;
                response.OwnerPhoto = !string.IsNullOrEmpty(user.ProfileImageUrl)
                    ? user.ProfileImageUrl
                    : property.Company?.LogoUrl;
            }
        }
        else if (property.AgentId.HasValue)
        {
            // Case 2: agent-assigned listing — resolve the agent's user
            var agent = await _context.Set<Agent>()
                .AsNoTracking()
                .Where(a => a.Id == property.AgentId.Value)
                .Select(a => new { a.UserId, a.User.FullName, a.User.Phone, a.User.ProfileImageUrl })
                .FirstOrDefaultAsync(ct);
            if (agent != null)
            {
                resolvedRecipientId = agent.UserId.ToString();
                response.OwnerName  = agent.FullName;
                response.OwnerPhone = !string.IsNullOrEmpty(agent.Phone) ? agent.Phone : property.Company?.Phone;
                response.OwnerPhoto = !string.IsNullOrEmpty(agent.ProfileImageUrl)
                    ? agent.ProfileImageUrl
                    : property.Company?.LogoUrl;
            }
            else
            {
                response.OwnerName  = property.Company?.Name;
                response.OwnerPhone = property.Company?.Phone;
                response.OwnerPhoto = property.Company?.LogoUrl;
            }
        }
        else
        {
            // Case 3: old/company listing — no OwnerId, no AgentId
            // Fallback: find any active agent of this company to serve as recipient
            var companyAgent = await _context.Set<Agent>()
                .AsNoTracking()
                .Where(a => a.CompanyId == property.CompanyId)
                .OrderBy(a => a.Id)
                .Select(a => new { a.UserId, a.User.FullName, a.User.Phone, a.User.ProfileImageUrl })
                .FirstOrDefaultAsync(ct);

            if (companyAgent != null)
            {
                resolvedRecipientId = companyAgent.UserId.ToString();
                response.OwnerName  = property.Company?.Name ?? companyAgent.FullName;
                response.OwnerPhone = !string.IsNullOrEmpty(property.Company?.Phone)
                    ? property.Company.Phone
                    : companyAgent.Phone;
                response.OwnerPhoto = !string.IsNullOrEmpty(property.Company?.LogoUrl)
                    ? property.Company.LogoUrl
                    : companyAgent.ProfileImageUrl;
            }
            else
            {
                // Absolute last resort: only company data, no chat recipient
                response.OwnerName  = property.Company?.Name;
                response.OwnerPhone = property.Company?.Phone;
                response.OwnerPhoto = property.Company?.LogoUrl;
            }
        }

        response.RecipientId = resolvedRecipientId;

        return response;
    }

    public async Task<PropertyResponse> GetByIdDashboardAsync(
        Guid userId, string userRole, Guid propertyId, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .Include(p => p.Company)
            .Include(p => p.Images)
            .Include(p => p.AmenitySelections).ThenInclude(s => s.Amenity)
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        await EnsureCanManagePropertyAsync(userId, userRole, property, ct);

        return MapToResponse(property);
    }

    public async Task<PropertyResponse> CreateAsync(
        Guid userId, string userRole, CreatePropertyRequest request, CancellationToken ct = default)
    {
        Guid companyId;

        if (request.CompanyId.HasValue)
        {
            companyId = request.CompanyId.Value;

            var companyExists = await _context.Companies
                .AnyAsync(c => c.Id == companyId, ct);

            if (!companyExists)
                throw new BoiootException("الشركة غير موجودة", 404);

            await EnsureCanManageCompanyAsync(userId, userRole, companyId, ct);
        }
        else
        {
            if (userRole == RoleNames.Admin)
                throw new BoiootException("يجب تحديد الشركة عند إنشاء عقار من حساب المشرف", 400);

            var ownedCompanyId = await _ownership.GetCompanyIdForUserAsync(userId, ct);

            if (!ownedCompanyId.HasValue)
            {
                if (userRole is RoleNames.CompanyOwner or RoleNames.Broker)
                {
                    var user = await _context.Users.FirstAsync(u => u.Id == userId, ct);
                    var autoCompany = new Company { Name = user.FullName, Email = user.Email };
                    _context.Companies.Add(autoCompany);
                    var autoAgent = new Agent { UserId = userId, CompanyId = autoCompany.Id };
                    _context.Agents.Add(autoAgent);
                    await _context.SaveChangesAsync(ct);
                    companyId = autoCompany.Id;
                    _logger.LogInformation(
                        "Auto-created Company '{Name}' and Agent for {UserId} ({Role}) during property creation",
                        autoCompany.Name, userId, userRole);
                }
                else
                {
                    throw new BoiootException("لا توجد شركة مرتبطة بحسابك — يرجى إنشاء شركة أولاً أو تحديد معرف الشركة", 400);
                }
            }
            else
            {
                companyId = ownedCompanyId.Value;
            }
        }

        // ── Subscription enforcement (company listing path) ───────────────
        // Admin with no account → allowed (admin bypass).
        // CompanyOwner with account → plan limits enforced via PlanEntitlementService.
        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (accountId.HasValue)
        {
            var canCreate = await _entitlement.CanCreatePropertyAsync(accountId.Value, ct);
            if (!canCreate)
            {
                var planLimit   = (int)await _entitlement.GetLimitAsync(accountId.Value, SubscriptionKeys.MaxActiveListings, ct);
                var activeCount = await _context.Properties
                    .Where(p => p.AccountId == accountId.Value
                             && p.IsDeleted == false
                             && (p.Status == PropertyStatus.Available || p.Status == PropertyStatus.Inactive))
                    .CountAsync(ct);
                var planCode    = await _entitlement.GetActivePlanCodeAsync(accountId.Value, ct);
                throw new PlanLimitException(
                    SubscriptionKeys.MaxActiveListings,
                    "لقد وصلت إلى الحد الأقصى من الإعلانات في خطتك الحالية. يرجى ترقية خطتك للمتابعة.",
                    currentValue:      activeCount,
                    planLimit:         planLimit,
                    suggestedPlanCode: SubscriptionKeys.GetOfficeSuggestedUpgrade(planCode));
            }

            // Enforce video_upload feature + max_videos_per_listing limit
            if (!string.IsNullOrWhiteSpace(request.VideoUrl))
            {
                var canVideo = await _entitlement.CanUploadVideoAsync(accountId.Value, ct);
                if (!canVideo)
                    throw new PlanLimitException(
                        SubscriptionKeys.VideoUpload,
                        "رفع الفيديو غير متاح في باقتك الحالية. يرجى ترقية خطتك للمتابعة.",
                        upgradeRequired: true);

                var videoLimit = (int)await _entitlement.GetLimitAsync(accountId.Value, SubscriptionKeys.MaxVideosPerListing, ct);
                if (videoLimit == 0)
                    throw new PlanLimitException(
                        SubscriptionKeys.MaxVideosPerListing,
                        "الباقة الحالية لا تسمح بإضافة فيديو للإعلان. يرجى ترقية خطتك للمتابعة.",
                        upgradeRequired: true);
            }

            // Enforce max_images_per_listing limit
            if (request.Images is { Count: > 0 })
            {
                var imgLimit = await _entitlement.GetImageLimitAsync(accountId.Value, ct);
                if (imgLimit > 0 && request.Images.Count > imgLimit)
                    throw new PlanLimitException(
                        SubscriptionKeys.MaxImagesPerListing,
                        $"لا يمكن إضافة أكثر من {imgLimit} صورة في الإعلان الواحد ضمن باقتك الحالية.",
                        upgradeRequired: false);
            }
        }
        // accountId == null → allow (Admin or unlinked user)

        if (request.AgentId.HasValue)
        {
            var agentBelongsToCompany = await _context.Agents
                .AnyAsync(a => a.Id == request.AgentId.Value && a.CompanyId == companyId, ct);

            if (!agentBelongsToCompany)
                throw new BoiootException("الوكيل لا ينتمي إلى هذه الشركة", 400);
        }

        var property = new Property
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Type = request.Type!.Value,
            ListingType = request.ListingType.Trim(),
            Status = PropertyStatus.Available,
            Price = request.Price,
            Currency = string.IsNullOrWhiteSpace(request.Currency) ? "SYP" : request.Currency.Trim().ToUpper(),
            Area = request.Area,
            Bedrooms = request.Bedrooms,
            Bathrooms = request.Bathrooms,
            Province = request.Province?.Trim(),
            Neighborhood = request.Neighborhood?.Trim(),
            Address = request.Address?.Trim(),
            City = request.City.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            CompanyId = companyId,
            AgentId = request.AgentId,
            OwnerId = userId.ToString(),
            Features = request.Features is { Count: > 0 }
                ? System.Text.Json.JsonSerializer.Serialize(request.Features)
                : null,
            // ── Audit — server-side only, never from request body ─────────────
            CreatedByUserId   = userId.ToString(),
            CreatedByRole     = userRole,
            CreatedByCompanyId = companyId,
        };

        _context.Properties.Add(property);
        await _context.SaveChangesAsync(ct);

        await SaveAmenitySelectionsAsync(property.Id, request.Features, ct);

        _logger.LogInformation(
            "Property created: {PropertyId} | Company: {CompanyId} | By: {UserId} ({Role})",
            property.Id, property.CompanyId, userId, userRole);

        return await LoadAndMapAsync(property.Id, ct);
    }

    public async Task<PropertyResponse> UpdateAsync(
        Guid userId, string userRole, Guid propertyId, UpdatePropertyRequest request, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        await EnsureCanManagePropertyAsync(userId, userRole, property, ct);

        if (request.AgentId.HasValue)
        {
            var agentBelongsToCompany = await _context.Agents
                .AnyAsync(a => a.Id == request.AgentId.Value && a.CompanyId == property.CompanyId, ct);

            if (!agentBelongsToCompany)
                throw new BoiootException("الوكيل لا ينتمي إلى شركة هذا العقار", 400);
        }

        property.Title = request.Title.Trim();
        property.Description = request.Description?.Trim();
        property.Type = request.Type!.Value;
        property.ListingType = request.ListingType.Trim();
        property.Status = request.Status!.Value;
        property.Price = request.Price;
        property.Currency = string.IsNullOrWhiteSpace(request.Currency) ? "SYP" : request.Currency.Trim().ToUpper();
        property.Area = request.Area;
        property.Bedrooms = request.Bedrooms;
        property.Bathrooms = request.Bathrooms;
        property.Province = request.Province?.Trim();
        property.Neighborhood = request.Neighborhood?.Trim();
        property.Address = request.Address?.Trim();
        property.City = request.City.Trim();
        property.Latitude = request.Latitude;
        property.Longitude = request.Longitude;
        property.AgentId = request.AgentId;

        // Update Features — always overwrite with the latest selection
        property.Features = request.Features is { Count: > 0 }
            ? System.Text.Json.JsonSerializer.Serialize(request.Features)
            : null;

        // Update VideoUrl if provided (null = unchanged, empty string = clear)
        if (request.VideoUrl is not null && !string.IsNullOrWhiteSpace(request.VideoUrl))
        {
            // Enforce video_upload feature + max_videos_per_listing limit
            var updateAcctId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
            if (updateAcctId.HasValue)
            {
                var canVideo = await _entitlement.CanUploadVideoAsync(updateAcctId.Value, ct);
                if (!canVideo)
                    throw new PlanLimitException(
                        SubscriptionKeys.VideoUpload,
                        "رفع الفيديو غير متاح في باقتك الحالية. يرجى ترقية خطتك للمتابعة.",
                        upgradeRequired: true);

                var videoLimit = (int)await _entitlement.GetLimitAsync(updateAcctId.Value, SubscriptionKeys.MaxVideosPerListing, ct);
                if (videoLimit == 0)
                    throw new PlanLimitException(
                        SubscriptionKeys.MaxVideosPerListing,
                        "الباقة الحالية لا تسمح بإضافة فيديو للإعلان. يرجى ترقية خطتك للمتابعة.",
                        upgradeRequired: true);
            }
            property.VideoUrl = request.VideoUrl.Trim();
        }
        else if (request.VideoUrl is not null)
        {
            property.VideoUrl = null; // explicit clear
        }

        // Partial image changes: only act when the caller explicitly passes at least one list.
        // null on both = text-only edit → images are untouched.
        if (request.RemovedImageIds is not null || request.NewImages is not null)
        {
            // 1. Remove explicitly deleted images
            int removedCount = 0;
            if (request.RemovedImageIds is { Count: > 0 })
            {
                var toRemove = property.Images
                    .Where(i => request.RemovedImageIds.Contains(i.Id.ToString()))
                    .ToList();
                removedCount = toRemove.Count;
                _context.Set<PropertyImage>().RemoveRange(toRemove);
            }

            // 2. Append new images (with limit enforcement)
            if (request.NewImages is { Count: > 0 })
            {
                var imgAcctId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
                if (imgAcctId.HasValue)
                {
                    var imgLimit = await _entitlement.GetImageLimitAsync(imgAcctId.Value, ct);
                    if (imgLimit > 0) // 0 = not defined, -1 = unlimited
                    {
                        int existingAfterRemoval = property.Images.Count - removedCount;
                        int totalAfterUpdate     = existingAfterRemoval + request.NewImages.Count;
                        if (totalAfterUpdate > imgLimit)
                            throw new PlanLimitException(
                                SubscriptionKeys.MaxImagesPerListing,
                                $"لا يمكن إضافة أكثر من {imgLimit} صورة في الإعلان الواحد ضمن باقتك الحالية.",
                                upgradeRequired: false);
                    }
                }

                var now = DateTime.UtcNow;
                int nextOrder = property.Images.Count > 0
                    ? property.Images.Max(i => i.Order) + 1
                    : 0;
                for (int i = 0; i < request.NewImages.Count; i++)
                {
                    _context.Set<PropertyImage>().Add(new PropertyImage
                    {
                        Id         = Guid.NewGuid(),
                        PropertyId = property.Id,
                        ImageUrl   = request.NewImages[i],
                        IsPrimary  = false,
                        Order      = nextOrder + i,
                        CreatedAt  = now,
                        UpdatedAt  = now,
                    });
                }
            }
        }

        await _context.SaveChangesAsync(ct);

        // Ensure exactly one image is marked primary (lowest Order wins).
        await FixPrimaryImageAsync(property.Id, ct);

        await ReplaceAmenitySelectionsAsync(propertyId, request.Features, ct);

        _logger.LogInformation(
            "Property updated: {PropertyId} | By: {UserId}",
            propertyId, userId);

        return await LoadAndMapAsync(propertyId, ct);
    }

    public async Task DeleteAsync(
        Guid userId, string userRole, Guid propertyId, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        await EnsureCanManagePropertyAsync(userId, userRole, property, ct);

        property.IsDeleted = true;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Property soft-deleted: {PropertyId} | By: {UserId}",
            propertyId, userId);
    }

    public async Task<PagedResult<PropertyResponse>> GetDashboardListAsync(
        Guid userId, string userRole, PropertyFilters filters, CancellationToken ct = default)
    {
        var page = Math.Max(1, filters.Page);
        var pageSize = Math.Clamp(filters.PageSize, 1, 50);

        var query = _context.Properties
            .AsNoTracking()
            .Include(p => p.Company)
            .Include(p => p.Images.Where(i => i.IsPrimary));

        IQueryable<Property> filteredQuery = userRole switch
        {
            RoleNames.CompanyOwner => await BuildCompanyOwnerQueryAsync(query, userId, ct),
            RoleNames.Agent        => await BuildAgentQueryAsync(query, userId, ct),
            RoleNames.Broker       => await BuildBrokerQueryAsync(query, userId, ct),
            _                      => query.Where(p => p.OwnerId == userId.ToString())
        };

        filteredQuery = ApplyFilters(filteredQuery, filters);

        var total = await filteredQuery.CountAsync(ct);

        var items = await filteredQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PropertyResponse>(
            items.Select(MapToResponse).ToList(),
            page, pageSize, total);
    }

    // ── Personal listings (User-posted) ─────────────────────────────────────

    // Sentinel company for all personal listings — seeded in Program.cs
    private static readonly Guid PersonalCompanyId = new Guid("00000000-0000-0000-0000-000000000001");

    private static int GetMonthlyLimit(string userRole) => userRole switch
    {
        RoleNames.Admin        => 999,
        RoleNames.CompanyOwner => 999,
        RoleNames.Broker       => 999,
        RoleNames.Agent        => 999,
        RoleNames.User         => 2,
        RoleNames.Owner        => 5,
        _                      => 2
    };

    public async Task<(int used, int limit, bool isFreeTrial)> GetMonthlyListingStatsAsync(
        Guid userId, string userRole, CancellationToken ct = default)
    {
        var ownerIdStr = userId.ToString();

        // ── Free-trial tier (User role) ────────────────────────────────────────
        // Counting rule: User.TrialListingsUsed — incremented on each creation,
        // never decremented. Deletion does not restore trial quota.
        if (userRole == RoleNames.User)
        {
            var trialUser = await _context.Users.FindAsync([userId]);
            var used = trialUser?.TrialListingsUsed ?? 0;
            return (used, 2, true);
        }

        // ── Standard monthly limit (Owner, Broker, CompanyOwner, Admin, etc.) ──
        var startOfMonth = new DateTime(DateTime.UtcNow.Year, DateTime.UtcNow.Month, 1, 0, 0, 0, DateTimeKind.Utc);

        var userCompanyIds = await _context.Agents
            .Where(a => a.UserId == userId && a.CompanyId != null)
            .Select(a => a.CompanyId!.Value)
            .ToListAsync(ct);

        var monthlyUsed = await _context.Properties
            .CountAsync(p => !p.IsDeleted && p.CreatedAt >= startOfMonth && (
                p.OwnerId == ownerIdStr ||
                userCompanyIds.Contains(p.CompanyId)
            ), ct);

        return (monthlyUsed, GetMonthlyLimit(userRole), false);
    }

    public async Task<PropertyResponse> CreateUserListingAsync(
        Guid userId, string userRole, CreatePropertyRequest request, CancellationToken ct = default)
    {
        // ── Subscription plan enforcement ─────────────────────────────────
        // Priority: subscription plan limits > trial/monthly legacy logic.
        // If user has an active account subscription → enforce plan limits only.
        // If no account (e.g. User role before upgrade) → fall back to trial/monthly limits.
        var acctId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (acctId.HasValue)
        {
            var canCreate = await _entitlement.CanCreatePropertyAsync(acctId.Value, ct);
            if (!canCreate)
                throw new PlanLimitException(
                    SubscriptionKeys.MaxActiveListings,
                    "لقد وصلت إلى الحد الأقصى من الإعلانات في خطتك الحالية. يرجى ترقية خطتك للمتابعة.");

            // Enforce video_upload feature + max_videos_per_listing limit
            if (!string.IsNullOrWhiteSpace(request.VideoUrl))
            {
                var canVideo = await _entitlement.CanUploadVideoAsync(acctId.Value, ct);
                if (!canVideo)
                    throw new PlanLimitException(
                        SubscriptionKeys.VideoUpload,
                        "رفع الفيديو غير متاح في باقتك الحالية. يرجى ترقية خطتك للمتابعة.",
                        upgradeRequired: true);

                var videoLimit = (int)await _entitlement.GetLimitAsync(acctId.Value, SubscriptionKeys.MaxVideosPerListing, ct);
                if (videoLimit == 0)
                    throw new PlanLimitException(
                        SubscriptionKeys.MaxVideosPerListing,
                        "الباقة الحالية لا تسمح بإضافة فيديو للإعلان. يرجى ترقية خطتك للمتابعة.",
                        upgradeRequired: true);
            }

            // Enforce max_images_per_listing limit
            if (request.Images is { Count: > 0 })
            {
                var imgLimit = await _entitlement.GetImageLimitAsync(acctId.Value, ct);
                if (imgLimit > 0 && request.Images.Count > imgLimit)
                    throw new PlanLimitException(
                        SubscriptionKeys.MaxImagesPerListing,
                        $"لا يمكن إضافة أكثر من {imgLimit} صورة في الإعلان الواحد ضمن باقتك الحالية.",
                        upgradeRequired: false);
            }

            // Subscription check passed → skip legacy monthly limit check below
        }
        else
        {
            // ── No subscription: fall back to trial / monthly legacy limits ──
            if (userRole == RoleNames.User)
            {
                // Free-trial gate: all-time counter (never decremented on deletion)
                var trialUser = await _context.Users.FindAsync([userId], ct)
                                ?? throw new BoiootException("المستخدم غير موجود.", 404);
                if (trialUser.TrialListingsUsed >= 2)
                    throw new BoiootException(
                        "انتهت إعلاناتك التجريبية المجانية. يرجى ترقية حسابك إلى مالك أو وسيط للمتابعة.",
                        403,
                        "TRIAL_LIMIT_REACHED");
            }
            else
            {
                // Monthly limit for Owner, Broker, etc.
                var (used, limit, _) = await GetMonthlyListingStatsAsync(userId, userRole, ct);
                if (used >= limit)
                    throw new PlanLimitException(
                        SubscriptionKeys.MaxActiveListings,
                        $"لقد وصلت إلى الحد الأقصى من الإعلانات هذا الشهر ({limit} إعلانات). يرجى ترقية عضويتك لإضافة المزيد.");
            }
        }

        // ── Audit: resolve creator's company (if any) ────────────────────────
        // Personal listings have no "company posting" context, but we still
        // record the company the creator belongs to (null if none).
        var creatorCompanyId = await _ownership.GetCompanyIdForUserAsync(userId, ct);

        var property = new Property
        {
            Title             = request.Title.Trim(),
            Description       = request.Description?.Trim(),
            Type              = request.Type!.Value,
            ListingType       = request.ListingType.Trim(),
            Status            = PropertyStatus.Available,
            Price             = request.Price,
            Currency          = string.IsNullOrWhiteSpace(request.Currency) ? "SYP" : request.Currency.Trim().ToUpper(),
            Area              = request.Area,
            Bedrooms          = request.Bedrooms,
            Bathrooms         = request.Bathrooms,
            HallsCount        = request.HallsCount,
            Province          = request.Province?.Trim(),
            Neighborhood      = request.Neighborhood?.Trim(),
            Address           = request.Address?.Trim(),
            City              = request.City.Trim(),
            Latitude          = request.Latitude,
            Longitude         = request.Longitude,
            CompanyId         = PersonalCompanyId,
            OwnerId           = userId.ToString(),
            // Payment
            PaymentType       = string.IsNullOrWhiteSpace(request.PaymentType) ? "OneTime" : request.PaymentType.Trim(),
            InstallmentsCount = request.PaymentType == "Installments" ? request.InstallmentsCount : null,
            HasCommission     = request.HasCommission,
            CommissionType    = request.HasCommission ? request.CommissionType?.Trim() : null,
            CommissionValue   = request.HasCommission ? request.CommissionValue : null,
            // Characteristics
            OwnershipType     = request.OwnershipType?.Trim(),
            Floor             = request.Floor?.Trim(),
            PropertyAge       = request.PropertyAge,
            Features          = request.Features != null && request.Features.Count > 0
                                    ? System.Text.Json.JsonSerializer.Serialize(request.Features)
                                    : null,
            VideoUrl          = request.VideoUrl?.Trim(),
            // ── Subscription linkage ──────────────────────────────────────────
            // Set AccountId so limit enforcement (CanCreatePropertyAsync) counts correctly.
            AccountId          = acctId,
            // ── Audit — server-side only, never from request body ─────────────
            CreatedByUserId    = userId.ToString(),
            CreatedByRole      = userRole,
            CreatedByCompanyId = creatorCompanyId,   // null if user has no company
        };

        _context.Properties.Add(property);
        await _context.SaveChangesAsync(ct);

        // ── Increment trial counter (User role only) ──────────────────────────
        // Must happen after the property is saved so that a failure to save
        // does not advance the counter. The counter is never decremented.
        if (userRole == RoleNames.User)
        {
            // Atomic counter increment — portable EF bulk update (no round-trip load)
            await _context.Users
                .Where(u => u.Id == userId)
                .ExecuteUpdateAsync(s => s.SetProperty(u => u.TrialListingsUsed, u => u.TrialListingsUsed + 1), ct);
        }

        // Save images
        if (request.Images != null && request.Images.Count > 0)
        {
            var now = DateTime.UtcNow;
            for (int i = 0; i < request.Images.Count; i++)
            {
                _context.Set<PropertyImage>().Add(new PropertyImage
                {
                    Id = Guid.NewGuid(),
                    PropertyId = property.Id,
                    ImageUrl = request.Images[i],
                    IsPrimary = i == 0,
                    Order = i,
                    CreatedAt = now,
                    UpdatedAt = now,
                });
            }
            await _context.SaveChangesAsync(ct);
        }

        await SaveAmenitySelectionsAsync(property.Id, request.Features, ct);

        _logger.LogInformation(
            "User listing created: {PropertyId} | By: {UserId}",
            property.Id, userId);

        return await LoadAndMapAsync(property.Id, ct);
    }

    public async Task<PagedResult<PropertyResponse>> GetMyListingsAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var ownerIdStr = userId.ToString();

        var userAgentIds    = await _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => a.Id)
            .ToListAsync(ct);

        var userCompanyIds  = await _context.Agents
            .Where(a => a.UserId == userId && a.CompanyId != null)
            .Select(a => a.CompanyId!.Value)
            .ToListAsync(ct);

        var query = _context.Properties
            .AsNoTracking()
            .Include(p => p.Company)
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => !p.IsDeleted && (
                p.OwnerId == ownerIdStr ||
                (p.AgentId != null && userAgentIds.Contains(p.AgentId.Value)) ||
                userCompanyIds.Contains(p.CompanyId)
            ));

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PropertyResponse>(
            items.Select(MapToResponse).ToList(),
            page, pageSize, total);
    }

    public async Task DeleteMyListingAsync(
        Guid userId, Guid propertyId, CancellationToken ct = default)
    {
        var ownerIdStr = userId.ToString();

        var userAgentIds   = await _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => a.Id)
            .ToListAsync(ct);

        var userCompanyIds = await _context.Agents
            .Where(a => a.UserId == userId && a.CompanyId != null)
            .Select(a => a.CompanyId!.Value)
            .ToListAsync(ct);

        var property = await _context.Properties
            .FirstOrDefaultAsync(p => p.Id == propertyId && !p.IsDeleted && (
                p.OwnerId == ownerIdStr ||
                (p.AgentId != null && userAgentIds.Contains(p.AgentId.Value)) ||
                userCompanyIds.Contains(p.CompanyId)
            ), ct)
            ?? throw new BoiootException("الإعلان غير موجود أو لا تملك صلاحية حذفه", 404);

        property.IsDeleted = true;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "User listing deleted: {PropertyId} | By: {UserId}",
            propertyId, userId);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private static IQueryable<Property> ApplyFilters(
        IQueryable<Property> query, PropertyFilters filters)
    {
        if (!string.IsNullOrWhiteSpace(filters.Province))
            query = query.Where(p => p.Province == filters.Province.Trim());

        if (!string.IsNullOrWhiteSpace(filters.City))
            query = query.Where(p => p.City == filters.City.Trim());

        if (!string.IsNullOrWhiteSpace(filters.Neighborhood))
            query = query.Where(p => p.Neighborhood == filters.Neighborhood.Trim());

        if (filters.Type.HasValue)
            query = query.Where(p => p.Type == filters.Type.Value);

        if (!string.IsNullOrWhiteSpace(filters.ListingType))
            query = query.Where(p => p.ListingType == filters.ListingType.Trim());

        if (filters.MinPrice.HasValue)
            query = query.Where(p => p.Price >= filters.MinPrice.Value);

        if (filters.MaxPrice.HasValue)
            query = query.Where(p => p.Price <= filters.MaxPrice.Value);

        if (filters.MinBedrooms.HasValue)
            query = query.Where(p => p.Bedrooms >= filters.MinBedrooms.Value);

        if (filters.MinBathrooms.HasValue)
            query = query.Where(p => p.Bathrooms >= filters.MinBathrooms.Value);

        return query;
    }

    private async Task<IQueryable<Property>> BuildCompanyOwnerQueryAsync(
        IQueryable<Property> query, Guid userId, CancellationToken ct)
    {
        var companyId = await _ownership.GetCompanyIdForUserAsync(userId, ct);

        return companyId.HasValue
            ? query.Where(p => p.CompanyId == companyId.Value)
            : query.Where(_ => false);
    }

    private async Task<IQueryable<Property>> BuildAgentQueryAsync(
        IQueryable<Property> query, Guid userId, CancellationToken ct)
    {
        var agentId = await _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => (Guid?)a.Id)
            .FirstOrDefaultAsync(ct);

        return agentId.HasValue
            ? query.Where(p => p.AgentId == agentId.Value)
            : query.Where(_ => false);
    }

    private async Task<IQueryable<Property>> BuildBrokerQueryAsync(
        IQueryable<Property> query, Guid userId, CancellationToken ct)
    {
        // جلب معرّفات الوكلاء التابعين لهذا المكتب
        var agentIds = await _context.Agents
            .Where(a => a.BrokerId == userId)
            .Select(a => a.Id)
            .ToListAsync(ct);

        var ownerIdStr = userId.ToString();

        // المكتب يرى إعلاناته الخاصة + إعلانات وكلائه
        return query.Where(p =>
            p.OwnerId == ownerIdStr ||
            (p.AgentId != null && agentIds.Contains(p.AgentId.Value)));
    }

    private async Task EnsureCanManageCompanyAsync(
        Guid userId, string userRole, Guid companyId, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin) return;

        if (userRole == RoleNames.CompanyOwner)
        {
            if (!await _ownership.UserOwnsCompanyAsync(userId, companyId, ct))
            {
                _logger.LogWarning(
                    "CompanyOwner {UserId} attempted unauthorized access to company {CompanyId}",
                    userId, companyId);
                throw new BoiootException("ليس لديك صلاحية الإدارة على هذه الشركة", 403);
            }

            return;
        }

        _logger.LogWarning(
            "User {UserId} with role {Role} attempted to manage company {CompanyId}",
            userId, userRole, companyId);
        throw new BoiootException("غير مصرح لك بتنفيذ هذا الإجراء", 403);
    }

    private async Task EnsureCanManagePropertyAsync(
        Guid userId, string userRole, Property property, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin) return;

        if (userRole == RoleNames.CompanyOwner)
        {
            if (!await _ownership.UserOwnsCompanyAsync(userId, property.CompanyId, ct))
            {
                _logger.LogWarning(
                    "CompanyOwner {UserId} attempted unauthorized access to property {PropertyId}",
                    userId, property.Id);
                throw new BoiootException("ليس لديك صلاحية إدارة هذا العقار", 403);
            }

            return;
        }

        // Allow access if the user is the personal owner (posted via my-listings)
        if (property.OwnerId == userId.ToString()) return;

        if (userRole == RoleNames.Agent)
        {
            var agent = await _context.Agents
                .Select(a => new { a.Id, a.UserId })
                .FirstOrDefaultAsync(a => a.UserId == userId, ct);

            if (agent is not null && property.AgentId == agent.Id) return;

            _logger.LogWarning(
                "Agent {UserId} attempted unauthorized access to property {PropertyId}",
                userId, property.Id);
            throw new BoiootException("هذا العقار غير مسند إليك", 403);
        }

        if (userRole == RoleNames.Broker)
        {
            // المكتب يمكنه إدارة إعلانات وكلائه
            var agentIds = await _context.Agents
                .Where(a => a.BrokerId == userId)
                .Select(a => a.Id)
                .ToListAsync(ct);

            if (property.AgentId.HasValue && agentIds.Contains(property.AgentId.Value)) return;

            _logger.LogWarning(
                "Broker {UserId} attempted unauthorized access to property {PropertyId}",
                userId, property.Id);
            throw new BoiootException("هذا العقار غير مسند لأحد وكلائك", 403);
        }

        throw new BoiootException("غير مصرح لك بتنفيذ هذا الإجراء", 403);
    }

    // ── Amenity selection helpers ────────────────────────────────────────────

    private async Task SaveAmenitySelectionsAsync(Guid propertyId, List<string>? featureKeys, CancellationToken ct)
    {
        if (featureKeys is null || featureKeys.Count == 0) return;

        var amenityIds = await _context.PropertyAmenities
            .Where(a => featureKeys.Contains(a.Key) && a.IsActive)
            .Select(a => a.Id)
            .ToListAsync(ct);

        foreach (var amenityId in amenityIds)
        {
            _context.PropertyAmenitySelections.Add(new PropertyAmenitySelection
            {
                PropertyId = propertyId,
                AmenityId  = amenityId,
            });
        }

        if (amenityIds.Count > 0)
            await _context.SaveChangesAsync(ct);
    }

    private async Task ReplaceAmenitySelectionsAsync(Guid propertyId, List<string>? featureKeys, CancellationToken ct)
    {
        var existing = await _context.PropertyAmenitySelections
            .Where(s => s.PropertyId == propertyId)
            .ToListAsync(ct);

        _context.PropertyAmenitySelections.RemoveRange(existing);

        if (featureKeys is { Count: > 0 })
        {
            var amenityIds = await _context.PropertyAmenities
                .Where(a => featureKeys.Contains(a.Key) && a.IsActive)
                .Select(a => a.Id)
                .ToListAsync(ct);

            foreach (var amenityId in amenityIds)
            {
                _context.PropertyAmenitySelections.Add(new PropertyAmenitySelection
                {
                    PropertyId = propertyId,
                    AmenityId  = amenityId,
                });
            }
        }

        await _context.SaveChangesAsync(ct);
    }

    private async Task<PropertyResponse> LoadAndMapAsync(Guid propertyId, CancellationToken ct)
    {
        var property = await _context.Properties
            .Include(p => p.Company)
            .Include(p => p.Images)
            .Include(p => p.AmenitySelections).ThenInclude(s => s.Amenity)
            .FirstAsync(p => p.Id == propertyId, ct);

        return MapToResponse(property);
    }

    /// <summary>
    /// Ensures exactly one PropertyImage for the given property has IsPrimary = true
    /// (the one with the lowest Order). No-op if there are no images.
    /// </summary>
    private async Task FixPrimaryImageAsync(Guid propertyId, CancellationToken ct)
    {
        var images = await _context.Set<PropertyImage>()
            .Where(i => i.PropertyId == propertyId)
            .OrderBy(i => i.Order)
            .ToListAsync(ct);

        if (images.Count == 0) return;

        bool changed = false;
        for (int i = 0; i < images.Count; i++)
        {
            bool shouldBePrimary = i == 0;
            if (images[i].IsPrimary != shouldBePrimary)
            {
                images[i].IsPrimary = shouldBePrimary;
                changed = true;
            }
        }

        if (changed)
            await _context.SaveChangesAsync(ct);
    }

    private static PropertyResponse MapToResponse(Property p) => new()
    {
        Id = p.Id,
        Title = p.Title,
        Description = p.Description,
        Price = p.Price,
        Currency = p.Currency,
        Area = p.Area,
        Type = p.Type.ToString(),
        ListingType = p.ListingType,
        Status = p.Status.ToString(),
        Province = p.Province,
        City = p.City,
        Neighborhood = p.Neighborhood,
        Address = p.Address,
        Latitude = p.Latitude,
        Longitude = p.Longitude,
        Bedrooms = p.Bedrooms,
        Bathrooms = p.Bathrooms,
        HallsCount = p.HallsCount,
        CompanyId = p.CompanyId,
        CompanyName = p.Company?.Name ?? string.Empty,
        CompanyLogoUrl = p.Company?.LogoUrl,
        AgentId = p.AgentId,
        OwnerId = p.OwnerId,
        IsPersonalListing = p.OwnerId != null,
        // Payment
        PaymentType = p.PaymentType,
        InstallmentsCount = p.InstallmentsCount,
        HasCommission = p.HasCommission,
        CommissionType = p.CommissionType,
        CommissionValue = p.CommissionValue,
        // Characteristics
        OwnershipType = p.OwnershipType,
        Floor = p.Floor,
        PropertyAge = p.PropertyAge,
        Features = p.AmenitySelections.Count > 0
            ? p.AmenitySelections.Select(s => s.Amenity.Key).OrderBy(k => k).ToList()
            : (string.IsNullOrWhiteSpace(p.Features)
                ? []
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(p.Features) ?? []),
        VideoUrl = p.VideoUrl,
        Images = p.Images
            .OrderBy(i => i.Order)
            .Select(i => new PropertyImageResponse
            {
                Id = i.Id,
                ImageUrl = i.ImageUrl,
                IsPrimary = i.IsPrimary,
                Order = i.Order
            })
            .ToList(),
        ViewCount = p.ViewCount,
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt,
        // ── Audit ─────────────────────────────────────────────────────────────
        CreatedByUserId    = p.CreatedByUserId,
        CreatedByRole      = p.CreatedByRole,
        CreatedByCompanyId = p.CreatedByCompanyId,
    };
}
