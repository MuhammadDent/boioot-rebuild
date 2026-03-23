using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Plan : BaseEntity
{
    public string Name { get; set; } = string.Empty;

    /// <summary>
    /// Stable machine-readable identifier for this plan.
    /// Used by entitlement/enforcement code to reference plans without relying on Names.
    /// Format: snake_case, e.g. "owner_pro", "broker_premium", "office_starter".
    /// Never rename after plans are in use.
    /// </summary>
    public string? Code { get; set; }

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

    // ── Trial ─────────────────────────────────────────────────────
    /// <summary>Whether this plan offers a free trial period.</summary>
    public bool HasTrial { get; set; } = false;

    /// <summary>Number of trial days (0 if HasTrial = false).</summary>
    public int TrialDays { get; set; } = 0;

    /// <summary>Whether a payment method must be entered to start the trial.</summary>
    public bool RequiresPaymentForTrial { get; set; } = false;

    // ── Business Rules ────────────────────────────────────────────
    /// <summary>When true, new accounts are placed on this plan automatically.</summary>
    public bool IsDefaultForNewUsers { get; set; } = false;

    /// <summary>When true, users can sign up for this plan without admin intervention.</summary>
    public bool AvailableForSelfSignup { get; set; } = true;

    /// <summary>When true, an admin must approve before the plan becomes active.</summary>
    public bool RequiresAdminApproval { get; set; } = false;

    /// <summary>Whether the account can purchase plan add-ons.</summary>
    public bool AllowAddOns { get; set; } = false;

    /// <summary>Whether subscribers can upgrade to a higher plan.</summary>
    public bool AllowUpgrade { get; set; } = true;

    /// <summary>Whether subscribers can downgrade to a lower plan.</summary>
    public bool AllowDowngrade { get; set; } = true;

    /// <summary>When true, the account is automatically downgraded on subscription expiry.</summary>
    public bool AutoDowngradeOnExpiry { get; set; } = true;

    // ── Display ───────────────────────────────────────────────────
    /// <summary>JSON TEXT array of marketing feature strings shown on the pricing page.</summary>
    public string? Features { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Ordinal rank used for upgrade/downgrade comparison.
    /// Higher = more advanced plan. 0 = Free.
    /// Individual plans: 0-3.  Professional plans: 10-14.
    /// Plans with different rank groups cannot be compared for upgrade intent.
    /// </summary>
    public int Rank { get; set; } = 0;

    // ── Display & Visibility ──────────────────────────────────────────────────

    /// <summary>Ordering index on the public pricing page. Lower = appears first.</summary>
    public int DisplayOrder { get; set; } = 0;

    /// <summary>When false, plan is hidden from the public pricing page.</summary>
    public bool IsPublic { get; set; } = true;

    /// <summary>When true, plan is highlighted as recommended on the pricing page.</summary>
    public bool IsRecommended { get; set; } = false;

    /// <summary>Used to group plans on the pricing page. E.g. "Individual" or "Business".</summary>
    public string? PlanCategory { get; set; }

    /// <summary>Controls which billing providers are offered for this plan. "InternalOnly" | "StripeOnly" | "Hybrid".</summary>
    public string BillingMode { get; set; } = "InternalOnly";

    /// <summary>Optional short badge/label shown on the pricing card (e.g. "الأكثر مبيعاً").</summary>
    public string? BadgeText { get; set; }

    /// <summary>Optional hex color used as the plan card accent (e.g. "#2e7d32").</summary>
    public string? PlanColor { get; set; }

    public ICollection<Account> Accounts { get; set; } = [];
    public ICollection<Subscription> Subscriptions { get; set; } = [];
    public ICollection<PlanFeature> PlanFeatures { get; set; } = [];
    public ICollection<PlanLimit> PlanLimits { get; set; } = [];

    /// <summary>Normalized pricing entries (monthly, yearly, etc.).</summary>
    public ICollection<PlanPricing> PlanPricings { get; set; } = [];
}
