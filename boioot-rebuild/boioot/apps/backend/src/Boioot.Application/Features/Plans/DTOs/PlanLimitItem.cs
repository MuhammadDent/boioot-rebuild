namespace Boioot.Application.Features.Plans.DTOs;

public class PlanLimitItem
{
    public Guid   LimitDefinitionId { get; set; }
    public string Key               { get; set; } = string.Empty;
    public string Name              { get; set; } = string.Empty;
    public string? Unit             { get; set; }
    /// <summary>-1 = unlimited. Always an integer.</summary>
    public int Value                { get; set; }
}
