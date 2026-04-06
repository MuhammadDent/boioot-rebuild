namespace Boioot.Application.Common.Services;

public interface ICompanyOwnershipService
{
    Task<bool> UserOwnsCompanyAsync(Guid userId, Guid companyId, CancellationToken ct = default);
    Task<Guid?> GetCompanyIdForUserAsync(Guid userId, CancellationToken ct = default);
}
