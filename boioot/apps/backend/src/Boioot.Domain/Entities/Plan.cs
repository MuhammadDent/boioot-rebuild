using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>Marketing description shown on the pricing page.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Which account type this plan applies to.
    /// Null = available for all account types.
    /// </summary>
    public AccountType? ApplicableAccountType { get; set; }

    // ── Limits ────────────────────────────────────────────────────
    /// <summary>Monthly listing limit. -1 = unlimited.</summary>
    public int ListingLimit { get; set; } = 2;

    /// <summary>Active project limit. -1 = unlimited.</summary>
    public int ProjectLimit { get; set; } = 0;

    /// <summary>Max agents the account can create. -1 = unlimited.</summary>
    public int AgentLimit { get; set; } = 0;

    /// <summary>Featured (highlighted) listing slots per month.</summary>
    public int FeaturedSlots { get; set; } = 0;

    /// <summary>Max images per property listing. -1 = unlimited.</summary>
    public int ImageLimitPerListing { get; set; } = 5;

    /// <summary>Whether video upload is allowed.</summary>
    public bool VideoAllowed { get; set; } = false;

    /// <summary>Whether the account has access to the analytics dashboard.</summary>
    public bool AnalyticsAccess { get; set; } = false;

    // ── Pricing ───────────────────────────────────────────────────
    /// <summary>Base monthly price before any discounts or add-ons.</summary>
    public decimal BasePriceMonthly { get; set; } = 0;

    /// <summary>Base yearly price before any discounts or add-ons.</summary>
    public decimal BasePriceYearly { get; set; } = 0;

    // ── Display ───────────────────────────────────────────────────
    /// <summary>JSON TEXT array of marketing feature strings shown on the pricing page.</summary>
    public string? Features { get; set; }

    public bool IsActive { get; set; } = true;

    public ICollection<Account> Accounts { get; set; } = [];
    public ICollection<Subscription> Subscriptions { get; set; } = [];
    public ICollection<PlanFeature> PlanFeatures { get; set; } = [];
    public ICollection<PlanLimit> PlanLimits { get; set; } = [];
}
