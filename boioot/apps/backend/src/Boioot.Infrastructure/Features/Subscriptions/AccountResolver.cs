using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Subscriptions;

public class AccountResolver : IAccountResolver
{
    private readonly BoiootDbContext _db;

    public AccountResolver(BoiootDbContext db)
    {
        _db = db;
    }

    public async Task<Guid?> ResolveAccountIdAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.AccountUsers
            .Where(au => au.UserId == userId && au.IsActive == true)
            .OrderByDescending(au => au.IsPrimary)
            .ThenByDescending(au => au.OrganizationUserRole == OrganizationUserRole.Admin)
            .Select(au => (Guid?)au.AccountId)
            .FirstOrDefaultAsync(ct);
    }

    public async Task<string?> GetPlanNameAsync(Guid accountId, CancellationToken ct = default)
    {
        return await _db.Subscriptions
            .Where(s => s.AccountId == accountId
                     && s.IsActive == true
                     && (s.Status == SubscriptionStatus.Trial || s.Status == SubscriptionStatus.Active)
                     && (s.EndDate == null || s.EndDate > DateTime.UtcNow))
            .OrderByDescending(s => s.StartDate)
            .Select(s => s.Plan.Name)
            .FirstOrDefaultAsync(ct);
    }
}
