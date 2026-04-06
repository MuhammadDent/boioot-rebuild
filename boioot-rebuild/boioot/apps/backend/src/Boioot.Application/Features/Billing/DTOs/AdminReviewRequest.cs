namespace Boioot.Application.Features.Billing.DTOs;

public sealed class AdminReviewRequest
{
    /// <summary>Optional note from the admin (reason for rejection, confirmation reference, etc.).</summary>
    public string? Note { get; init; }
}
