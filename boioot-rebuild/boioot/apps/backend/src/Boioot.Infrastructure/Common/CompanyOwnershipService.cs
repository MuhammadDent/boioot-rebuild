using Boioot.Application.Common.Services;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Common;

public class CompanyOwnershipService : ICompanyOwnershipService
{
    private readonly BoiootDbContext _context;

    public CompanyOwnershipService(BoiootDbContext context)
    {
        _context = context;
    }

    public Task<bool> UserOwnsCompanyAsync(Guid userId, Guid companyId, CancellationToken ct = default) =>
        _context.Agents.AnyAsync(a => a.UserId == userId && a.CompanyId == companyId, ct);

    public Task<Guid?> GetCompanyIdForUserAsync(Guid userId, CancellationToken ct = default) =>
        _context.Agents
            .Where(a => a.UserId == userId)
            .Select(a => a.CompanyId)
            .FirstOrDefaultAsync(ct);
}
