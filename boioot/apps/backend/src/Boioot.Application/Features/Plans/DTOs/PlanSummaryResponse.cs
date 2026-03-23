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
    public DateTime CreatedAt              { get; set; }
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
}
