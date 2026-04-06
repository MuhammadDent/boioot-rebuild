namespace Boioot.Application.Features.Subscriptions.DTOs;

public sealed class SubscriptionHistoryDto
{
    public Guid   Id             { get; init; }
    public string EventType      { get; init; } = string.Empty;
    public string? OldPlanName   { get; init; }
    public string? NewPlanName   { get; init; }
    public string? Notes         { get; init; }
    public DateTime CreatedAtUtc { get; init; }
    public string? CreatedByName { get; init; }
}
