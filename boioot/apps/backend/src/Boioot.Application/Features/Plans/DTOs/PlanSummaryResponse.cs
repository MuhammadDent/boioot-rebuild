namespace Boioot.Application.Features.Plans.DTOs;

public class PlanSummaryResponse
{
    public Guid    Id                      { get; set; }
    public string  Name                    { get; set; } = string.Empty;
    public string? Code                    { get; set; }
    public string? Description             { get; set; }
    public bool    IsActive                { get; set; }
    public decimal BasePriceMonthly        { get; set; }
    public decimal BasePriceYearly         { get; set; }
    public string? ApplicableAccountType   { get; set; }
    public DateTime CreatedAt             { get; set; }
    public int     DisplayOrder            { get; set; }
    public bool    IsPublic                { get; set; }
    public bool    IsRecommended           { get; set; }
    public string? PlanCategory            { get; set; }
    public string  BillingMode             { get; set; } = "InternalOnly";
    public int     Rank                    { get; set; }
    public string? BadgeText               { get; set; }
    public string? PlanColor               { get; set; }

    // ── Trial ──────────────────────────────────────────────────────────────
    public bool    HasTrial                { get; set; }
    public int     TrialDays               { get; set; }
    public bool    RequiresPaymentForTrial { get; set; }

    // ── Business Rules ─────────────────────────────────────────────────────
    public bool    IsDefaultForNewUsers    { get; set; }
    public bool    AvailableForSelfSignup  { get; set; }
    public bool    RequiresAdminApproval   { get; set; }
    public bool    AllowAddOns             { get; set; }
    public bool    AllowUpgrade            { get; set; }
    public bool    AllowDowngrade          { get; set; }
    public bool    AutoDowngradeOnExpiry   { get; set; }

    // ── Key Limits (denormalized for list view) ────────────────────────────
    /// <summary>max_active_listings. -1 = unlimited. 0 = not set.</summary>
    public int ListingsLimit     { get; set; }
    /// <summary>max_agents. -1 = unlimited. 0 = not set.</summary>
    public int AgentsLimit       { get; set; }
    /// <summary>max_projects. -1 = unlimited. 0 = not set.</summary>
    public int ProjectsLimit     { get; set; }
    /// <summary>max_images_per_listing. -1 = unlimited. 0 = not set.</summary>
    public int ImagesPerListing  { get; set; }
    /// <summary>max_featured_slots. -1 = unlimited. 0 = not set.</summary>
    public int FeaturedSlots     { get; set; }

    // ── Key Feature Indicators (denormalized for list view) ───────────────
    public bool HasAnalytics        { get; set; }   // analytics_dashboard
    public bool HasFeaturedListings { get; set; }   // featured_listings
    public bool HasProjectMgmt      { get; set; }   // project_management
    public bool HasWhatsApp         { get; set; }   // whatsapp_contact
    public bool HasVerifiedBadge    { get; set; }   // verified_badge
    public bool HasPrioritySupport  { get; set; }   // priority_support
}
