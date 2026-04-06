using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Billing.DTOs;

public sealed class SubmitProofRequest
{
    [Required]
    [Url]
    public string ImageUrl { get; init; } = string.Empty;

    public string? Notes { get; init; }
}
