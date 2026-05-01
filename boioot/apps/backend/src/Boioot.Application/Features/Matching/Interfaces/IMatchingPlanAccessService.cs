using Boioot.Application.Features.Matching.DTOs;

namespace Boioot.Application.Features.Matching.Interfaces;

/// <summary>
/// Reads a user's matching-specific feature entitlements from their active matching subscription.
/// Returns safe defaults (all false/0) when the user has no matching subscription.
/// This is intentionally separate from the listings plan access to keep product areas isolated.
/// </summary>
public interface IMatchingPlanAccessService
{
    Task<MatchingUserFeaturesDto> GetFeaturesAsync(Guid userId, CancellationToken ct = default);
}
