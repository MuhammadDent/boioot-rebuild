namespace Boioot.Application.Features.Matching.DTOs;

/// <summary>
/// Represents the matching-specific features available to a user based on their active matching subscription.
/// Defaults to false/0 when the user has no matching subscription (safe for LaunchMode).
/// </summary>
public class MatchingUserFeaturesDto
{
    /// <summary>Whether the user receives notifications when matching BuyerRequests are created.</summary>
    public bool LeadNotifications { get; set; }

    /// <summary>Whether the user receives notifications immediately (vs 10-30s delay for free users).</summary>
    public bool InstantNotifications { get; set; }

    /// <summary>Whether the user can see all matches (vs only the first 2 for free users).</summary>
    public bool FullMatchAccess { get; set; }

    /// <summary>Monthly lead unlock quota. -1 = unlimited, 0 = none.</summary>
    public int MonthlyLeadUnlocks { get; set; }

    /// <summary>True if the user has any active matching subscription.</summary>
    public bool HasMatchingSubscription { get; set; }
}
