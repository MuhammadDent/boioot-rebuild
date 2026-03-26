namespace Boioot.Application.Features.Admin.DTOs;

public class AdminUserProfileResponse
{
    public Guid Id { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }
    public string Role { get; set; } = string.Empty;
    public bool IsActive { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // ── Activity ──────────────────────────────────────────────────────────────
    public int PropertyCount { get; set; }
    public int RequestCount { get; set; }
    public string? City { get; set; }

    // ── Subscription ──────────────────────────────────────────────────────────
    public bool HasActiveSubscription { get; set; }
    public string? PlanName { get; set; }
    /// <summary>Total listing slots in the plan. -1 = unlimited. 0 = no plan.</summary>
    public int PlanListingLimit { get; set; }
    /// <summary>How many listings the user has currently used from the plan.</summary>
    public int UsedListings { get; set; }
    /// <summary>How many listings remain. -1 = unlimited. 0 = no plan or exhausted.</summary>
    public int RemainingListings { get; set; }
    public string? SubscriptionStatus { get; set; }
    public DateTime? SubscriptionEndDate { get; set; }

    // ── Identity verification ─────────────────────────────────────────────────
    public bool IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string? VerifiedBy { get; set; }
}
