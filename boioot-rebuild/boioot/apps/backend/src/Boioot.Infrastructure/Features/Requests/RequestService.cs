using Boioot.Application.Common.Models;
using Boioot.Application.Common.Services;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Requests.DTOs;
using Boioot.Application.Features.Requests.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Requests;

public class RequestService : IRequestService
{
    private readonly BoiootDbContext _context;
    private readonly ICompanyOwnershipService _ownership;
    private readonly ILogger<RequestService> _logger;

    public RequestService(
        BoiootDbContext context,
        ICompanyOwnershipService ownership,
        ILogger<RequestService> logger)
    {
        _context = context;
        _ownership = ownership;
        _logger = logger;
    }

    public async Task<RequestResponse> SubmitAsync(
        SubmitRequestRequest request, Guid? userId, CancellationToken ct = default)
    {
        var hasProperty = request.PropertyId.HasValue;
        var hasProject = request.ProjectId.HasValue;

        if (!hasProperty && !hasProject)
            throw new BoiootException("يجب تحديد عقار أو مشروع للاستفسار عنه", 400);

        if (hasProperty && hasProject)
            throw new BoiootException("لا يمكن الاستفسار عن عقار ومشروع في نفس الوقت", 400);

        if (hasProperty)
        {
            var propertyExists = await _context.Properties
                .AnyAsync(p => p.Id == request.PropertyId!.Value && p.Status == PropertyStatus.Available, ct);

            if (!propertyExists)
                throw new BoiootException("العقار غير موجود أو غير متاح", 404);
        }

        if (hasProject)
        {
            var projectExists = await _context.Projects
                .AnyAsync(p => p.Id == request.ProjectId!.Value && p.IsPublished, ct);

            if (!projectExists)
                throw new BoiootException("المشروع غير موجود أو غير متاح", 404);
        }

        var entity = new Request
        {
            Name = request.Name.Trim(),
            Phone = request.Phone.Trim(),
            Email = request.Email?.Trim(),
            Message = request.Message?.Trim(),
            PropertyId = request.PropertyId,
            ProjectId = request.ProjectId,
            Status = RequestStatus.New,
            UserId = userId
        };

        _context.Requests.Add(entity);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Request submitted: {RequestId} | Property: {PropertyId} | Project: {ProjectId}",
            entity.Id, entity.PropertyId, entity.ProjectId);

