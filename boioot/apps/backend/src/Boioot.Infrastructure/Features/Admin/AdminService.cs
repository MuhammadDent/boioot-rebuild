using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Requests.DTOs;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Admin;

public class AdminService : IAdminService
{
    private readonly BoiootDbContext _context;
    private readonly ILogger<AdminService> _logger;

    public AdminService(BoiootDbContext context, ILogger<AdminService> logger)
    {
        _context = context;
        _logger = logger;
    }

    // ── Customer roles that appear on the Users (customer directory) page ──────
    // Admin and any internal staff roles are excluded from this page.
    // Internal accounts are managed exclusively in Team Management and Roles sections.
    private static readonly HashSet<UserRole> CustomerRoles =
    [
        UserRole.User,
        UserRole.Owner,
        UserRole.Broker,
        UserRole.Office,
        UserRole.Agent,
        UserRole.CompanyOwner,
    ];

    public async Task<PagedResult<AdminUserResponse>> GetUsersAsync(
        int page,
        int pageSize,
        UserRole? role,
        bool? isActive,
        string? search,
        DateTime? createdAfter,
        DateTime? createdBefore,
        DateTime? lastLoginAfter,
        string? tag,
        CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking();

        if (role.HasValue && CustomerRoles.Contains(role.Value))
        {
            // Explicit customer-role filter
            query = query.Where(u => u.Role == role.Value);
        }
        else
        {
            // Default: show all customer roles only — never show internal/admin accounts
            query = query.Where(u => CustomerRoles.Contains(u.Role));
        }

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.ToLowerInvariant();
            query = query.Where(u =>
                u.FullName.ToLower().Contains(s) ||
                u.Email.ToLower().Contains(s) ||
                (u.Phone != null && u.Phone.Contains(s)));
        }

        if (createdAfter.HasValue)
            query = query.Where(u => u.CreatedAt >= createdAfter.Value);

        if (createdBefore.HasValue)
            query = query.Where(u => u.CreatedAt <= createdBefore.Value);

        if (lastLoginAfter.HasValue)
            query = query.Where(u => u.LastLoginAt != null && u.LastLoginAt >= lastLoginAfter.Value);

        // Tag filter — if a tag is specified, filter to users who have it
        if (!string.IsNullOrWhiteSpace(tag))
        {
            var tagLower = tag.ToLowerInvariant().Replace("'", "''");
            var taggedUserIdStrs = await _context.Database
                .SqlQueryRaw<string>($"SELECT UserId FROM UserTags WHERE lower(Tag) = '{tagLower}'")
                .ToListAsync(ct);
            var taggedGuids = taggedUserIdStrs
                .Select(s => Guid.TryParse(s, out var g) ? g : (Guid?)null)
                .Where(g => g.HasValue)
                .Select(g => g!.Value)
                .ToList();
            query = query.Where(u => taggedGuids.Contains(u.Id));
        }

        var total = await query.CountAsync(ct);

