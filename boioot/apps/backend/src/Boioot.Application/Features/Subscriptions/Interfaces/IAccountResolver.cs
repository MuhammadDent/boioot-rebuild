namespace Boioot.Application.Features.Subscriptions.Interfaces;

/// <summary>
/// Resolves the active Account for a given user.
/// A user may belong to multiple accounts; returns the most relevant one
/// (primary/admin account first, then any active membership).
/// </summary>
public interface IAccountResolver
{
    /// <summary>
    /// Returns the AccountId for the given user, or null if the user
    /// has no active account membership.
    /// </summary>
    Task<Guid?> ResolveAccountIdAsync(Guid userId, CancellationToken ct = default);

    /// <summary>
    /// Returns the active Plan name for the given account, or null if no active subscription.
    /// </summary>
    Task<string?> GetPlanNameAsync(Guid accountId, CancellationToken ct = default);
}
