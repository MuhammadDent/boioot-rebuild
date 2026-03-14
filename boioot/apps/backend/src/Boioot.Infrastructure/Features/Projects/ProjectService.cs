using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Projects.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Projects;

public class ProjectService : IProjectService
{
    private readonly BoiootDbContext _context;
    private readonly ILogger<ProjectService> _logger;

    public ProjectService(BoiootDbContext context, ILogger<ProjectService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<PagedResult<ProjectResponse>> GetPublicListAsync(
        ProjectFilters filters, CancellationToken ct = default)
    {
        var page = Math.Max(1, filters.Page);
        var pageSize = Math.Clamp(filters.PageSize, 1, 50);

        var query = _context.Projects
            .Include(p => p.Company)
            .Include(p => p.Images.Where(i => i.IsPrimary))
            .Where(p => p.IsPublished);

        query = ApplyFilters(query, filters);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<ProjectResponse>(
            items.Select(MapToResponse).ToList(),
            page, pageSize, total);
    }

    public async Task<ProjectResponse> GetByIdPublicAsync(Guid id, CancellationToken ct = default)
    {
        var project = await _context.Projects
            .Include(p => p.Company)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id && p.IsPublished, ct)
            ?? throw new BoiootException("المشروع غير موجود", 404);

        return MapToResponse(project);
    }

    public async Task<ProjectResponse> CreateAsync(
        Guid userId, string userRole, CreateProjectRequest request, CancellationToken ct = default)
    {
        var companyId = request.CompanyId!.Value;

        var companyExists = await _context.Companies
            .AnyAsync(c => c.Id == companyId, ct);

        if (!companyExists)
            throw new BoiootException("الشركة غير موجودة", 404);

        await EnsureCanManageCompanyAsync(userId, userRole, companyId, ct);

        var project = new Project
        {
            Title = request.Title.Trim(),
            Description = request.Description?.Trim(),
            Status = request.Status,
            City = request.City.Trim(),
            Address = request.Address?.Trim(),
            Latitude = request.Latitude,
            Longitude = request.Longitude,
            StartingPrice = request.StartingPrice,
            DeliveryDate = request.DeliveryDate,
            IsPublished = request.IsPublished,
            CompanyId = companyId
        };

        _context.Projects.Add(project);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Project created: {ProjectId} | Company: {CompanyId} | By: {UserId}",
            project.Id, project.CompanyId, userId);

        return await LoadAndMapAsync(project.Id, ct);
    }

    public async Task<ProjectResponse> UpdateAsync(
        Guid userId, string userRole, Guid projectId, UpdateProjectRequest request, CancellationToken ct = default)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new BoiootException("المشروع غير موجود", 404);

        await EnsureCanManageProjectAsync(userId, userRole, project, ct);

        project.Title = request.Title.Trim();
        project.Description = request.Description?.Trim();
        project.Status = request.Status;
        project.City = request.City.Trim();
        project.Address = request.Address?.Trim();
        project.Latitude = request.Latitude;
        project.Longitude = request.Longitude;
        project.StartingPrice = request.StartingPrice;
        project.DeliveryDate = request.DeliveryDate;
        project.IsPublished = request.IsPublished;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Project updated: {ProjectId} | By: {UserId}",
            projectId, userId);

        return await LoadAndMapAsync(projectId, ct);
    }

    public async Task DeleteAsync(
        Guid userId, string userRole, Guid projectId, CancellationToken ct = default)
    {
        var project = await _context.Projects
            .FirstOrDefaultAsync(p => p.Id == projectId, ct)
            ?? throw new BoiootException("المشروع غير موجود", 404);

        await EnsureCanManageProjectAsync(userId, userRole, project, ct);

        project.IsDeleted = true;
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Project soft-deleted: {ProjectId} | By: {UserId}",
            projectId, userId);
    }

    public async Task<PagedResult<ProjectResponse>> GetDashboardListAsync(
        Guid userId, string userRole, ProjectFilters filters, CancellationToken ct = default)
    {
        var page = Math.Max(1, filters.Page);
        var pageSize = Math.Clamp(filters.PageSize, 1, 50);

        var query = _context.Projects
            .Include(p => p.Company)
            .Include(p => p.Images.Where(i => i.IsPrimary));

        IQueryable<Project> filteredQuery = userRole == RoleNames.CompanyOwner
            ? await BuildCompanyOwnerQueryAsync(query, userId, ct)
            : query;

        filteredQuery = ApplyFilters(filteredQuery, filters);

        var total = await filteredQuery.CountAsync(ct);

        var items = await filteredQuery
            .OrderByDescending(p => p.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<ProjectResponse>(
            items.Select(MapToResponse).ToList(),
            page, pageSize, total);
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private static IQueryable<Project> ApplyFilters(
        IQueryable<Project> query, ProjectFilters filters)
    {
        if (!string.IsNullOrWhiteSpace(filters.City))
            query = query.Where(p => p.City == filters.City.Trim());

        if (filters.Status.HasValue)
            query = query.Where(p => p.Status == filters.Status.Value);

        return query;
    }

    private async Task<IQueryable<Project>> BuildCompanyOwnerQueryAsync(
        IQueryable<Project> query, Guid userId, CancellationToken ct)
    {
        var companyId = await _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => a.CompanyId)
            .FirstOrDefaultAsync(ct);

        return companyId.HasValue
            ? query.Where(p => p.CompanyId == companyId.Value)
            : query.Where(_ => false);
    }

    private async Task EnsureCanManageCompanyAsync(
        Guid userId, string userRole, Guid companyId, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin) return;

        if (userRole == RoleNames.CompanyOwner)
        {
            var ownsCompany = await _context.Agents
                .AnyAsync(a => a.UserId == userId && a.CompanyId == companyId, ct);

            if (!ownsCompany)
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

    private async Task EnsureCanManageProjectAsync(
        Guid userId, string userRole, Project project, CancellationToken ct)
    {
        if (userRole == RoleNames.Admin) return;

        if (userRole == RoleNames.CompanyOwner)
        {
            var ownsCompany = await _context.Agents
                .AnyAsync(a => a.UserId == userId && a.CompanyId == project.CompanyId, ct);

            if (!ownsCompany)
            {
                _logger.LogWarning(
                    "CompanyOwner {UserId} attempted unauthorized access to project {ProjectId}",
                    userId, project.Id);
                throw new BoiootException("ليس لديك صلاحية إدارة هذا المشروع", 403);
            }

            return;
        }

        _logger.LogWarning(
            "User {UserId} with role {Role} attempted unauthorized access to project {ProjectId}",
            userId, userRole, project.Id);
        throw new BoiootException("غير مصرح لك بتنفيذ هذا الإجراء", 403);
    }

    private async Task<ProjectResponse> LoadAndMapAsync(Guid projectId, CancellationToken ct)
    {
        var project = await _context.Projects
            .Include(p => p.Company)
            .Include(p => p.Images)
            .FirstAsync(p => p.Id == projectId, ct);

        return MapToResponse(project);
    }

    private static ProjectResponse MapToResponse(Project p) => new()
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
        CompanyName = p.Company?.Name ?? string.Empty,
        Images = p.Images
            .OrderBy(i => i.Order)
            .Select(i => new ProjectImageResponse
            {
                Id = i.Id,
                ImageUrl = i.ImageUrl,
                IsPrimary = i.IsPrimary,
                Order = i.Order
            })
            .ToList(),
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
