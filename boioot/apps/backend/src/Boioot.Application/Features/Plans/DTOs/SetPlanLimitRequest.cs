namespace Boioot.Application.Features.Plans.DTOs;

public class SetPlanLimitRequest
{
    /// <summary>The new limit value. Use -1 for unlimited.</summary>
    public decimal Value { get; set; }
}
