using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Subscription : BaseEntity
{
    public Guid AccountId { get; set; }

    public Guid PlanId { get; set; }

    public SubscriptionStatus Status { get; set; } = SubscriptionStatus.Trial;

    public DateTime StartDate { get; set; }

    public DateTime? EndDate { get; set; }

    public string? PaymentRef { get; set; }

    public Account Account { get; set; } = null!;
    public Plan Plan { get; set; } = null!;
}
