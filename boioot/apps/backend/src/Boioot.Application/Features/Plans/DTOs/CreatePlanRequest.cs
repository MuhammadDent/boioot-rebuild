using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Plans.DTOs;

public class CreatePlanRequest
{
    [Required, MaxLength(100)]
    public string  Name                 { get; set; } = string.Empty;

    [MaxLength(500)]
    public string? Description          { get; set; }

    [Range(0, double.MaxValue)]
    public decimal BasePriceMonthly     { get; set; } = 0;

    [Range(0, double.MaxValue)]
    public decimal BasePriceYearly      { get; set; } = 0;

    /// <summary>null = applies to all account types. "Individual" | "Business" | etc.</summary>
    public string? ApplicableAccountType { get; set; }
}
