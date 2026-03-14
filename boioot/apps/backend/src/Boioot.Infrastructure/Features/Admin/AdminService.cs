using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Admin.Interfaces;
using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Requests.DTOs;
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

    public async Task<PagedResult<AdminUserResponse>> GetUsersAsync(
        int page, int pageSize, UserRole? role, bool? isActive, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Users
            .IgnoreQueryFilters()
            .AsNoTracking();

        if (role.HasValue)
            query = query.Where(u => u.Role == role.Value);

        if (isActive.HasValue)
            query = query.Where(u => u.IsActive == isActive.Value);

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(u => u.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(u => new AdminUserResponse
            {
                Id = u.Id,
                FullName = u.FullName,
                Email = u.Email,
                Phone = u.Phone,
                Role = u.Role.ToString(),
                IsActive = u.IsActive,
                IsDeleted = u.IsDeleted,
                CreatedAt = u.CreatedAt,
                UpdatedAt = u.UpdatedAt
            })
            .ToListAsync(ct);

        return new PagedResult<AdminUserResponse>(items, page, pageSize, total);
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
                Email = c.Email,
                Phone = c.Phone,
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
        pageSize = Math.Clamp(pageSize, 1, 50);

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
            Area = p.Area,
            Type = p.Type.ToString(),
            ListingType = p.ListingType.ToString(),
            Status = p.Status.ToString(),
            City = p.City,
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
                Email = c.Email,
                Phone = c.Phone,
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
}
