using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Subscriptions.DTOs;

public sealed class CancelSubscriptionRequest
{
    [MaxLength(500)]
    public string? Notes { get; init; }
}
