namespace Boioot.Application.Features.Bookings.Settings;

public sealed class BookingOptions
{
    public const string SectionName = "Booking";

    public decimal CommissionPercent { get; set; } = 10m;
}