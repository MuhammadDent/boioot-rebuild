namespace Boioot.Application.Features.Plans.DTOs;

public class SetPlanLimitRequest
{
    /// <summary>The new limit value. Must be an integer. Use -1 for unlimited.</summary>
    public int Value { get; set; }
}
