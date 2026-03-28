using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Plans.DTOs;

public class CreatePlanRequest
{
    [Required, MaxLength(100)]
    public string  Name                    { get; set; } = string.Empty;

    /// <summary>Primary Arabic display name shown in UI (e.g. "وسيط أساسي").</summary>
    [MaxLength(100)]
    public string? DisplayNameAr           { get; set; }

    /// <summary>Secondary English display name (e.g. "Broker Basic").</summary>
    [MaxLength(100)]
    public string? DisplayNameEn           { get; set; }

    /// <summary>seeker | owner | broker | office | company</summary>
    [MaxLength(30)]
    public string? AudienceType            { get; set; }

    /// <summary>free | basic | advanced | enterprise</summary>
    [MaxLength(30)]
    public string? Tier                    { get; set; }

    [MaxLength(500)]
    public string? Description             { get; set; }

    [Range(0, double.MaxValue)]
    public decimal BasePriceMonthly        { get; set; } = 0;

    [Range(0, double.MaxValue)]
    public decimal BasePriceYearly         { get; set; } = 0;

    /// <summary>null = applies to all account types.</summary>
    public string? ApplicableAccountType   { get; set; }

    public int     DisplayOrder            { get; set; } = 0;

    [MaxLength(80)]
    public string? BadgeText               { get; set; }

    [MaxLength(20)]
    public string? PlanColor               { get; set; }

    public string? PlanCategory            { get; set; }

    public string  BillingMode             { get; set; } = "InternalOnly";

    // ── Hybrid Billing Type ─────────────────────────────────────────────────
    /// <summary>free_default | one_time_fixed_term | recurring</summary>
    public string  PlanBillingType         { get; set; } = "recurring";

    /// <summary>monthly | yearly | null (only for recurring plans)</summary>
    [MaxLength(20)]
    public string? RecurringCycle          { get; set; }

    /// <summary>Fixed validity period in days (e.g. 90, 180). Null for free/recurring plans.</summary>
    public int?    DurationDays            { get; set; }

    /// <summary>none | listing_quota</summary>
    [MaxLength(50)]
    public string  ConsumptionPolicy       { get; set; } = "none";

    /// <summary>expire_by_date | expire_by_consumption | expire_by_whichever_comes_first</summary>
    [MaxLength(50)]
    public string  ExpiryRule              { get; set; } = "expire_by_date";

    /// <summary>Plan Code to auto-downgrade to on expiry (e.g. "seeker_free").</summary>
    [MaxLength(80)]
    public string? DowngradePlanCode       { get; set; }

    // ── Trial ──────────────────────────────────────────────────────────────
    public bool    HasTrial                { get; set; } = false;
    public int     TrialDays               { get; set; } = 0;
    public bool    RequiresPaymentForTrial { get; set; } = false;

    // ── Business Rules ─────────────────────────────────────────────────────
    public bool    IsDefaultForNewUsers    { get; set; } = false;
    public bool    AvailableForSelfSignup  { get; set; } = true;
    public bool    RequiresAdminApproval   { get; set; } = false;
    public bool    AllowAddOns             { get; set; } = false;
    public bool    AllowUpgrade            { get; set; } = true;
    public bool    AllowDowngrade          { get; set; } = true;
    public bool    AutoDowngradeOnExpiry   { get; set; } = true;
}
