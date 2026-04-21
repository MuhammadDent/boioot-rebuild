using Boioot.Application.Features.Bookings.DTOs;

namespace Boioot.Application.Features.Bookings.Interfaces;

public interface IBookingService
{
    Task<BookingResponse> CreateAsync(Guid userId, CreateBookingRequest request, CancellationToken ct = default);
}