using Boioot.Application.Common.Models;
using Boioot.Application.Features.Dashboard.DTOs;
using Boioot.Application.Features.Dashboard.Interfaces;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Dashboard;

public class DashboardService : IDashboardService
{
    private readonly BoiootDbContext _context;
    private readonly IPlanEntitlementService _entitlement;
    private readonly IAccountResolver _accountResolver;
    private readonly ILogger<DashboardService> _logger;

    public DashboardService(
        BoiootDbContext context,
        IPlanEntitlementService entitlement,
        IAccountResolver accountResolver,
        ILogger<DashboardService> logger)
    {
        _context         = context;
        _entitlement     = entitlement;
        _accountResolver = accountResolver;
        _logger          = logger;
    }

    public async Task<DashboardSummaryResponse> GetSummaryAsync(
        Guid userId, string userRole, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, userRole, ct);

        var propertyQuery = GetScopedPropertyQuery(scope);
        var projectQuery  = GetScopedProjectQuery(scope);
        var requestQuery  = GetScopedRequestQuery(scope);

        var totalProperties    = await propertyQuery.CountAsync(ct);
        var totalProjects      = await projectQuery.CountAsync(ct);
        var totalRequests      = await requestQuery.CountAsync(ct);
        var newRequests        = await requestQuery.CountAsync(r => r.Status == RequestStatus.New, ct);
        var totalConversations = await CountConversationsAsync(userId, ct);
        var unreadMessages     = await CountUnreadMessagesAsync(userId, ct);

        // ── بيانات خطة الاشتراك ──────────────────────────────────────────
        var planName         = (string?)null;
        var listingsUsed     = 0;
        var listingsLimit    = 0;
        var agentsUsed       = 0;
        var agentsLimit      = 0;
        var hasAnalytics     = false;

        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (accountId.HasValue)
        {
            planName = await _accountResolver.GetPlanNameAsync(accountId.Value, ct);

            var rawListingsLimit = await _entitlement.GetLimitAsync(
                accountId.Value, SubscriptionKeys.MaxActiveListings, ct);
            listingsLimit = (int)rawListingsLimit;

            var rawAgentsLimit = await _entitlement.GetLimitAsync(
                accountId.Value, SubscriptionKeys.MaxAgents, ct);
            agentsLimit = (int)rawAgentsLimit;

            hasAnalytics = await _entitlement.HasFeatureAsync(
                accountId.Value, SubscriptionKeys.AnalyticsDashboard, ct);

            listingsUsed = await _context.Properties
                .Where(p => p.AccountId == accountId.Value
                         && p.IsDeleted == false
                         && (p.Status == PropertyStatus.Available || p.Status == PropertyStatus.Inactive))
                .CountAsync(ct);

            agentsUsed = await _context.AccountUsers
                .Where(au => au.AccountId == accountId.Value
                          && au.OrganizationUserRole == OrganizationUserRole.Agent
                          && au.IsActive == true)
                .CountAsync(ct);
        }

        _logger.LogDebug(
            "Dashboard summary fetched for User: {UserId} | Role: {Role} | " +
            "Properties: {Props}, Projects: {Projs}, Requests: {Reqs}",
            userId, userRole, totalProperties, totalProjects, totalRequests);

