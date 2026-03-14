using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class SubscriptionPlan : AuditableEntity
{
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public decimal MonthlyPrice { get; set; }
    public decimal? YearlyPrice { get; set; }
    public string Currency { get; set; } = "SAR";
    public int MaxListings { get; set; } = 10;
    public int MaxFeaturedListings { get; set; } = 0;
    public int MaxAgents { get; set; } = 1;
    public bool HasAnalytics { get; set; } = false;
    public bool HasPrioritySupport { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public int SortOrder { get; set; } = 0;

    public ICollection<CompanySubscription> Subscriptions { get; set; } = [];
}
