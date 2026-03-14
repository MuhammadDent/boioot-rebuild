using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class CompanySubscription : AuditableEntity
{
    public DateTime StartsAt { get; set; }
    public DateTime ExpiresAt { get; set; }
    public bool IsActive { get; set; } = true;
    public bool IsAutoRenew { get; set; } = false;
    public decimal PricePaid { get; set; }
    public string Currency { get; set; } = "SAR";
    public string? PaymentReference { get; set; }

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public Guid PlanId { get; set; }
    public SubscriptionPlan Plan { get; set; } = null!;
}
