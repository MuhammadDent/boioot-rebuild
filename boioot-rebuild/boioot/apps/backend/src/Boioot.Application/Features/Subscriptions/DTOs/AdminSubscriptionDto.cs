namespace Boioot.Application.Features.Subscriptions.DTOs;

public sealed class AdminSubscriptionDto
{
    public Guid   SubscriptionId      { get; init; }
    public Guid   AccountId           { get; init; }
    public string AccountName         { get; init; } = string.Empty;
    public string AccountOwnerEmail   { get; init; } = string.Empty;
    public Guid   PlanId              { get; init; }
    public string PlanName            { get; init; } = string.Empty;
    public string Status              { get; init; } = string.Empty;
    public bool   AutoRenew           { get; init; }
    public bool   IsActive            { get; init; }
    public DateTime StartDate         { get; init; }
    public DateTime? EndDate          { get; init; }
    public DateTime? TrialEndsAt      { get; init; }
    public DateTime? CurrentPeriodEnd { get; init; }
    public DateTime? CanceledAt       { get; init; }
    public string? BillingCycle       { get; init; }
    public decimal PriceAmount        { get; init; }
    public string CurrencyCode        { get; init; } = "SYP";
}
