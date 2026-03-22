namespace Boioot.Application.Features.Plans.DTOs;

public class PlanSummaryResponse
{
    public Guid    Id                { get; set; }
    public string  Name              { get; set; } = string.Empty;
    public string? Code              { get; set; }
    public string? Description       { get; set; }
    public bool    IsActive          { get; set; }
    public decimal BasePriceMonthly  { get; set; }
    public decimal BasePriceYearly   { get; set; }
    public string? ApplicableAccountType { get; set; }
    public DateTime CreatedAt        { get; set; }
    public int     DisplayOrder      { get; set; }
    public bool    IsPublic          { get; set; }
    public bool    IsRecommended     { get; set; }
    public string? PlanCategory      { get; set; }
    public string  BillingMode       { get; set; } = "InternalOnly";
    public int     Rank              { get; set; }
}
