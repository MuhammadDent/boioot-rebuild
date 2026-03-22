namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class FreePlanActivationResponse
{
    public Guid   SubscriptionId { get; init; }
    public string PlanName       { get; init; } = string.Empty;
    public string Message        { get; init; } = string.Empty;
}
