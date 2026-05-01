using Boioot.Application.Features.Bookings.DTOs;

namespace Boioot.Application.Features.Bookings.Interfaces;

public interface IBookingService
{
    Task<BookingResponse> CreateAsync(Guid userId, CreateBookingRequest request, CancellationToken ct = default);
    Task<(bool Available, string? Reason)> IsAvailableAsync(Guid propertyId, DateTime startDate, DateTime endDate, CancellationToken ct = default);
    Task<IReadOnlyList<BookingResponse>> GetMineAsync(Guid userId, CancellationToken ct = default);
    Task<IReadOnlyList<BookingResponse>> GetForMyPropertiesAsync(Guid userId, CancellationToken ct = default);
    Task<BookingResponse> ConfirmAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> RejectAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> CancelAsync(Guid userId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> SubmitPaymentProofAsync(Guid tenantUserId, Guid bookingId, SubmitPaymentProofRequest request, CancellationToken ct = default);
    Task<BookingResponse> OwnerConfirmAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> RejectProofAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
    Task<BookingResponse> OwnerCancelAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default);
}