using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Plans.DTOs;

public class CreatePlanRequest
{
    [Required, MaxLength(100)]
    public string  Name                    { get; set; } = string.Empty;

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
