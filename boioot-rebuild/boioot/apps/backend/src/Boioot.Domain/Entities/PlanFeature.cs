namespace Boioot.Domain.Entities;

/// <summary>
/// Links a Plan to a FeatureDefinition.
/// Use IsEnabled to toggle features per plan — do NOT delete rows.
/// </summary>
public class PlanFeature : BaseEntity
{
    public Guid SubscriptionPlanId { get; set; }
    public Guid FeatureDefinitionId { get; set; }

    /// <summary>Set to false to disable a feature without removing the row.</summary>
    public bool IsEnabled { get; set; } = true;

    public Plan Plan { get; set; } = null!;
    public FeatureDefinition FeatureDefinition { get; set; } = null!;
}
