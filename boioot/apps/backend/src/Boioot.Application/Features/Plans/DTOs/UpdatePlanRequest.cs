using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Plans.DTOs;

public class UpdatePlanRequest
{
    [Required, MaxLength(100)]
    public string  Name                 { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description          { get; set; }

    [Range(0, double.MaxValue)]
    public decimal BasePriceMonthly     { get; set; }

    [Range(0, double.MaxValue)]
    public decimal BasePriceYearly      { get; set; }

    public bool    IsActive             { get; set; } = true;

    public string? ApplicableAccountType { get; set; }

    public int     DisplayOrder         { get; set; } = 0;

    public bool    IsPublic             { get; set; } = true;

    public bool    IsRecommended        { get; set; } = false;

    public string? PlanCategory         { get; set; }

    /// <summary>"InternalOnly" | "StripeOnly" | "Hybrid"</summary>
    public string  BillingMode          { get; set; } = "InternalOnly";

    [MaxLength(80)]
    public string? BadgeText            { get; set; }

    [MaxLength(20)]
    public string? PlanColor            { get; set; }
}
