namespace Boioot.Application.Features.Matching.DTOs;

/// <summary>
/// Represents the matching feature entitlements for a professional user.
///
/// Phase 1 — Free for all professionals:
///   All users with a professional role (Broker, Agent, CompanyOwner, Office) receive
///   full matching access at no cost. No subscription required.
///
/// Phase 2+ — Optional premium tools (future, not activated yet):
///   Additional features (CRM, Analytics, AutoMatching, WhatsApp, Export, Priority)
///   will be added here without requiring an architecture redesign.
///   They will be gated via optional premium add-ons, not core subscriptions.
/// </summary>
public class MatchingUserFeaturesDto
{
    /// <summary>
    /// True when the user is a professional account (Broker / Agent / CompanyOwner / Office).
    /// All professional accounts receive full matching access for free.
    /// This is the primary gate — all other features follow from this.
    /// </summary>
    public bool HasProfessionalAccess { get; set; }

    /// <summary>
    /// Whether the user receives notifications when matching BuyerRequests are created.
    /// True for all professional accounts.
    /// </summary>
    public bool LeadNotifications { get; set; }

    /// <summary>
    /// Whether the user receives notifications immediately (no delay).
    /// True for all professional accounts in Phase 1.
    /// Reserved for priority differentiation in future premium tiers.
    /// </summary>
    public bool InstantNotifications { get; set; }

    /// <summary>
    /// Whether the user can see all matched results without restriction.
    /// Always true for professional accounts.
    /// </summary>
    public bool FullMatchAccess { get; set; }

    /// <summary>
    /// Monthly lead unlock quota. -1 = unlimited, 0 = none.
    /// Currently unused — all professional accounts have unlimited access.
    /// Reserved for future quota-based premium tools.
    /// </summary>
    public int MonthlyLeadUnlocks { get; set; }

    /// <summary>
    /// Backward-compatibility alias for HasProfessionalAccess.
    /// Kept to avoid breaking existing serialized clients during transition.
    /// </summary>
    public bool HasMatchingSubscription => HasProfessionalAccess;
}