        var rawItems = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new
            {
                u.Id,
                u.FullName,
                u.Email,
                u.Phone,
                u.ProfileImageUrl,
                u.Role,
                u.IsActive,
                u.IsDeleted,
                u.CreatedAt,
                u.UpdatedAt,
                u.LastLoginAt,
                u.IsVerified,
                u.VerifiedAt,
                u.VerifiedBy,
                u.VerificationStatus,
                u.VerificationLevel,
                u.PhoneVerified,
                u.EmailVerified,
                u.IdentityVerificationStatus,
                u.BusinessVerificationStatus,
                u.VerificationBadge,
                u.VerificationNotes,
                u.RejectionReason,
            })
            .ToListAsync(ct);

        // Enrich with listing count, plan info, and tags
        var userIds = rawItems.Select(u => u.Id).ToList();
        var userIdStrs = userIds.Select(id => id.ToString()).ToList();

        // Listing count per user
        var listingCounts = await _context.Properties
            .IgnoreQueryFilters()
            .Where(p => userIdStrs.Contains(p.CreatedByUserId))
            .GroupBy(p => p.CreatedByUserId)
            .Select(g => new { UserId = g.Key, Count = g.Count() })
            .ToListAsync(ct);
        var listingCountMap = listingCounts.ToDictionary(x => x.UserId, x => x.Count);

        // Plan info via Account
        var accountUsers = await _context.AccountUsers
            .Include(au => au.Account)
                .ThenInclude(a => a.Subscriptions.Where(s => s.IsActive))
                    .ThenInclude(s => s.Plan)
            .Where(au => userIds.Contains(au.UserId))
            .ToListAsync(ct);

        var planMap = new Dictionary<Guid, (string? PlanName, string PlanStatus)>();
        foreach (var au in accountUsers)
        {
            if (planMap.ContainsKey(au.UserId)) continue;
            var activeSub = au.Account?.Subscriptions?.FirstOrDefault(s => s.IsActive);
            if (activeSub is not null)
            {
                planMap[au.UserId] = (activeSub.Plan?.DisplayNameAr ?? activeSub.Plan?.Name, activeSub.Status.ToString());
            }
        }

        // Tags per user (raw SQL since UserTags has no EF entity)
        var tagsMap = new Dictionary<Guid, List<string>>();
        if (userIdStrs.Count > 0)
        {
            try
            {
                var idList = string.Join(",", userIdStrs.Select(id => $"'{id.Replace("'", "''")}'"));
                var allTagRows = await _context.Database
                    .SqlQueryRaw<UserTagRow>($"SELECT UserId, Tag FROM UserTags WHERE UserId IN ({idList})")
                    .ToListAsync(ct);
                foreach (var row in allTagRows)
                {
                    if (!Guid.TryParse(row.UserId, out var uid)) continue;
                    if (!tagsMap.TryGetValue(uid, out var list))
                    {
                        list = [];
                        tagsMap[uid] = list;
                    }
                    list.Add(row.Tag);
                }
            }
            catch
            {
                // Table may not exist yet on first startup
            }
        }

        var items = rawItems.Select(u =>
        {
            var planInfo = planMap.TryGetValue(u.Id, out var p) ? p : (null, "None");
            return new AdminUserResponse
            {
                Id              = u.Id,
                FullName        = u.FullName,
                Email           = u.Email,
                Phone           = u.Phone,
                ProfileImageUrl = u.ProfileImageUrl,
                Role            = u.Role.ToString(),
                IsActive        = u.IsActive,
                IsDeleted       = u.IsDeleted,
                CreatedAt       = u.CreatedAt,
                UpdatedAt       = u.UpdatedAt,
                LastLoginAt     = u.LastLoginAt,
                ListingCount    = listingCountMap.TryGetValue(u.Id.ToString(), out var lc) ? lc : 0,
                PlanName        = planInfo.Item1,
                PlanStatus      = planInfo.Item2,
                Tags            = tagsMap.TryGetValue(u.Id, out var tags) ? tags : [],
                IsVerified                 = u.IsVerified,
                VerifiedAt                 = u.VerifiedAt,
                VerifiedBy                 = u.VerifiedBy,
                VerificationStatus         = u.VerificationStatus.ToString(),
                VerificationLevel          = u.VerificationLevel,
                PhoneVerified              = u.PhoneVerified,
                EmailVerified              = u.EmailVerified,
                IdentityVerificationStatus = u.IdentityVerificationStatus.ToString(),
                BusinessVerificationStatus = u.BusinessVerificationStatus.ToString(),
                VerificationBadge          = u.VerificationBadge,
                VerificationNotes          = u.VerificationNotes,
                RejectionReason            = u.RejectionReason,
            };
        }).ToList();

        return new PagedResult<AdminUserResponse>(items, page, pageSize, total);
    }

    private class UserTagRow
    {
        public string UserId { get; set; } = "";
        public string Tag { get; set; } = "";
    }

    public async Task<AdminUserResponse> GetAdminUserAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        return MapToAdminUserResponse(user);
    }

    public async Task<AdminUserProfileResponse> GetAdminUserProfileAsync(Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        var userIdStr = userId.ToString();

        // ── Property count (owner or agent) ───────────────────────────────────
        var propertyCount = await _context.Properties
            .IgnoreQueryFilters()
            .CountAsync(p => !p.IsDeleted &&
                (p.OwnerId == userIdStr ||
                 (p.AgentId.HasValue && p.AgentId.Value == userId)), ct);

        // ── Request count ─────────────────────────────────────────────────────
        var requestCount = await _context.Requests
            .CountAsync(r => r.UserId == userId, ct);

        // ── Most common city from properties ──────────────────────────────────
        var topCity = await _context.Properties
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted &&
                (p.OwnerId == userIdStr ||
                 (p.AgentId.HasValue && p.AgentId.Value == userId)) &&
                p.City != null && p.City != "")
            .GroupBy(p => p.City)
            .Select(g => new { City = g.Key, Count = g.Count() })
            .OrderByDescending(g => g.Count)
            .FirstOrDefaultAsync(ct);

        // ── Subscription via AccountUsers ─────────────────────────────────────
        var accountIds = await _context.AccountUsers
            .Where(au => au.UserId == userId && au.IsActive)
            .Select(au => au.AccountId)
            .ToListAsync(ct);

        Subscription? activeSub = null;
        Plan? plan = null;

        if (accountIds.Count > 0)
        {
            activeSub = await _context.Subscriptions
                .Include(s => s.Plan)
                .Where(s => accountIds.Contains(s.AccountId) && s.IsActive &&
                            (s.Status == SubscriptionStatus.Active || s.Status == SubscriptionStatus.Trial))
                .OrderByDescending(s => s.StartDate)
                .FirstOrDefaultAsync(ct);

            plan = activeSub?.Plan;
        }

        // ── Count listings used within the account (for remaining calc) ────────
        var usedListings = propertyCount;
        if (accountIds.Count > 0)
        {
            usedListings = await _context.Properties
                .IgnoreQueryFilters()
                .CountAsync(p => !p.IsDeleted && p.AccountId.HasValue &&
                                 accountIds.Contains(p.AccountId.Value), ct);
        }

        var planLimit   = plan?.ListingLimit ?? 0;
        var remaining   = planLimit == -1 ? -1 : Math.Max(0, planLimit - usedListings);

        return new AdminUserProfileResponse
        {
            Id              = user.Id,
            FullName        = user.FullName,
            Email           = user.Email,
            Phone           = user.Phone,
            ProfileImageUrl = user.ProfileImageUrl,
            Role            = user.Role.ToString(),
            IsActive        = user.IsActive,
            IsDeleted       = user.IsDeleted,
            CreatedAt       = user.CreatedAt,
            UpdatedAt       = user.UpdatedAt,

            PropertyCount           = propertyCount,
            RequestCount            = requestCount,
            City                    = topCity?.City,

            HasActiveSubscription   = activeSub != null,
            PlanName                = plan?.DisplayNameAr ?? plan?.Name,
            PlanListingLimit        = planLimit,
            UsedListings            = usedListings,
            RemainingListings       = remaining,
            SubscriptionStatus      = activeSub?.Status.ToString(),
            SubscriptionEndDate     = activeSub?.EndDate,

            IsVerified              = user.IsVerified,
            VerifiedAt              = user.VerifiedAt,
            VerifiedBy              = user.VerifiedBy,
        };
    }

    public async Task<AdminUserResponse> UpdateAdminUserAsync(Guid userId, UpdateAdminUserRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new KeyNotFoundException($"User {userId} not found");

        if (!string.IsNullOrWhiteSpace(request.FullName))
            user.FullName = request.FullName.Trim();

        if (request.Phone is not null)
            user.Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim();

        // Email update — validate format and uniqueness across all accounts
        if (request.Email is not null)
        {
            var newEmail = request.Email.Trim().ToLowerInvariant();

            if (string.IsNullOrWhiteSpace(newEmail))
                throw new BoiootException("البريد الإلكتروني لا يمكن أن يكون فارغاً", 400);

            if (!newEmail.Contains('@'))
                throw new BoiootException("البريد الإلكتروني غير صحيح", 400);

            if (!string.Equals(user.Email, newEmail, StringComparison.OrdinalIgnoreCase))
            {
                var taken = await _context.Users
                    .IgnoreQueryFilters()
                    .AnyAsync(u => u.Id != userId && u.Email.ToLower() == newEmail, ct);

                if (taken)
                    throw new BoiootException("هذا البريد الإلكتروني مستخدم من قِبل حساب آخر", 409);

                user.Email = newEmail;
            }
        }

        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin updated User {UserId} profile fields", userId);

        return MapToAdminUserResponse(user);
    }

    // ── User identity verification ────────────────────────────────────────────

    public async Task<AdminUserResponse> VerifyUserAsync(
        Guid adminUserId, Guid targetUserId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!CustomerRoles.Contains(user.Role))
            throw new BoiootException("لا يمكن توثيق حسابات الإدارة والطاقم", 400);

        var targetLevel = Math.Max(user.VerificationLevel, (int)VerificationLevelValue.Basic);
        ApplyVerificationCore(user, VerificationStatus.Verified, targetLevel, adminUserId);

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "User {TargetUserId} verified by admin {AdminUserId}", targetUserId, adminUserId);

        return MapToAdminUserResponse(user);
    }

    public async Task<AdminUserResponse> UnverifyUserAsync(
        Guid adminUserId, Guid targetUserId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!CustomerRoles.Contains(user.Role))
            throw new BoiootException("لا يمكن تعديل حسابات الإدارة والطاقم", 400);

        ApplyVerificationCore(user, VerificationStatus.None, (int)VerificationLevelValue.None, adminUserId);

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "User {TargetUserId} unverified by admin {AdminUserId}", targetUserId, adminUserId);

        return MapToAdminUserResponse(user);
    }

    public async Task<PagedResult<AdminAgentResponse>> GetAdminAgentsAsync(
        int page, int pageSize, Guid? companyId, bool? isActive, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Set<Agent>()
            .IgnoreQueryFilters()
            .Include(a => a.User)
            .Include(a => a.Company)
            .AsNoTracking()
            .AsQueryable();

        if (companyId.HasValue)
            query = query.Where(a => a.CompanyId == companyId.Value);

        if (isActive.HasValue)
            query = query.Where(a => a.User.IsActive == isActive.Value);

        var total = await query.CountAsync(ct);

        var agentList = await query
            .OrderByDescending(a => a.User.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var userIds = agentList.Select(a => a.UserId).ToList();

        var propertyCounts = await _context.Properties
            .IgnoreQueryFilters()
            .Where(p => p.AgentId.HasValue && userIds.Contains(p.AgentId.Value))
            .GroupBy(p => p.AgentId!.Value)
            .Select(g => new { AgentId = g.Key, Total = g.Count(), Deals = g.Count(p => p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented) })
            .ToListAsync(ct);

        var ratings = await _context.Set<Review>()
            .Where(r => r.TargetType == ReviewTargetType.Agent && userIds.Contains(r.TargetId))
            .GroupBy(r => r.TargetId)
            .Select(g => new { UserId = g.Key, Avg = g.Average(r => (double)r.Rating), Count = g.Count() })
            .ToListAsync(ct);

        var items = agentList.Select(a =>
        {
            var pc = propertyCounts.FirstOrDefault(p => p.AgentId == a.UserId);
            var rv = ratings.FirstOrDefault(r => r.UserId == a.UserId);
            return new AdminAgentResponse
            {
                Id            = a.UserId,
                UserCode      = a.User.UserCode,
                FullName      = a.User.FullName,
                Email         = a.User.Email,
                Phone         = a.User.Phone,
                Bio           = a.Bio,
                ProfileImageUrl = a.User.ProfileImageUrl,
                CompanyId     = a.CompanyId,
                CompanyName   = a.Company?.Name,
                BrokerId      = a.BrokerId,
                PropertyCount = pc?.Total ?? 0,
                DealsCount    = pc?.Deals ?? 0,
                AverageRating = rv?.Avg,
                ReviewCount   = rv?.Count ?? 0,
                IsActive      = a.User.IsActive,
                IsDeleted     = a.User.IsDeleted,
                CreatedAt     = a.User.CreatedAt,
                UpdatedAt     = a.User.UpdatedAt,
            };
        }).ToList();

        return new PagedResult<AdminAgentResponse>(items, page, pageSize, total);
    }

    public async Task<AdminAgentResponse> CreateAdminAgentAsync(
        CreateAdminAgentRequest request, CancellationToken ct = default)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();

        if (await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == emailLower, ct))
            throw new BoiootException("البريد الإلكتروني مستخدم بالفعل", 409);

        if (request.CompanyId.HasValue)
        {
            var companyExists = await _context.Companies
                .IgnoreQueryFilters()
                .AnyAsync(c => c.Id == request.CompanyId.Value, ct);
            if (!companyExists)
                throw new BoiootException("الشركة غير موجودة", 404);
        }

        var count = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == UserRole.Agent, ct) + 1;

        var user = new User
        {
            UserCode     = $"AGT-{count:D4}",
            FullName     = request.FullName.Trim(),
            Email        = emailLower,
            Phone        = request.Phone?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = UserRole.Agent,
            IsActive     = true,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);

        var agent = new Agent
        {
            UserId    = user.Id,
            CompanyId = request.CompanyId,
            Bio       = request.Bio?.Trim(),
        };

        _context.Set<Agent>().Add(agent);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin created agent: {AgentId}", user.Id);

        string? companyName = null;
        if (request.CompanyId.HasValue)
        {
            companyName = await _context.Companies
                .IgnoreQueryFilters()
                .Where(c => c.Id == request.CompanyId.Value)
                .Select(c => c.Name)
                .FirstOrDefaultAsync(ct);
        }

        return new AdminAgentResponse
        {
            Id            = user.Id,
            UserCode      = user.UserCode,
            FullName      = user.FullName,
            Email         = user.Email,
            Phone         = user.Phone,
            Bio           = agent.Bio,
            CompanyId     = agent.CompanyId,
            CompanyName   = companyName,
            PropertyCount = 0,
            DealsCount    = 0,
            IsActive      = user.IsActive,
            IsDeleted     = user.IsDeleted,
            CreatedAt     = user.CreatedAt,
            UpdatedAt     = user.UpdatedAt,
        };
    }

    public async Task<AdminAgentResponse> UpdateAdminAgentAsync(
        Guid userId, UpdateAdminAgentRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId && u.Role == UserRole.Agent, ct)
            ?? throw new BoiootException("الوكيل غير موجود", 404);

        var agent = await _context.Set<Agent>()
            .Include(a => a.Company)
            .FirstOrDefaultAsync(a => a.UserId == userId, ct)
            ?? throw new BoiootException("سجل الوكيل غير موجود", 404);

        if (request.CompanyId.HasValue && request.CompanyId != agent.CompanyId)
        {
            var companyExists = await _context.Companies
                .IgnoreQueryFilters()
                .AnyAsync(c => c.Id == request.CompanyId.Value, ct);
            if (!companyExists)
                throw new BoiootException("الشركة غير موجودة", 404);
        }

        user.FullName   = request.FullName.Trim();
        user.Phone      = request.Phone?.Trim();
        user.UpdatedAt  = DateTime.UtcNow;
        agent.Bio       = request.Bio?.Trim();
        agent.CompanyId = request.CompanyId;
        agent.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin updated agent: {AgentId}", userId);

        return new AdminAgentResponse
        {
            Id            = user.Id,
            UserCode      = user.UserCode,
            FullName      = user.FullName,
            Email         = user.Email,
            Phone         = user.Phone,
            Bio           = agent.Bio,
            ProfileImageUrl = user.ProfileImageUrl,
            CompanyId     = agent.CompanyId,
            CompanyName   = agent.Company?.Name,
            PropertyCount = await _context.Properties.IgnoreQueryFilters()
                .CountAsync(p => p.AgentId == userId, ct),
            DealsCount    = await _context.Properties.IgnoreQueryFilters()
                .CountAsync(p => p.AgentId == userId && (p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented), ct),
            IsActive      = user.IsActive,
            IsDeleted     = user.IsDeleted,
            CreatedAt     = user.CreatedAt,
            UpdatedAt     = user.UpdatedAt,
        };
    }

    public async Task<AdminUserResponse> UpdateUserProfileImageAsync(
        Guid userId, string profileImageUrl, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        user.ProfileImageUrl = profileImageUrl.Trim();
        user.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return new AdminUserResponse
        {
            Id        = user.Id,
            FullName  = user.FullName,
            Email     = user.Email,
            Phone     = user.Phone,
            Role      = user.Role.ToString(),
            IsActive  = user.IsActive,
            IsDeleted = user.IsDeleted,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt,
        };
    }

    public async Task<PagedResult<AdminBrokerResponse>> GetAdminBrokersAsync(
        int page, int pageSize, bool? isActive, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Users
            .IgnoreQueryFilters()
            .Where(u => u.Role == UserRole.Broker)
            .AsNoTracking()
            .AsQueryable();

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var total = await query.CountAsync(ct);

        var brokers = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var brokerIds = brokers.Select(b => b.Id).ToList();

        var agentCounts = await _context.Set<Agent>()
            .IgnoreQueryFilters()
            .Where(a => a.BrokerId.HasValue && brokerIds.Contains(a.BrokerId.Value))
            .GroupBy(a => a.BrokerId!.Value)
            .Select(g => new { BrokerId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var agentIds = await _context.Set<Agent>()
            .IgnoreQueryFilters()
            .Where(a => a.BrokerId.HasValue && brokerIds.Contains(a.BrokerId.Value))
            .Select(a => a.UserId)
            .ToListAsync(ct);

        var propertyCounts = await _context.Properties
            .IgnoreQueryFilters()
            .Where(p => p.AgentId.HasValue && agentIds.Contains(p.AgentId.Value))
            .GroupBy(p => p.AgentId!.Value)
            .Select(g => new { AgentId = g.Key, Total = g.Count(), Deals = g.Count(p => p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented) })
            .ToListAsync(ct);

        var agentBrokerMap = await _context.Set<Agent>()
            .IgnoreQueryFilters()
            .Where(a => a.BrokerId.HasValue && brokerIds.Contains(a.BrokerId.Value))
            .Select(a => new { a.UserId, BrokerId = a.BrokerId!.Value })
            .ToListAsync(ct);

        var ratings = await _context.Set<Review>()
            .Where(r => r.TargetType == ReviewTargetType.Agent && agentIds.Contains(r.TargetId))
            .GroupBy(r => r.TargetId)
            .Select(g => new { UserId = g.Key, Avg = g.Average(r => (double)r.Rating), Count = g.Count() })
            .ToListAsync(ct);

        var items = brokers.Select(b =>
        {
            var myAgentIds = agentBrokerMap.Where(m => m.BrokerId == b.Id).Select(m => m.UserId).ToList();
            var totalProps  = propertyCounts.Where(p => myAgentIds.Contains(p.AgentId)).Sum(p => p.Total);
            var totalDeals  = propertyCounts.Where(p => myAgentIds.Contains(p.AgentId)).Sum(p => p.Deals);
            var myRatings   = ratings.Where(r => myAgentIds.Contains(r.UserId)).ToList();
            var avgRating   = myRatings.Count > 0 ? myRatings.Average(r => r.Avg) : (double?)null;
            var reviewCount = myRatings.Sum(r => r.Count);

            return new AdminBrokerResponse
            {
                Id              = b.Id,
                UserCode        = b.UserCode,
                FullName        = b.FullName,
                Email           = b.Email,
                Phone           = b.Phone,
                ProfileImageUrl = b.ProfileImageUrl,
                AgentCount      = agentCounts.FirstOrDefault(a => a.BrokerId == b.Id)?.Count ?? 0,
                PropertyCount   = totalProps,
                DealsCount      = totalDeals,
                AverageRating   = avgRating,
                ReviewCount     = reviewCount,
                IsActive        = b.IsActive,
                IsDeleted       = b.IsDeleted,
                CreatedAt       = b.CreatedAt,
                UpdatedAt       = b.UpdatedAt,
            };
        }).ToList();

        return new PagedResult<AdminBrokerResponse>(items, page, pageSize, total);
    }

    public async Task<AdminBrokerResponse> GetAdminBrokerAsync(
        Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId && u.Role == UserRole.Broker, ct)
            ?? throw new BoiootException("الوسيط غير موجود", 404);

        var agentIds = await _context.Set<Agent>()
            .IgnoreQueryFilters()
            .Where(a => a.BrokerId == userId)
            .Select(a => a.UserId)
            .ToListAsync(ct);

        var propStats = await _context.Properties
            .IgnoreQueryFilters()
            .Where(p => p.AgentId.HasValue && agentIds.Contains(p.AgentId.Value))
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Total = g.Count(),
                Deals = g.Count(p => p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented),
            })
            .FirstOrDefaultAsync(ct);

        var ratingStats = await _context.Set<Review>()
            .Where(r => r.TargetType == ReviewTargetType.Agent && agentIds.Contains(r.TargetId))
            .GroupBy(_ => 1)
            .Select(g => new { Avg = g.Average(r => (double)r.Rating), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        return new AdminBrokerResponse
        {
            Id              = user.Id,
            UserCode        = user.UserCode,
            FullName        = user.FullName,
            Email           = user.Email,
            Phone           = user.Phone,
            ProfileImageUrl = user.ProfileImageUrl,
            AgentCount      = agentIds.Count,
            PropertyCount   = propStats?.Total    ?? 0,
            DealsCount      = propStats?.Deals    ?? 0,
            AverageRating   = ratingStats?.Avg,
            ReviewCount     = ratingStats?.Count  ?? 0,
            IsActive        = user.IsActive,
            IsDeleted       = user.IsDeleted,
            CreatedAt       = user.CreatedAt,
            UpdatedAt       = user.UpdatedAt,
        };
    }

    public async Task<AdminBrokerResponse> CreateAdminBrokerAsync(
        CreateAdminBrokerRequest request, CancellationToken ct = default)
    {
        var emailLower = request.Email.Trim().ToLowerInvariant();

        if (await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Email == emailLower, ct))
            throw new BoiootException("البريد الإلكتروني مستخدم بالفعل", 409);

        var count = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == UserRole.Broker, ct) + 1;

        var user = new User
        {
            UserCode        = $"BRK-{count:D4}",
            FullName        = request.FullName.Trim(),
            Email           = emailLower,
            Phone           = request.Phone?.Trim(),
            PasswordHash    = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role            = UserRole.Broker,
            ProfileImageUrl = request.ProfileImageUrl?.Trim(),
            IsActive        = true,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin created broker: {BrokerId}", user.Id);

        return new AdminBrokerResponse
        {
            Id              = user.Id,
            UserCode        = user.UserCode,
            FullName        = user.FullName,
            Email           = user.Email,
            Phone           = user.Phone,
            ProfileImageUrl = user.ProfileImageUrl,
            AgentCount      = 0,
            PropertyCount   = 0,
            DealsCount      = 0,
            IsActive        = user.IsActive,
            IsDeleted       = user.IsDeleted,
            CreatedAt       = user.CreatedAt,
            UpdatedAt       = user.UpdatedAt,
        };
    }

    public async Task<AdminBrokerResponse> UpdateAdminBrokerAsync(
        Guid userId, UpdateAdminBrokerRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId && u.Role == UserRole.Broker, ct)
            ?? throw new BoiootException("الوسيط غير موجود", 404);

        user.FullName        = request.FullName.Trim();
        user.Phone           = request.Phone?.Trim();
        user.ProfileImageUrl = request.ProfileImageUrl?.Trim() ?? user.ProfileImageUrl;
        user.UpdatedAt       = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin updated broker: {BrokerId}", userId);

        var agentIds = await _context.Set<Agent>()
            .IgnoreQueryFilters()
            .Where(a => a.BrokerId == userId)
            .Select(a => a.UserId)
            .ToListAsync(ct);

        return new AdminBrokerResponse
        {
            Id              = user.Id,
            UserCode        = user.UserCode,
            FullName        = user.FullName,
            Email           = user.Email,
            Phone           = user.Phone,
            ProfileImageUrl = user.ProfileImageUrl,
            AgentCount      = agentIds.Count,
            PropertyCount   = await _context.Properties.IgnoreQueryFilters()
                .CountAsync(p => p.AgentId.HasValue && agentIds.Contains(p.AgentId.Value), ct),
            DealsCount      = await _context.Properties.IgnoreQueryFilters()
                .CountAsync(p => p.AgentId.HasValue && agentIds.Contains(p.AgentId.Value) && (p.Status == PropertyStatus.Sold || p.Status == PropertyStatus.Rented), ct),
            IsActive        = user.IsActive,
            IsDeleted       = user.IsDeleted,
            CreatedAt       = user.CreatedAt,
            UpdatedAt       = user.UpdatedAt,
        };
    }

    public async Task<PagedResult<AdminCompanyResponse>> GetCompaniesAsync(
        int page, int pageSize, string? city, bool? isVerified, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Companies
            .IgnoreQueryFilters()
            .AsNoTracking();

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(c => c.City == city.Trim());

        if (isVerified.HasValue)
            query = query.Where(c => c.IsVerified == isVerified.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(c => c.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(c => new AdminCompanyResponse
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Email = c.Email,
                Phone = c.Phone,
                Address = c.Address,
                City = c.City,
                LogoUrl = c.LogoUrl,
                IsVerified = c.IsVerified,
                IsDeleted = c.IsDeleted,
                AgentCount = c.Agents.Count(),
                PropertyCount = c.Properties.Count(p => !p.IsDeleted),
                ProjectCount = c.Projects.Count(p => !p.IsDeleted),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<AdminCompanyResponse>(items, page, pageSize, total);
    }

    public async Task<PagedResult<PropertyResponse>> GetPropertiesAsync(
        int page, int pageSize, PropertyStatus? status, string? city, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 500);

        var query = _context.Properties
            .AsNoTracking()
            .Include(p => p.Company)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(p => p.City == city.Trim());

        var total = await query.CountAsync(ct);

        var rawItems = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rawItems.Select(p => new PropertyResponse
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
            CompanyId = p.CompanyId,
            CompanyName = p.Company.Name,
            AgentId = p.AgentId,
            Images = [],
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        }).ToList();

        return new PagedResult<PropertyResponse>(items, page, pageSize, total);
    }

    public async Task<PagedResult<ProjectResponse>> GetProjectsAsync(
        int page, int pageSize, ProjectStatus? status, string? city, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Projects
            .AsNoTracking()
            .Include(p => p.Company)
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(p => p.Status == status.Value);

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(p => p.City == city.Trim());

        var total = await query.CountAsync(ct);

        var rawItems = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = rawItems.Select(p => new ProjectResponse
        {
            Id = p.Id,
            Title = p.Title,
            Description = p.Description,
            Status = p.Status.ToString(),
            City = p.City,
            Address = p.Address,
            Latitude = p.Latitude,
            Longitude = p.Longitude,
            StartingPrice = p.StartingPrice,
            DeliveryDate = p.DeliveryDate,
            IsPublished = p.IsPublished,
            CompanyId = p.CompanyId,
            CompanyName = p.Company.Name,
            Images = [],
            CreatedAt = p.CreatedAt,
            UpdatedAt = p.UpdatedAt
        }).ToList();

        return new PagedResult<ProjectResponse>(items, page, pageSize, total);
    }

    public async Task<PagedResult<RequestResponse>> GetRequestsAsync(
        int page, int pageSize, RequestStatus? status, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Requests
            .AsNoTracking()
            .AsQueryable();

        if (status.HasValue)
            query = query.Where(r => r.Status == status.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RequestResponse
            {
                Id = r.Id,
                Name = r.Name,
                Phone = r.Phone,
                Email = r.Email,
                Message = r.Message,
                Status = r.Status.ToString(),
                PropertyId = r.PropertyId,
                PropertyTitle = r.Property != null ? r.Property.Title : null,
                ProjectId = r.ProjectId,
                ProjectTitle = r.Project != null ? r.Project.Title : null,
                CompanyId = r.Property != null ? r.Property.CompanyId : r.Project != null ? r.Project.CompanyId : null,
                CompanyName = r.Property != null ? r.Property.Company.Name : r.Project != null ? r.Project.Company.Name : null,
                CreatedAt = r.CreatedAt,
                UpdatedAt = r.UpdatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<RequestResponse>(items, page, pageSize, total);
    }

    public async Task<AdminUserResponse> CreateUserAsync(
        CreateAdminUserRequest request, CancellationToken ct = default)
    {
        var emailLower = request.Email.ToLowerInvariant().Trim();

        var emailExists = await _context.Users
            .IgnoreQueryFilters()
            .AnyAsync(u => u.Email == emailLower, ct);

        if (emailExists)
            throw new BoiootException("البريد الإلكتروني مستخدم بالفعل", 409);

        var role = Enum.TryParse<UserRole>(request.Role, out var parsedRole)
            ? parsedRole
            : UserRole.User;

        var prefix = role switch
        {
            UserRole.Owner        => "OWN",
            UserRole.Broker       => "BRK",
            UserRole.Agent        => "AGT",
            UserRole.CompanyOwner => "CO",
            UserRole.Admin        => "ADM",
            _                     => "U",
        };

        var count = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == role, ct);

        var candidate = count + 1;
        string userCode;
        do
        {
            userCode = $"{prefix}-{candidate:D4}";
            var codeExists = await _context.Users
                .IgnoreQueryFilters()
                .AnyAsync(u => u.UserCode == userCode, ct);
            if (!codeExists) break;
            candidate++;
        } while (true);

        var user = new User
        {
            UserCode     = userCode,
            FullName     = request.FullName.Trim(),
            Email        = emailLower,
            Phone        = request.Phone?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = role,
            IsActive     = true,
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin created new user: {Email} | Role: {Role}", emailLower, user.Role);

        return new AdminUserResponse
        {
            Id        = user.Id,
            FullName  = user.FullName,
            Email     = user.Email,
            Phone     = user.Phone,
            Role      = user.Role.ToString(),
            IsActive  = user.IsActive,
            IsDeleted = user.IsDeleted,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<AdminUserResponse> UpdateUserStatusAsync(
        Guid adminUserId, Guid targetUserId, bool isActive, CancellationToken ct = default)
    {
        if (adminUserId == targetUserId)
            throw new BoiootException("لا يمكن تعديل حالة حسابك الخاص", 400);

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        user.IsActive = isActive;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Admin {AdminUserId} updated User {TargetUserId} status to IsActive={IsActive}",
            adminUserId, targetUserId, isActive);

        return new AdminUserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            IsDeleted = user.IsDeleted,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<AdminUserResponse> UpdateUserRoleAsync(
        Guid adminUserId, Guid targetUserId, UserRole newRole, CancellationToken ct = default)
    {
        if (adminUserId == targetUserId)
            throw new BoiootException("لا يمكن تعديل دور حسابك الخاص", 400);

        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == targetUserId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (user.Role == UserRole.Admin)
            throw new BoiootException("لا يمكن تعديل دور حساب المشرف", 400);

        user.Role = newRole;
        user.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Admin {AdminUserId} updated User {TargetUserId} role to {Role}",
            adminUserId, targetUserId, newRole);

        return new AdminUserResponse
        {
            Id = user.Id,
            FullName = user.FullName,
            Email = user.Email,
            Phone = user.Phone,
            Role = user.Role.ToString(),
            IsActive = user.IsActive,
            IsDeleted = user.IsDeleted,
            CreatedAt = user.CreatedAt,
            UpdatedAt = user.UpdatedAt
        };
    }

    public async Task<AdminCompanyResponse> CreateCompanyAsync(
        CreateAdminCompanyRequest request, CancellationToken ct = default)
    {
        var nameExists = await _context.Companies
            .IgnoreQueryFilters()
            .AnyAsync(c => c.Name.ToLower() == request.Name.Trim().ToLower(), ct);

        if (nameExists)
            throw new BoiootException("يوجد شركة بهذا الاسم بالفعل", 409);

        var company = new Company
        {
            Name        = request.Name.Trim(),
            Description = request.Description?.Trim(),
            Email       = request.Email?.Trim().ToLowerInvariant(),
            Phone       = request.Phone?.Trim(),
            Address     = request.Address?.Trim(),
            City        = request.City?.Trim(),
            LogoUrl     = request.LogoUrl?.Trim(),
            IsVerified  = false,
        };

        _context.Companies.Add(company);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin created company: {Name}", company.Name);

        return new AdminCompanyResponse
        {
            Id           = company.Id,
            Name         = company.Name,
            Description  = company.Description,
            Email        = company.Email,
            Phone        = company.Phone,
            Address      = company.Address,
            City         = company.City,
            LogoUrl      = company.LogoUrl,
            IsVerified   = company.IsVerified,
            IsDeleted    = company.IsDeleted,
            AgentCount   = 0,
            PropertyCount = 0,
            ProjectCount = 0,
            CreatedAt    = company.CreatedAt,
            UpdatedAt    = company.UpdatedAt,
        };
    }

    public async Task<AdminCompanyResponse> UpdateCompanyAsync(
        Guid companyId, UpdateAdminCompanyRequest request, CancellationToken ct = default)
    {
        var company = await _context.Companies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == companyId, ct)
            ?? throw new BoiootException("الشركة غير موجودة", 404);

        var nameTaken = await _context.Companies
            .IgnoreQueryFilters()
            .AnyAsync(c => c.Id != companyId && c.Name.ToLower() == request.Name.Trim().ToLower(), ct);

        if (nameTaken)
            throw new BoiootException("يوجد شركة أخرى بهذا الاسم", 409);

        company.Name        = request.Name.Trim();
        company.Description = request.Description?.Trim();
        company.Email       = request.Email?.Trim().ToLowerInvariant();
        company.Phone       = request.Phone?.Trim();
        company.Address     = request.Address?.Trim();
        company.City        = request.City?.Trim();
        company.LogoUrl     = request.LogoUrl?.Trim();
        company.UpdatedAt   = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Admin updated company: {CompanyId}", companyId);

        return await _context.Companies
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => new AdminCompanyResponse
            {
                Id            = c.Id,
                Name          = c.Name,
                Description   = c.Description,
                Email         = c.Email,
                Phone         = c.Phone,
                Address       = c.Address,
                City          = c.City,
                LogoUrl       = c.LogoUrl,
                IsVerified    = c.IsVerified,
                IsDeleted     = c.IsDeleted,
                AgentCount    = c.Agents.Count(),
                PropertyCount = c.Properties.Count(p => !p.IsDeleted),
                ProjectCount  = c.Projects.Count(p => !p.IsDeleted),
                CreatedAt     = c.CreatedAt,
                UpdatedAt     = c.UpdatedAt,
            })
            .FirstAsync(ct);
    }

    public async Task<AdminCompanyResponse> VerifyCompanyAsync(
        Guid companyId, bool isVerified, CancellationToken ct = default)
    {
        var company = await _context.Companies
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(c => c.Id == companyId, ct)
            ?? throw new BoiootException("الشركة غير موجودة", 404);

        company.IsVerified = isVerified;
        company.UpdatedAt = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Company {CompanyId} verification set to {IsVerified}", companyId, isVerified);

        return await _context.Companies
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(c => c.Id == companyId)
            .Select(c => new AdminCompanyResponse
            {
                Id = c.Id,
                Name = c.Name,
                Description = c.Description,
                Email = c.Email,
                Phone = c.Phone,
                Address = c.Address,
                City = c.City,
                LogoUrl = c.LogoUrl,
                IsVerified = c.IsVerified,
                IsDeleted = c.IsDeleted,
                AgentCount = c.Agents.Count(),
                PropertyCount = c.Properties.Count(p => !p.IsDeleted),
                ProjectCount = c.Projects.Count(p => !p.IsDeleted),
                CreatedAt = c.CreatedAt,
                UpdatedAt = c.UpdatedAt
            })
            .FirstAsync(ct);
    }

    // ── Listing Types CRUD ───────────────────────────────────────────────────

    public async Task<List<ListingTypeResponse>> GetListingTypesAsync(CancellationToken ct = default)
    {
        return await _context.PropertyListingTypes
            .AsNoTracking()
            .OrderBy(t => t.Order)
            .ThenBy(t => t.CreatedAt)
            .Select(t => new ListingTypeResponse
            {
                Id = t.Id,
                Value = t.Value,
                Label = t.Label,
                Order = t.Order,
                IsActive = t.IsActive,
                CreatedAt = t.CreatedAt,
                UpdatedAt = t.UpdatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<ListingTypeResponse> CreateListingTypeAsync(
        UpsertListingTypeRequest request, CancellationToken ct = default)
    {
        var exists = await _context.PropertyListingTypes
            .AnyAsync(t => t.Value == request.Value.Trim(), ct);

        if (exists)
            throw new BoiootException("نوع الإدراج بهذه القيمة موجود مسبقاً", 409);

        var entity = new PropertyListingType
        {
            Value = request.Value.Trim(),
            Label = request.Label.Trim(),
            Order = request.Order,
            IsActive = request.IsActive
        };

        _context.PropertyListingTypes.Add(entity);
        await _context.SaveChangesAsync(ct);

        return new ListingTypeResponse
        {
            Id = entity.Id,
            Value = entity.Value,
            Label = entity.Label,
            Order = entity.Order,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task<ListingTypeResponse> UpdateListingTypeAsync(
        Guid id, UpsertListingTypeRequest request, CancellationToken ct = default)
    {
        var entity = await _context.PropertyListingTypes
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new BoiootException("نوع الإدراج غير موجود", 404);

        var valueTaken = await _context.PropertyListingTypes
            .AnyAsync(t => t.Value == request.Value.Trim() && t.Id != id, ct);

        if (valueTaken)
            throw new BoiootException("نوع الإدراج بهذه القيمة موجود مسبقاً", 409);

        entity.Value = request.Value.Trim();
        entity.Label = request.Label.Trim();
        entity.Order = request.Order;
        entity.IsActive = request.IsActive;

        await _context.SaveChangesAsync(ct);

        return new ListingTypeResponse
        {
            Id = entity.Id,
            Value = entity.Value,
            Label = entity.Label,
            Order = entity.Order,
            IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt,
            UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task DeleteListingTypeAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.PropertyListingTypes
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new BoiootException("نوع الإدراج غير موجود", 404);

        _context.PropertyListingTypes.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    // ─── Property Types ───────────────────────────────────────────────────────

    public async Task<List<PropertyTypeResponse>> GetPropertyTypesAsync(CancellationToken ct = default)
    {
        return await _context.PropertyTypeConfigs
            .AsNoTracking()
            .OrderBy(t => t.Order)
            .ThenBy(t => t.CreatedAt)
            .Select(t => new PropertyTypeResponse
            {
                Id = t.Id, Value = t.Value, Label = t.Label, Icon = t.Icon,
                Order = t.Order, IsActive = t.IsActive,
                CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<PropertyTypeResponse> CreatePropertyTypeAsync(
        UpsertPropertyTypeRequest request, CancellationToken ct = default)
    {
        var exists = await _context.PropertyTypeConfigs
            .AnyAsync(t => t.Value == request.Value.Trim(), ct);
        if (exists) throw new BoiootException("نوع العقار بهذه القيمة موجود مسبقاً", 409);

        var entity = new PropertyTypeConfig
        {
            Value = request.Value.Trim(), Label = request.Label.Trim(),
            Icon = request.Icon.Trim(), Order = request.Order, IsActive = request.IsActive
        };
        _context.PropertyTypeConfigs.Add(entity);
        await _context.SaveChangesAsync(ct);

        return new PropertyTypeResponse
        {
            Id = entity.Id, Value = entity.Value, Label = entity.Label, Icon = entity.Icon,
            Order = entity.Order, IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task<PropertyTypeResponse> UpdatePropertyTypeAsync(
        Guid id, UpsertPropertyTypeRequest request, CancellationToken ct = default)
    {
        var entity = await _context.PropertyTypeConfigs
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new BoiootException("نوع العقار غير موجود", 404);

        var taken = await _context.PropertyTypeConfigs
            .AnyAsync(t => t.Value == request.Value.Trim() && t.Id != id, ct);
        if (taken) throw new BoiootException("نوع العقار بهذه القيمة موجود مسبقاً", 409);

        entity.Value = request.Value.Trim(); entity.Label = request.Label.Trim();
        entity.Icon = request.Icon.Trim(); entity.Order = request.Order;
        entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(ct);

        return new PropertyTypeResponse
        {
            Id = entity.Id, Value = entity.Value, Label = entity.Label, Icon = entity.Icon,
            Order = entity.Order, IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task DeletePropertyTypeAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.PropertyTypeConfigs
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new BoiootException("نوع العقار غير موجود", 404);
        _context.PropertyTypeConfigs.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    // ─── Ownership Types ──────────────────────────────────────────────────────

    public async Task<List<OwnershipTypeResponse>> GetOwnershipTypesAsync(CancellationToken ct = default)
    {
        return await _context.OwnershipTypeConfigs
            .AsNoTracking()
            .OrderBy(t => t.Order)
            .ThenBy(t => t.CreatedAt)
            .Select(t => new OwnershipTypeResponse
            {
                Id = t.Id, Value = t.Value, Label = t.Label,
                Order = t.Order, IsActive = t.IsActive,
                CreatedAt = t.CreatedAt, UpdatedAt = t.UpdatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<OwnershipTypeResponse> CreateOwnershipTypeAsync(
        UpsertOwnershipTypeRequest request, CancellationToken ct = default)
    {
        var exists = await _context.OwnershipTypeConfigs
            .AnyAsync(t => t.Value == request.Value.Trim(), ct);
        if (exists) throw new BoiootException("نوع الملكية بهذه القيمة موجود مسبقاً", 409);

        var entity = new OwnershipTypeConfig
        {
            Value = request.Value.Trim(), Label = request.Label.Trim(),
            Order = request.Order, IsActive = request.IsActive
        };
        _context.OwnershipTypeConfigs.Add(entity);
        await _context.SaveChangesAsync(ct);

        return new OwnershipTypeResponse
        {
            Id = entity.Id, Value = entity.Value, Label = entity.Label,
            Order = entity.Order, IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task<OwnershipTypeResponse> UpdateOwnershipTypeAsync(
        Guid id, UpsertOwnershipTypeRequest request, CancellationToken ct = default)
    {
        var entity = await _context.OwnershipTypeConfigs
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new BoiootException("نوع الملكية غير موجود", 404);

        var taken = await _context.OwnershipTypeConfigs
            .AnyAsync(t => t.Value == request.Value.Trim() && t.Id != id, ct);
        if (taken) throw new BoiootException("نوع الملكية بهذه القيمة موجود مسبقاً", 409);

        entity.Value = request.Value.Trim(); entity.Label = request.Label.Trim();
        entity.Order = request.Order; entity.IsActive = request.IsActive;
        await _context.SaveChangesAsync(ct);

        return new OwnershipTypeResponse
        {
            Id = entity.Id, Value = entity.Value, Label = entity.Label,
            Order = entity.Order, IsActive = entity.IsActive,
            CreatedAt = entity.CreatedAt, UpdatedAt = entity.UpdatedAt
        };
    }

    public async Task DeleteOwnershipTypeAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.OwnershipTypeConfigs
            .FirstOrDefaultAsync(t => t.Id == id, ct)
            ?? throw new BoiootException("نوع الملكية غير موجود", 404);
        _context.OwnershipTypeConfigs.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task UpdatePropertyStatusAsync(Guid propertyId, PropertyStatus status, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .FirstOrDefaultAsync(p => p.Id == propertyId, ct)
            ?? throw new BoiootException("العقار غير موجود", 404);
        property.Status    = status;
        property.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
    }

    // ── Analytics ──────────────────────────────────────────────────────────────

    public async Task<UserAnalyticsResponse> GetUserAnalyticsAsync(CancellationToken ct = default)
    {
        var now   = DateTime.UtcNow;
        var week  = now.AddDays(-7);
        var month = now.AddMonths(-1);
        var last30 = now.AddDays(-30);

        // Customer directory analytics: excludes Admin and internal staff.
        // Internal accounts are tracked separately in Team Management.
        var allUsers = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .Where(u => CustomerRoles.Contains(u.Role))
            .Select(u => new { u.Role, u.IsActive, u.IsDeleted, u.CreatedAt, u.LastLoginAt })
            .ToListAsync(ct);

        var byRole = allUsers
            .GroupBy(u => u.Role.ToString())
            .ToDictionary(g => g.Key, g => g.Count());

        // Ensure every known CUSTOMER role appears in the response (even if 0 users).
        // This is critical for the frontend to render all tabs and filter options.
        foreach (var role in CustomerRoles)
        {
            var roleName = role.ToString();
            if (!byRole.ContainsKey(roleName))
                byRole[roleName] = 0;
        }

        // Plan stats via subscriptions
        var planStats = new Dictionary<string, int>();
        try
        {
            var subs = await _context.Set<Boioot.Domain.Entities.Subscription>()
                .Include(s => s.Plan)
                .Where(s => s.IsActive)
                .Select(s => new { PlanName = s.Plan != null ? (s.Plan.DisplayNameAr ?? s.Plan.Name) : "Free" })
                .ToListAsync(ct);
            planStats = subs.GroupBy(s => s.PlanName).ToDictionary(g => g.Key, g => g.Count());
        }
        catch { }

        return new UserAnalyticsResponse
        {
            TotalUsers         = allUsers.Count,
            ActiveUsers        = allUsers.Count(u => u.IsActive && !u.IsDeleted),
            InactiveUsers      = allUsers.Count(u => !u.IsActive && !u.IsDeleted),
            DeletedUsers       = allUsers.Count(u => u.IsDeleted),
            NewThisWeek        = allUsers.Count(u => u.CreatedAt >= week),
            NewThisMonth       = allUsers.Count(u => u.CreatedAt >= month),
            LoggedInLast30Days = allUsers.Count(u => u.LastLoginAt.HasValue && u.LastLoginAt >= last30),
            ByRole             = byRole,
            ByPlan             = planStats,
        };
    }

    // ── Bulk actions ───────────────────────────────────────────────────────────

    public async Task<BulkUserActionResponse> BulkUserActionAsync(
        Guid adminUserId, BulkUserActionRequest request, CancellationToken ct = default)
    {
        if (request.UserIds.Count == 0)
            throw new BoiootException("لم يتم تحديد أي مستخدمين", 400);

        if (request.Action == "export")
        {
            var exportUsers = await _context.Users
                .IgnoreQueryFilters()
                .AsNoTracking()
                .Where(u => request.UserIds.Contains(u.Id))
                .Select(u => new AdminUserResponse
                {
                    Id              = u.Id,
                    FullName        = u.FullName,
                    Email           = u.Email,
                    Phone           = u.Phone,
                    Role            = u.Role.ToString(),
                    IsActive        = u.IsActive,
                    IsDeleted       = u.IsDeleted,
                    CreatedAt       = u.CreatedAt,
                    UpdatedAt       = u.UpdatedAt,
                    LastLoginAt     = u.LastLoginAt,
                })
                .ToListAsync(ct);
            return new BulkUserActionResponse
            {
                Affected   = exportUsers.Count,
                Message    = $"تم تصدير {exportUsers.Count} مستخدم",
                ExportData = exportUsers,
            };
        }

        var users = await _context.Users
            .IgnoreQueryFilters()
            .Where(u => request.UserIds.Contains(u.Id))
            .ToListAsync(ct);

        bool newStatus = request.Action switch
        {
            "activate"   => true,
            "deactivate" => false,
            _            => throw new BoiootException("الإجراء غير معروف", 400),
        };

        int affected = 0;
        foreach (var u in users)
        {
            if (u.Id == adminUserId) continue; // don't touch own account
            u.IsActive  = newStatus;
            u.UpdatedAt = DateTime.UtcNow;
            affected++;
        }

        await _context.SaveChangesAsync(ct);

        var label = newStatus ? "تفعيل" : "تعطيل";
        return new BulkUserActionResponse
        {
            Affected = affected,
            Message  = $"تم {label} {affected} مستخدم بنجاح",
        };
    }

    // ── User tags ──────────────────────────────────────────────────────────────

    public async Task<List<UserTagResponse>> GetUserTagsAsync(Guid userId, CancellationToken ct = default)
    {
        var userIdStr = userId.ToString().Replace("'", "''");
        try
        {
            var rows = await _context.Database
                .SqlQueryRaw<UserTagRowFull>($"SELECT Tag, CreatedAt FROM UserTags WHERE UserId = '{userIdStr}' ORDER BY CreatedAt")
                .ToListAsync(ct);

            return rows.Select(r => new UserTagResponse
            {
                Tag       = r.Tag,
                CreatedAt = DateTime.TryParse(r.CreatedAt, out var dt) ? dt : DateTime.UtcNow,
            }).ToList();
        }
        catch
        {
            return [];
        }
    }

    public async Task<UserTagResponse> AddUserTagAsync(Guid userId, string tag, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(tag) || tag.Length > 50)
            throw new BoiootException("التاج غير صالح (1-50 حرف)", 400);

        var user = await _context.Users.IgnoreQueryFilters().AnyAsync(u => u.Id == userId, ct);
        if (!user) throw new BoiootException("المستخدم غير موجود", 404);

        var tagClean  = tag.Trim().Replace("'", "''");
        var userIdStr = userId.ToString();
        var newId     = Guid.NewGuid().ToString();
        var now       = DateTime.UtcNow.ToString("yyyy-MM-dd HH:mm:ss");

        try
        {
            await _context.Database.ExecuteSqlRawAsync(
                $"INSERT OR IGNORE INTO UserTags (Id, UserId, Tag, CreatedAt) VALUES ('{newId}', '{userIdStr}', '{tagClean}', '{now}')",
                ct);
        }
        catch (Exception ex)
        {
            throw new BoiootException("تعذّر إضافة التاج: " + ex.Message, 500);
        }

        return new UserTagResponse { Tag = tag.Trim(), CreatedAt = DateTime.UtcNow };
    }

    public async Task RemoveUserTagAsync(Guid userId, string tag, CancellationToken ct = default)
    {
        var tagClean  = tag.Trim().Replace("'", "''");
        var userIdStr = userId.ToString();
        await _context.Database.ExecuteSqlRawAsync(
            $"DELETE FROM UserTags WHERE UserId = '{userIdStr}' AND lower(Tag) = lower('{tagClean}')",
            ct);
    }

    public async Task<List<string>> GetAllTagsAsync(CancellationToken ct = default)
    {
        try
        {
            return await _context.Database
                .SqlQueryRaw<string>("SELECT DISTINCT Tag FROM UserTags ORDER BY Tag")
                .ToListAsync(ct);
        }
        catch
        {
            return [];
        }
    }

    // ── Multi-level verification ──────────────────────────────────────────────

    public async Task<UserVerificationResponse> GetUserVerificationAsync(
        Guid userId, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        return MapToVerificationResponse(user);
    }

    public async Task<UserVerificationResponse> UpdateUserVerificationAsync(
        Guid adminUserId, Guid userId, UpdateUserVerificationRequest request, CancellationToken ct = default)
    {
        var user = await _context.Users
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(u => u.Id == userId, ct)
            ?? throw new BoiootException("المستخدم غير موجود", 404);

        if (!CustomerRoles.Contains(user.Role))
            throw new BoiootException("لا يمكن تعديل توثيق حسابات الإدارة والطاقم", 400);

        // Resolve status + level from request (fall back to current values if not supplied)
        var newStatus = request.VerificationStatus is not null
            && Enum.TryParse<VerificationStatus>(request.VerificationStatus, out var vs)
            ? vs : user.VerificationStatus;

        var newLevel = request.VerificationLevel is not null
            ? request.VerificationLevel.Value
            : user.VerificationLevel;

        // Single source of truth: IsVerified + VerifiedAt/By are always set here
        ApplyVerificationCore(user, newStatus, newLevel, adminUserId);

        // Apply remaining fields that are outside core verification logic
        if (request.PhoneVerified is not null)
            user.PhoneVerified = request.PhoneVerified.Value;

        if (request.EmailVerified is not null)
            user.EmailVerified = request.EmailVerified.Value;

        if (request.IdentityVerificationStatus is not null &&
            Enum.TryParse<IdentityVerificationStatus>(request.IdentityVerificationStatus, out var idvs))
            user.IdentityVerificationStatus = idvs;

        if (request.BusinessVerificationStatus is not null &&
            Enum.TryParse<BusinessVerificationStatus>(request.BusinessVerificationStatus, out var bvs))
            user.BusinessVerificationStatus = bvs;

        if (request.VerificationBadge is not null)
            user.VerificationBadge = string.IsNullOrWhiteSpace(request.VerificationBadge)
                ? null : request.VerificationBadge.Trim();

        if (request.VerificationNotes is not null)
            user.VerificationNotes = string.IsNullOrWhiteSpace(request.VerificationNotes)
                ? null : request.VerificationNotes.Trim();

        if (request.RejectionReason is not null)
            user.RejectionReason = string.IsNullOrWhiteSpace(request.RejectionReason)
                ? null : request.RejectionReason.Trim();

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Admin {AdminId} updated verification for user {UserId}: status={Status} level={Level}",
            adminUserId, userId, user.VerificationStatus, user.VerificationLevel);

        return MapToVerificationResponse(user);
    }

    private static UserVerificationResponse MapToVerificationResponse(User user) => new()
    {
        UserId                     = user.Id,
        FullName                   = user.FullName,
        Role                       = user.Role.ToString(),
        IsVerified                 = user.IsVerified,
        VerifiedAt                 = user.VerifiedAt,
        VerifiedBy                 = user.VerifiedBy,
        VerificationStatus         = user.VerificationStatus.ToString(),
        VerificationLevel          = user.VerificationLevel,
        PhoneVerified              = user.PhoneVerified,
        EmailVerified              = user.EmailVerified,
        IdentityVerificationStatus = user.IdentityVerificationStatus.ToString(),
        BusinessVerificationStatus = user.BusinessVerificationStatus.ToString(),
        VerificationBadge          = user.VerificationBadge,
        VerificationNotes          = user.VerificationNotes,
        RejectionReason            = user.RejectionReason,
        UpdatedAt                  = user.UpdatedAt,
    };

    // ── Unified verification helpers ──────────────────────────────────────────

    /// <summary>
    /// Single source of truth for all verification state changes.
    /// Computes IsVerified from VerificationStatus and manages VerifiedAt/By.
    /// Every code path that changes verification MUST go through this method.
    /// </summary>
    private static void ApplyVerificationCore(
        User user, VerificationStatus status, int level, Guid adminUserId)
    {
        user.VerificationStatus = status;
        user.VerificationLevel  = Math.Clamp(level, 0, 4);

        // IsVerified is ALWAYS derived from VerificationStatus — never set directly
        user.IsVerified = status is VerificationStatus.Verified
                                 or VerificationStatus.PartiallyVerified;

        if (user.IsVerified)
        {
            user.VerifiedAt ??= DateTime.UtcNow;   // preserve original timestamp on re-verify
            user.VerifiedBy   = adminUserId.ToString();
        }
        else
        {
            user.VerifiedAt = null;
        }

        user.UpdatedAt = DateTime.UtcNow;
    }

    /// <summary>
    /// Maps a User entity to AdminUserResponse.
    /// Centralises all field assignments — no more copy-paste blocks.
    /// </summary>
    private static AdminUserResponse MapToAdminUserResponse(User user) => new()
    {
        Id                         = user.Id,
        FullName                   = user.FullName,
        Email                      = user.Email,
        Phone                      = user.Phone,
        ProfileImageUrl            = user.ProfileImageUrl,
        Role                       = user.Role.ToString(),
        IsActive                   = user.IsActive,
        IsDeleted                  = user.IsDeleted,
        CreatedAt                  = user.CreatedAt,
        UpdatedAt                  = user.UpdatedAt,
        LastLoginAt                = user.LastLoginAt,
        IsVerified                 = user.IsVerified,
        VerifiedAt                 = user.VerifiedAt,
        VerifiedBy                 = user.VerifiedBy,
        VerificationStatus         = user.VerificationStatus.ToString(),
        VerificationLevel          = user.VerificationLevel,
        PhoneVerified              = user.PhoneVerified,
        EmailVerified              = user.EmailVerified,
        IdentityVerificationStatus = user.IdentityVerificationStatus.ToString(),
        BusinessVerificationStatus = user.BusinessVerificationStatus.ToString(),
        VerificationBadge          = user.VerificationBadge,
        VerificationNotes          = user.VerificationNotes,
        RejectionReason            = user.RejectionReason,
    };

    private class UserTagRowFull
    {
        public string Tag { get; set; } = "";
        public string CreatedAt { get; set; } = "";
    }
}
