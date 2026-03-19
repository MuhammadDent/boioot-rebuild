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
            Currency = p.Currency,
            Area = p.Area,
            Type = p.Type.ToString(),
            ListingType = p.ListingType,
            Status = p.Status.ToString(),
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
}
