namespace Boioot.Domain.Entities;

/// <summary>
/// Links a Plan to a LimitDefinition with a numeric value.
/// -1 = unlimited. Always use this normalized structure — never store limits inside Plans.
/// </summary>
public class PlanLimit : BaseEntity
{
    public Guid SubscriptionPlanId { get; set; }
    public Guid LimitDefinitionId { get; set; }

    /// <summary>The numeric limit value. -1 = unlimited.</summary>
    public decimal Value { get; set; }

    public Plan Plan { get; set; } = null!;
    public LimitDefinition LimitDefinition { get; set; } = null!;
}
