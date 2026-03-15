using Boioot.Application.Common.Models;
using Boioot.Application.Common.Services;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Properties.Interfaces;
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
    private readonly ILogger<PropertyService> _logger;

    public PropertyService(
        BoiootDbContext context,
        ICompanyOwnershipService ownership,
        ILogger<PropertyService> logger)
    {
        _context = context;
        _ownership = ownership;
        _logger = logger;
    }

    public async Task<PagedResult<PropertyResponse>> GetPublicListAsync(
        PropertyFilters filters, CancellationToken ct = default)
    {
        var page = Math.Max(1, filters.Page);
        var pageSize = Math.Clamp(filters.PageSize, 1, 50);

        var query = _context.Properties
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
            .Include(p => p.Company)
            .Include(p => p.Images)
            .FirstOrDefaultAsync(p => p.Id == id && p.Status != PropertyStatus.Inactive, ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        return MapToResponse(property);
    }

    public async Task<PropertyResponse> GetByIdDashboardAsync(
        Guid userId, string userRole, Guid propertyId, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .Include(p => p.Company)
            .Include(p => p.Images)
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
                throw new BoiootException("لا توجد شركة مرتبطة بحسابك — يرجى إنشاء شركة أولاً أو تحديد معرف الشركة", 400);

            companyId = ownedCompanyId.Value;
        }

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
            AgentId = request.AgentId
        };

        _context.Properties.Add(property);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Property created: {PropertyId} | Company: {CompanyId} | By: {UserId}",
            property.Id, property.CompanyId, userId);

        return await LoadAndMapAsync(property.Id, ct);
    }

    public async Task<PropertyResponse> UpdateAsync(
        Guid userId, string userRole, Guid propertyId, UpdatePropertyRequest request, CancellationToken ct = default)
    {
        var property = await _context.Properties
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

        await _context.SaveChangesAsync(ct);

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
            .Include(p => p.Company)
            .Include(p => p.Images.Where(i => i.IsPrimary));

        IQueryable<Property> filteredQuery = userRole switch
        {
            RoleNames.CompanyOwner => await BuildCompanyOwnerQueryAsync(query, userId, ct),
            RoleNames.Agent => await BuildAgentQueryAsync(query, userId, ct),
            _ => query
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

    // ── Private helpers ─────────────────────────────────────────────────────

    private static IQueryable<Property> ApplyFilters(
        IQueryable<Property> query, PropertyFilters filters)
    {
        if (!string.IsNullOrWhiteSpace(filters.Province))
            query = query.Where(p => p.Province == filters.Province.Trim());

        if (!string.IsNullOrWhiteSpace(filters.City))
            query = query.Where(p => p.City == filters.City.Trim());

        if (filters.Type.HasValue)
            query = query.Where(p => p.Type == filters.Type.Value);

        if (!string.IsNullOrWhiteSpace(filters.ListingType))
            query = query.Where(p => p.ListingType == filters.ListingType.Trim());

        if (filters.MinPrice.HasValue)
            query = query.Where(p => p.Price >= filters.MinPrice.Value);

        if (filters.MaxPrice.HasValue)
            query = query.Where(p => p.Price <= filters.MaxPrice.Value);

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

        throw new BoiootException("غير مصرح لك بتنفيذ هذا الإجراء", 403);
    }

    private async Task<PropertyResponse> LoadAndMapAsync(Guid propertyId, CancellationToken ct)
    {
        var property = await _context.Properties
            .Include(p => p.Company)
            .Include(p => p.Images)
            .FirstAsync(p => p.Id == propertyId, ct);

        return MapToResponse(property);
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
        CompanyId = p.CompanyId,
        CompanyName = p.Company?.Name ?? string.Empty,
        AgentId = p.AgentId,
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
        CreatedAt = p.CreatedAt,
        UpdatedAt = p.UpdatedAt
    };
}