        return new DashboardSummaryResponse
        {
            TotalProperties    = totalProperties,
            TotalProjects      = totalProjects,
            TotalRequests      = totalRequests,
            NewRequests        = newRequests,
            TotalConversations = totalConversations,
            UnreadMessages     = unreadMessages,
            PlanName           = planName,
            ListingsUsed       = listingsUsed,
            ListingsLimit      = listingsLimit,
            AgentsUsed         = agentsUsed,
            AgentsLimit        = agentsLimit,
            HasAnalyticsDashboard = hasAnalytics
        };
    }

    public async Task<DashboardAnalyticsResponse> GetAnalyticsAsync(
        Guid userId, string userRole, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, userRole, ct);

        var propQuery = GetScopedPropertyQuery(scope).Where(p => !p.IsDeleted);
        var reqQuery  = GetScopedRequestQuery(scope);

        // ── KPI: listings by status ────────────────────────────────────────
        var byStatus = await propQuery
            .GroupBy(p => p.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        int total    = byStatus.Sum(x => x.Count);
        int active   = byStatus.FirstOrDefault(x => x.Status == PropertyStatus.Available)?.Count ?? 0;
        int inactive = byStatus.FirstOrDefault(x => x.Status == PropertyStatus.Inactive)?.Count ?? 0;
        int sold     = byStatus.FirstOrDefault(x => x.Status == PropertyStatus.Sold)?.Count ?? 0;
        int rented   = byStatus.FirstOrDefault(x => x.Status == PropertyStatus.Rented)?.Count ?? 0;

        // ── KPI: projects & agents ─────────────────────────────────────────
        var projQuery   = GetScopedProjectQuery(scope).Where(p => !p.IsDeleted);
        int totalProjects = await projQuery.CountAsync(ct);

        int totalAgents = scope.CompanyId.HasValue
            ? await _context.Agents.CountAsync(a => a.CompanyId == scope.CompanyId.Value, ct)
            : 0;

        // ── KPI: requests & views ──────────────────────────────────────────
        int  totalRequests = await reqQuery.CountAsync(ct);
        int  newRequests   = await reqQuery.CountAsync(r => r.Status == RequestStatus.New, ct);
        long totalViews    = await propQuery.SumAsync(p => (long)p.ViewCount, ct);

        // ── Monthly trends (last 6 months) ────────────────────────────────
        var startOf6Months = new DateTime(
            DateTime.UtcNow.AddMonths(-5).Year,
            DateTime.UtcNow.AddMonths(-5).Month,
            1, 0, 0, 0, DateTimeKind.Utc);

        var rawMonthlyListings = await propQuery
            .Where(p => p.CreatedAt >= startOf6Months)
            .GroupBy(p => new { p.CreatedAt.Year, p.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToListAsync(ct);

        var rawMonthlyRequests = await reqQuery
            .Where(r => r.CreatedAt >= startOf6Months)
            .GroupBy(r => new { r.CreatedAt.Year, r.CreatedAt.Month })
            .Select(g => new { g.Key.Year, g.Key.Month, Count = g.Count() })
            .ToListAsync(ct);

        string[] arabicMonths = ["يناير","فبراير","مارس","أبريل","مايو","يونيو",
                                  "يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];

        var sixMonths = Enumerable.Range(0, 6)
            .Select(i => DateTime.UtcNow.AddMonths(-5 + i))
            .Select(d => (d.Year, d.Month))
            .ToList();

        var monthlyListings = sixMonths.Select(m => new MonthlyDataPoint(
            Label: arabicMonths[m.Month - 1],
            Count: rawMonthlyListings.FirstOrDefault(x => x.Year == m.Year && x.Month == m.Month)?.Count ?? 0
        )).ToList();

        var monthlyRequests = sixMonths.Select(m => new MonthlyDataPoint(
            Label: arabicMonths[m.Month - 1],
            Count: rawMonthlyRequests.FirstOrDefault(x => x.Year == m.Year && x.Month == m.Month)?.Count ?? 0
        )).ToList();

        // ── Top listings by views ──────────────────────────────────────────
        var topRaw = await propQuery
            .OrderByDescending(p => p.ViewCount)
            .Take(5)
            .Select(p => new { p.Id, p.Title, p.ViewCount, p.Status, p.City })
            .ToListAsync(ct);

        var topIds = topRaw.Select(p => p.Id).ToList();
        var reqCounts = await _context.Requests
            .Where(r => r.PropertyId.HasValue && topIds.Contains(r.PropertyId.Value))
            .GroupBy(r => r.PropertyId!.Value)
            .Select(g => new { PropertyId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.PropertyId, x => x.Count, ct);

        var topListings = topRaw.Select(p => new TopListingItem(
            p.Id, p.Title, p.ViewCount,
            reqCounts.GetValueOrDefault(p.Id, 0),
            StatusToArabic(p.Status),
            p.City
        )).ToList();

        // ── Attention: listings missing images or price ────────────────────
        var attentionRaw = await propQuery
            .Where(p => p.Status == PropertyStatus.Available || p.Status == PropertyStatus.Inactive)
            .Where(p => !_context.PropertyImages.Any(i => i.PropertyId == p.Id) || p.Price == 0)
            .OrderByDescending(p => p.CreatedAt)
            .Take(5)
            .Select(p => new
            {
                p.Id, p.Title,
                HasImages = _context.PropertyImages.Any(i => i.PropertyId == p.Id),
                p.Price
            })
            .ToListAsync(ct);

        var attentionListings = attentionRaw.Select(p => new AttentionListingItem(
            p.Id, p.Title,
            !p.HasImages ? "لا توجد صور للإعلان" : "السعر غير محدد"
        )).ToList();

        return new DashboardAnalyticsResponse
        {
            TotalListings    = total,
            ActiveListings   = active,
            InactiveListings = inactive,
            SoldListings     = sold,
            RentedListings   = rented,
            TotalProjects    = totalProjects,
            TotalAgents      = totalAgents,
            TotalRequests    = totalRequests,
            NewRequests      = newRequests,
            TotalViews       = totalViews,
            MonthlyListings  = monthlyListings,
            MonthlyRequests  = monthlyRequests,
            TopListings      = topListings,
            AttentionListings = attentionListings,
        };
    }

    private static string StatusToArabic(PropertyStatus status) => status switch
    {
        PropertyStatus.Available => "نشط",
        PropertyStatus.Inactive  => "غير نشط",
        PropertyStatus.Sold      => "مباع",
        PropertyStatus.Rented    => "مؤجر",
        _                        => status.ToString()
    };

    public async Task<PagedResult<DashboardPropertyItem>> GetPropertiesAsync(
        Guid userId, string userRole, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var scope = await ResolveScopeAsync(userId, userRole, ct);
        var query = GetScopedPropertyQuery(scope);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new DashboardPropertyItem
            {
                Id          = p.Id,
                Title       = p.Title,
                Status      = p.Status,
                Type        = p.Type,
                ListingType = p.ListingType,
                Price       = p.Price,
                Currency    = p.Currency,
                Province    = p.Province,
                City        = p.City,
                CreatedAt   = p.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<DashboardPropertyItem>(items, page, pageSize, total);
    }

    public async Task<PagedResult<DashboardProjectItem>> GetProjectsAsync(
        Guid userId, string userRole, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var scope = await ResolveScopeAsync(userId, userRole, ct);
        var query = GetScopedProjectQuery(scope);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => new DashboardProjectItem
            {
                Id            = p.Id,
                Title         = p.Title,
                Status        = p.Status,
                City          = p.City,
                StartingPrice = p.StartingPrice,
                IsPublished   = p.IsPublished,
                CreatedAt     = p.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<DashboardProjectItem>(items, page, pageSize, total);
    }

    public async Task<PagedResult<DashboardRequestItem>> GetRequestsAsync(
        Guid userId, string userRole, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var scope = await ResolveScopeAsync(userId, userRole, ct);
        var query = GetScopedRequestQuery(scope);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new DashboardRequestItem
            {
                Id            = r.Id,
                Name          = r.Name,
                Phone         = r.Phone,
                Status        = r.Status,
                PropertyTitle = r.Property != null ? r.Property.Title : null,
                ProjectTitle  = r.Project  != null ? r.Project.Title  : null,
                CreatedAt     = r.CreatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<DashboardRequestItem>(items, page, pageSize, total);
    }

    public async Task<DashboardMessageSummaryResponse> GetMessagesSummaryAsync(
        Guid userId, CancellationToken ct = default)
    {
        return new DashboardMessageSummaryResponse
        {
            TotalConversations = await CountConversationsAsync(userId, ct),
            UnreadMessages     = await CountUnreadMessagesAsync(userId, ct)
        };
    }

    // ── Scope resolution ────────────────────────────────────────────────────

    private record DashboardScope(bool IsAdmin, Guid UserId, Guid? CompanyId, Guid? AgentId);

    private async Task<DashboardScope> ResolveScopeAsync(
        Guid userId, string userRole, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin)
            return new DashboardScope(IsAdmin: true, UserId: userId, CompanyId: null, AgentId: null);

        var agent = await _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Id, a.CompanyId })
            .FirstOrDefaultAsync(ct);

        if (agent is null)
        {
            _logger.LogWarning(
                "No agent record found for User: {UserId} | Role: {Role}", userId, userRole);
        }

        if (userRole == RoleNames.CompanyOwner)
            return new DashboardScope(IsAdmin: false, UserId: userId, CompanyId: agent?.CompanyId, AgentId: null);

        return new DashboardScope(IsAdmin: false, UserId: userId, CompanyId: agent?.CompanyId, AgentId: agent?.Id);
    }

    // ── Scoped query builders ────────────────────────────────────────────────

    private IQueryable<Property> GetScopedPropertyQuery(DashboardScope scope)
    {
        var query = _context.Properties.AsQueryable();
        if (scope.IsAdmin) return query;

        var ownerIdStr = scope.UserId.ToString();

        if (scope.AgentId.HasValue)
            return query.Where(p =>
                p.AgentId == scope.AgentId.Value ||
                p.OwnerId == ownerIdStr);

        if (scope.CompanyId.HasValue)
            return query.Where(p =>
                p.CompanyId == scope.CompanyId.Value ||
                p.OwnerId == ownerIdStr);

        return query.Where(p => p.OwnerId == ownerIdStr);
    }

    private IQueryable<Project> GetScopedProjectQuery(DashboardScope scope)
    {
        var query = _context.Projects.AsQueryable();
        if (scope.IsAdmin) return query;
        if (scope.CompanyId.HasValue) return query.Where(p => p.CompanyId == scope.CompanyId.Value);
        return query.Where(_ => false);
    }

    private IQueryable<Request> GetScopedRequestQuery(DashboardScope scope)
    {
        var query = _context.Requests.AsQueryable();
        if (scope.IsAdmin) return query;

        if (scope.AgentId.HasValue)
        {
            var agentPropertyIds = _context.Properties
                .Where(p => p.AgentId == scope.AgentId.Value)
                .Select(p => p.Id);

            return query.Where(r => r.PropertyId.HasValue
                                 && agentPropertyIds.Contains(r.PropertyId.Value));
        }

        if (scope.CompanyId.HasValue)
        {
            var companyPropertyIds = _context.Properties
                .Where(p => p.CompanyId == scope.CompanyId.Value)
                .Select(p => p.Id);

            var companyProjectIds = _context.Projects
                .Where(p => p.CompanyId == scope.CompanyId.Value)
                .Select(p => p.Id);

            return query.Where(r =>
                (r.PropertyId.HasValue && companyPropertyIds.Contains(r.PropertyId.Value)) ||
                (r.ProjectId.HasValue  && companyProjectIds.Contains(r.ProjectId.Value)));
        }

        return query.Where(_ => false);
    }

    // ── Messaging count helpers ──────────────────────────────────────────────

    private Task<int> CountConversationsAsync(Guid userId, CancellationToken ct) =>
        _context.Conversations.CountAsync(
            c => c.User1Id == userId || c.User2Id == userId, ct);

    private Task<int> CountUnreadMessagesAsync(Guid userId, CancellationToken ct) =>
        _context.Messages.CountAsync(
            m => m.SenderId != userId
              && !m.IsRead
              && (m.Conversation.User1Id == userId || m.Conversation.User2Id == userId), ct);
}
