using Boioot.Application.Common.Services;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.AgentManagement.DTOs;
using Boioot.Application.Features.AgentManagement.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.AgentManagement;

public class AgentManagementService : IAgentManagementService
{
    private readonly BoiootDbContext _context;
    private readonly ICompanyOwnershipService _ownership;
    private readonly ILogger<AgentManagementService> _logger;

    public AgentManagementService(
        BoiootDbContext context,
        ICompanyOwnershipService ownership,
        ILogger<AgentManagementService> logger)
    {
        _context = context;
        _ownership = ownership;
        _logger = logger;
    }

    public async Task<AgentSummaryResponse> CreateAgentAsync(
        Guid managerId, string managerRole, CreateAgentRequest request, CancellationToken ct = default)
    {
        var emailLower = request.Email.ToLowerInvariant();

        if (await _context.Users.AnyAsync(u => u.Email == emailLower, ct))
            throw new BoiootException("البريد الإلكتروني مستخدم بالفعل", 409);

        var count = await _context.Users
            .IgnoreQueryFilters()
            .CountAsync(u => u.Role == UserRole.Agent, ct) + 1;

        var userCode = $"AGT-{count:D4}";

        var user = new User
        {
            UserCode     = userCode,
            FullName     = request.FullName.Trim(),
            Email        = emailLower,
            Phone        = request.Phone?.Trim(),
            PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password),
            Role         = UserRole.Agent,
            IsActive     = true
        };

        _context.Users.Add(user);
        await _context.SaveChangesAsync(ct);

        // ربط الوكيل بالمكتب أو الشركة
        Guid? companyId = null;
        Guid? brokerId  = null;

        if (managerRole == RoleNames.CompanyOwner)
        {
            companyId = await _ownership.GetCompanyIdForUserAsync(managerId, ct);
            if (!companyId.HasValue)
                throw new BoiootException("لا توجد شركة مرتبطة بحسابك", 404);
        }
        else if (managerRole == RoleNames.Broker)
        {
            brokerId = managerId;
        }

        var agent = new Agent
        {
            UserId    = user.Id,
            CompanyId = companyId,
            BrokerId  = brokerId,
            Bio       = request.Bio?.Trim()
        };

        _context.Set<Agent>().Add(agent);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Agent created: {AgentId} | Manager: {ManagerId} ({Role})",
            user.Id, managerId, managerRole);

        return MapToResponse(user, agent);
    }

    public async Task<List<AgentSummaryResponse>> GetMyAgentsAsync(
        Guid managerId, string managerRole, CancellationToken ct = default)
    {
        IQueryable<Agent> query = _context.Set<Agent>().Include(a => a.User);

        if (managerRole == RoleNames.CompanyOwner)
        {
            var companyId = await _ownership.GetCompanyIdForUserAsync(managerId, ct);
            if (!companyId.HasValue) return [];
            query = query.Where(a => a.CompanyId == companyId.Value);
        }
        else if (managerRole == RoleNames.Broker)
        {
            query = query.Where(a => a.BrokerId == managerId);
        }
        else return [];

        var agents = await query.ToListAsync(ct);
        return agents.Select(a => MapToResponse(a.User, a)).ToList();
    }

    public async Task DeactivateAgentAsync(
        Guid managerId, string managerRole, Guid agentUserId, CancellationToken ct = default)
    {
        var agent = await _context.Set<Agent>()
            .Include(a => a.User)
            .FirstOrDefaultAsync(a => a.UserId == agentUserId, ct)
            ?? throw new BoiootException("الوكيل غير موجود", 404);

        // التحقق من ملكية الوكيل
        if (managerRole == RoleNames.CompanyOwner)
        {
            var companyId = await _ownership.GetCompanyIdForUserAsync(managerId, ct);
            if (agent.CompanyId != companyId)
                throw new BoiootException("هذا الوكيل لا ينتمي لشركتك", 403);
        }
        else if (managerRole == RoleNames.Broker)
        {
            if (agent.BrokerId != managerId)
                throw new BoiootException("هذا الوكيل لا ينتمي لمكتبك", 403);
        }
        else throw new BoiootException("غير مصرح", 403);

        agent.User.IsActive = !agent.User.IsActive;
        await _context.SaveChangesAsync(ct);
    }

    private static AgentSummaryResponse MapToResponse(User user, Agent agent) => new()
    {
        Id              = user.Id,
        UserCode        = user.UserCode,
        FullName        = user.FullName,
        Email           = user.Email,
        Phone           = user.Phone,
        Bio             = agent.Bio,
        ProfileImageUrl = user.ProfileImageUrl,
        IsActive        = user.IsActive,
        CreatedAt       = user.CreatedAt
    };
}
