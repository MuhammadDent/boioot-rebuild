namespace Boioot.Application.Features.Plans.DTOs;

public class PlanFeatureItem
{
    public Guid   FeatureDefinitionId { get; set; }
    public string Key                 { get; set; } = string.Empty;
    public string Name                { get; set; } = string.Empty;
    public string? FeatureGroup       { get; set; }
    public bool   IsEnabled           { get; set; }
}
