using Boioot.Application.Features.Bookings.DTOs;

namespace Boioot.Application.Features.Bookings.Interfaces;

public interface IBookingService
{
    Task<BookingResponse> CreateAsync(Guid userId, CreateBookingRequest request, CancellationToken ct = default);
    Task<bool> IsAvailableAsync(Guid propertyId, DateTime startDate, DateTime endDate, CancellationToken ct = default);
    Task<IReadOnlyList<BookingResponse>> GetMineAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<BookingResponse>> GetForMyPropertiesAsync(Guid userId, CancellationToken ct = default);
    Task<BookingResponse> ConfirmAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> RejectAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> CancelAsync(Guid userId, Guid bookingId, CancellationToken ct = default);
}