using Boioot.Application.Features.Dashboard.DTOs;
using Boioot.Application.Features.Dashboard.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Dashboard;

public class DashboardService : IDashboardService
{
    private const int DashboardListLimit = 10;

    private readonly BoiootDbContext _context;

    public DashboardService(BoiootDbContext context)
    {
        _context = context;
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

        return new DashboardSummaryResponse
        {
            TotalProperties    = totalProperties,
            TotalProjects      = totalProjects,
            TotalRequests      = totalRequests,
            NewRequests        = newRequests,
            TotalConversations = totalConversations,
            UnreadMessages     = unreadMessages
        };
    }

    public async Task<IReadOnlyList<DashboardPropertyItem>> GetPropertiesAsync(
        Guid userId, string userRole, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, userRole, ct);

        return await GetScopedPropertyQuery(scope)
            .OrderByDescending(p => p.CreatedAt)
            .Take(DashboardListLimit)
            .Select(p => new DashboardPropertyItem
            {
                Id          = p.Id,
                Title       = p.Title,
                Status      = p.Status,
                Type        = p.Type,
                ListingType = p.ListingType,
                Price       = p.Price,
                City        = p.City,
                CreatedAt   = p.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<DashboardProjectItem>> GetProjectsAsync(
        Guid userId, string userRole, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, userRole, ct);

        return await GetScopedProjectQuery(scope)
            .OrderByDescending(p => p.CreatedAt)
            .Take(DashboardListLimit)
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
    }

    public async Task<IReadOnlyList<DashboardRequestItem>> GetRequestsAsync(
        Guid userId, string userRole, CancellationToken ct = default)
    {
        var scope = await ResolveScopeAsync(userId, userRole, ct);

        return await GetScopedRequestQuery(scope)
            .OrderByDescending(r => r.CreatedAt)
            .Take(DashboardListLimit)
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

    private record DashboardScope(bool IsAdmin, Guid? CompanyId, Guid? AgentId);

    private async Task<DashboardScope> ResolveScopeAsync(
        Guid userId, string userRole, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin)
            return new DashboardScope(IsAdmin: true, CompanyId: null, AgentId: null);

        var agent = await _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => new { a.Id, a.CompanyId })
            .FirstOrDefaultAsync(ct);

        if (userRole == RoleNames.CompanyOwner)
            return new DashboardScope(IsAdmin: false, CompanyId: agent?.CompanyId, AgentId: null);

        return new DashboardScope(IsAdmin: false, CompanyId: agent?.CompanyId, AgentId: agent?.Id);
    }

    // ── Scoped query builders ────────────────────────────────────────────────

    private IQueryable<Property> GetScopedPropertyQuery(DashboardScope scope)
    {
        var query = _context.Properties.AsQueryable();
        if (scope.IsAdmin) return query;
        if (scope.AgentId.HasValue) return query.Where(p => p.AgentId == scope.AgentId.Value);
        if (scope.CompanyId.HasValue) return query.Where(p => p.CompanyId == scope.CompanyId.Value);
        return query.Where(_ => false);
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
