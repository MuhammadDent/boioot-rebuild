using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class UploadReceiptDto
{
    /// <summary>Public URL of the uploaded receipt image (stored via Object Storage).</summary>
    [Required]
    [MaxLength(2000)]
    public string ReceiptImageUrl { get; set; } = string.Empty;

    /// <summary>Original file name for display (e.g. "receipt_march_2026.jpg").</summary>
    [MaxLength(300)]
    public string? ReceiptFileName { get; set; }

    [MaxLength(500)]
    public string? CustomerNote { get; set; }
}
