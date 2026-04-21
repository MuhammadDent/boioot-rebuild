namespace Boioot.Domain.Entities;

public class Booking : BaseEntity
{
    public Guid PropertyId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string? PropertyOwnerUserId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public decimal PricePerNight { get; set; }
    public decimal TotalAmount { get; set; }
    public decimal CommissionPercent { get; set; }
    public decimal CommissionAmount { get; set; }
    public string Status { get; set; } = "Pending";
}