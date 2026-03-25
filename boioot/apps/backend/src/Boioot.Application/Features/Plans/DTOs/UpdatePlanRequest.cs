using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Plans.DTOs;

public class UpdatePlanRequest
{
    [Required, MaxLength(100)]
    public string  Name                    { get; set; } = string.Empty;

    /// <summary>Primary Arabic display name shown in UI.</summary>
    [MaxLength(100)]
    public string? DisplayNameAr           { get; set; }

    /// <summary>Secondary English display name.</summary>
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
    public decimal BasePriceMonthly        { get; set; }

    [Range(0, double.MaxValue)]
    public decimal BasePriceYearly         { get; set; }

    public bool    IsActive                { get; set; } = true;

    public string? ApplicableAccountType   { get; set; }

    public int     DisplayOrder            { get; set; } = 0;

    public bool    IsPublic                { get; set; } = true;

    public bool    IsRecommended           { get; set; } = false;

    public string? PlanCategory            { get; set; }

    /// <summary>"InternalOnly" | "StripeOnly" | "Hybrid"</summary>
    public string  BillingMode             { get; set; } = "InternalOnly";

    [MaxLength(80)]
    public string? BadgeText               { get; set; }

    [MaxLength(20)]
    public string? PlanColor               { get; set; }

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
