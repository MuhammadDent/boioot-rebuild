namespace Boioot.Application.Features.Bookings.DTOs;

public class BookingResponse
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string? PropertyTitle { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string? PropertyOwnerUserId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public int GuestCount { get; set; } = 1;
    public decimal PricePerNight { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal CommissionPercent { get; set; }
    public decimal CommissionAmount { get; set; }
    public string Currency { get; set; } = "SYP";
    public string PaymentStatus { get; set; } = "NotPaid";
    public string Status { get; set; } = "PendingApproval";
    public DateTime CreatedAt { get; set; }

    public string? PaymentProofUrls { get; set; }
    public string? PaymentProofNote { get; set; }
    public DateTime? PaymentProofSubmittedAt { get; set; }
    public DateTime? ApprovedAt { get; set; }
    public DateTime? ConfirmedAt { get; set; }
    public string? OwnerNotes { get; set; }
    public DateTime? RevisionRequestedAt { get; set; }
}