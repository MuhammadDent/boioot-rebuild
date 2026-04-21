namespace Boioot.Application.Features.Bookings.DTOs;

public class BookingResponse
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public Guid RequestedByUserId { get; set; }
    public string? PropertyOwnerUserId { get; set; }
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public string GuestName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? Notes { get; set; }
    public string Status { get; set; } = "Pending";
    public DateTime CreatedAt { get; set; }
}