        return await LoadAndMapAsync(entity.Id, ct);
    }

    public async Task<PagedResult<RequestResponse>> GetMyRequestsAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Requests
            .Include(r => r.Property).ThenInclude(p => p!.Company)
            .Include(r => r.Project).ThenInclude(p => p!.Company)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking();

        var totalCount = await query.CountAsync(ct);
        var totalPages = (int)Math.Ceiling(totalCount / (double)pageSize);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var responses = items.Select(MapToResponse).ToList();
        return new PagedResult<RequestResponse>(responses, totalCount, page, pageSize);
    }

    public async Task<PagedResult<RequestResponse>> GetDashboardListAsync(
        Guid userId, string userRole, RequestFilters filters, CancellationToken ct = default)
    {
        var page = Math.Max(1, filters.Page);
        var pageSize = Math.Clamp(filters.PageSize, 1, 50);

        var query = _context.Requests
            .Include(r => r.Property).ThenInclude(p => p!.Company)
            .Include(r => r.Project).ThenInclude(p => p!.Company)
            .AsQueryable();

        query = await ApplyScopeAsync(query, userId, userRole, ct);
        query = ApplyFilters(query, filters);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<RequestResponse>(
            items.Select(MapToResponse).ToList(),
            page, pageSize, total);
    }

    public async Task<RequestResponse> GetByIdAsync(
        Guid userId, string userRole, Guid requestId, CancellationToken ct = default)
    {
        var request = await _context.Requests
            .Include(r => r.Property).ThenInclude(p => p!.Company)
            .Include(r => r.Project).ThenInclude(p => p!.Company)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        await EnsureCanAccessRequestAsync(userId, userRole, request, ct);

        return MapToResponse(request);
    }

    public async Task<RequestResponse> UpdateStatusAsync(
        Guid userId, string userRole, Guid requestId, RequestStatus newStatus, CancellationToken ct = default)
    {
        var request = await _context.Requests
            .Include(r => r.Property).ThenInclude(p => p!.Company)
            .Include(r => r.Project).ThenInclude(p => p!.Company)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        await EnsureCanAccessRequestAsync(userId, userRole, request, ct);

        request.Status = newStatus;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Request {RequestId} status updated to {Status} by {UserId}",
            requestId, newStatus, userId);

        return MapToResponse(request);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private async Task<IQueryable<Request>> ApplyScopeAsync(
        IQueryable<Request> query, Guid userId, string userRole, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin)
            return query;

        if (userRole == RoleNames.CompanyOwner)
        {
            var companyId = await _ownership.GetCompanyIdForUserAsync(userId, ct);

            if (!companyId.HasValue)
                return query.Where(_ => false);

            var companyPropertyIds = _context.Properties
                .Where(p => p.CompanyId == companyId.Value)
                .Select(p => p.Id);

            var companyProjectIds = _context.Projects
                .Where(p => p.CompanyId == companyId.Value)
                .Select(p => p.Id);

            return query.Where(r =>
                (r.PropertyId.HasValue && companyPropertyIds.Contains(r.PropertyId.Value)) ||
                (r.ProjectId.HasValue && companyProjectIds.Contains(r.ProjectId.Value)));
        }

        if (userRole == RoleNames.Agent)
        {
            var agentId = await _context.Agents
                .Where(a => a.UserId == userId)
                .Select(a => (Guid?)a.Id)
                .FirstOrDefaultAsync(ct);

            if (!agentId.HasValue)
                return query.Where(_ => false);

            var agentPropertyIds = _context.Properties
                .Where(p => p.AgentId == agentId.Value)
                .Select(p => p.Id);

            return query.Where(r =>
                r.PropertyId.HasValue && agentPropertyIds.Contains(r.PropertyId.Value));
        }

        return query.Where(_ => false);
    }

    private static IQueryable<Request> ApplyFilters(
        IQueryable<Request> query, RequestFilters filters)
    {
        if (filters.Status.HasValue)
            query = query.Where(r => r.Status == filters.Status.Value);

        if (filters.PropertyId.HasValue)
            query = query.Where(r => r.PropertyId == filters.PropertyId.Value);

        if (filters.ProjectId.HasValue)
            query = query.Where(r => r.ProjectId == filters.ProjectId.Value);

        return query;
    }

    private async Task EnsureCanAccessRequestAsync(
        Guid userId, string userRole, Request request, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin) return;

        if (userRole == RoleNames.CompanyOwner)
        {
            var companyId = await _ownership.GetCompanyIdForUserAsync(userId, ct);

            if (!companyId.HasValue)
            {
                _logger.LogWarning(
                    "CompanyOwner {UserId} has no company — denied access to request {RequestId}",
                    userId, request.Id);
                throw new BoiootException("غير مصرح لك بعرض هذا الطلب", 403);
            }

            var isCompanyRequest =
                (request.PropertyId.HasValue && await _context.Properties
                    .AnyAsync(p => p.Id == request.PropertyId.Value && p.CompanyId == companyId.Value, ct)) ||
                (request.ProjectId.HasValue && await _context.Projects
                    .AnyAsync(p => p.Id == request.ProjectId.Value && p.CompanyId == companyId.Value, ct));

            if (!isCompanyRequest)
            {
                _logger.LogWarning(
                    "CompanyOwner {UserId} attempted unauthorized access to request {RequestId}",
                    userId, request.Id);
                throw new BoiootException("غير مصرح لك بعرض هذا الطلب", 403);
            }

            return;
        }

        if (userRole == RoleNames.Agent)
        {
            var agentId = await _context.Agents
                .Where(a => a.UserId == userId)
                .Select(a => (Guid?)a.Id)
                .FirstOrDefaultAsync(ct);

            if (!agentId.HasValue)
            {
                _logger.LogWarning(
                    "Agent {UserId} has no agent record — denied access to request {RequestId}",
                    userId, request.Id);
                throw new BoiootException("غير مصرح لك بعرض هذا الطلب", 403);
            }

            var isAgentRequest = request.PropertyId.HasValue &&
                await _context.Properties.AnyAsync(
                    p => p.Id == request.PropertyId.Value && p.AgentId == agentId.Value, ct);

            if (!isAgentRequest)
            {
                _logger.LogWarning(
                    "Agent {UserId} attempted unauthorized access to request {RequestId}",
                    userId, request.Id);
                throw new BoiootException("غير مصرح لك بعرض هذا الطلب", 403);
            }

            return;
        }

        throw new BoiootException("غير مصرح لك بتنفيذ هذا الإجراء", 403);
    }

    private async Task<RequestResponse> LoadAndMapAsync(Guid requestId, CancellationToken ct)
    {
        var request = await _context.Requests
            .Include(r => r.Property).ThenInclude(p => p!.Company)
            .Include(r => r.Project).ThenInclude(p => p!.Company)
            .FirstAsync(r => r.Id == requestId, ct);

        return MapToResponse(request);
    }

    private static RequestResponse MapToResponse(Request r) => new()
    {
        Id = r.Id,
        Name = r.Name,
        Phone = r.Phone,
        Email = r.Email,
        Message = r.Message,
        Status = r.Status.ToString(),
        PropertyId = r.PropertyId,
        PropertyTitle = r.Property?.Title,
        ProjectId = r.ProjectId,
        ProjectTitle = r.Project?.Title,
        CompanyId = r.Property?.CompanyId ?? r.Project?.CompanyId,
        CompanyName = r.Property?.Company?.Name ?? r.Project?.Company?.Name,
        CreatedAt = r.CreatedAt,
        UpdatedAt = r.UpdatedAt
    };
}
