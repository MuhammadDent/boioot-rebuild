using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SpecialRequests.DTOs;

public class SubmitSpecialRequestDto
{
    [Required, MaxLength(200)]
    public string FullName { get; set; } = string.Empty;

    [Required, MaxLength(30)]
    public string Phone { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? WhatsApp { get; set; }

    [EmailAddress, MaxLength(200)]
    public string? Email { get; set; }

    [Required, MaxLength(2000)]
    public string Message { get; set; } = string.Empty;

    [MaxLength(50)]
    public string? Source { get; set; }
}
