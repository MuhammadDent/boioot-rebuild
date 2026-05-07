using Boioot.Application.Features.Matching.DTOs;

namespace Boioot.Application.Features.Matching.Interfaces;

/// <summary>
/// Resolves the matching feature entitlements for a user.
///
/// Phase 1: All professional roles (Broker, Agent, CompanyOwner, Office) receive
/// full access — HasProfessionalAccess = true, FullMatchAccess = true, LeadNotifications = true.
/// No subscription is required.
///
/// Future phases: Optional premium add-ons (CRM, Analytics, AutoMatching, etc.) will be
/// resolved here by checking a separate premium entitlement, keeping this interface stable.
/// </summary>
public interface IMatchingPlanAccessService
{
    /// <summary>
    /// Returns the matching feature set for a user.
    /// Safe defaults (all false/0) are returned when the user has no professional account.
    /// </summary>
    Task<MatchingUserFeaturesDto> GetFeaturesAsync(Guid userId, CancellationToken ct = default);
}
