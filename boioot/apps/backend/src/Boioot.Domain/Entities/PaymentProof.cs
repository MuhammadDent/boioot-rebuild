namespace Boioot.Domain.Entities;

/// <summary>
/// Screenshot or document uploaded by the user as proof of bank transfer.
/// One-to-one with Invoice.
/// </summary>
public class PaymentProof : BaseEntity
{
    public Guid InvoiceId { get; set; }

    /// <summary>URL of the uploaded proof image (stored via UploadController).</summary>
    public string ImageUrl { get; set; } = string.Empty;

    /// <summary>Optional free-text note from the user (e.g., transfer reference number).</summary>
    public string? Notes { get; set; }

    public Invoice Invoice { get; set; } = null!;
}
