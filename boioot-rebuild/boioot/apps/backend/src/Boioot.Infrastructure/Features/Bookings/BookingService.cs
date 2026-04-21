using Boioot.Application.Exceptions;
using Boioot.Application.Features.Bookings.DTOs;
using Boioot.Application.Features.Bookings.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Bookings;

public class BookingService : IBookingService
{
    private readonly BoiootDbContext _context;
    private readonly ILogger<BookingService> _logger;

    public BookingService(BoiootDbContext context, ILogger<BookingService> logger)
    {
        _context = context;
        _logger = logger;
    }

    public async Task<BookingResponse> CreateAsync(Guid userId, CreateBookingRequest request, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .AsNoTracking()
            .Where(p => p.Id == request.PropertyId && !p.IsDeleted)
            .Select(p => new
            {
                p.Id,
                p.Status,
                p.ListingType,
                p.IsBookable,
                p.OwnerId,
                p.CreatedByUserId
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        if (property.Status != PropertyStatus.Available)
            throw new BoiootException("هذا العقار غير متاح للحجز حالياً", 400);

        if (!property.IsBookable || !string.Equals(property.ListingType, "DailyRent", StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("هذا العقار غير متاح للحجز المباشر", 400);

        var start = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(request.EndDate.Date, DateTimeKind.Utc);
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        if (start < today)
            throw new BoiootException("لا يمكن اختيار تاريخ قديم", 400);

        if (end <= start)
            throw new BoiootException("تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول", 400);

        var ownerUserId = !string.IsNullOrWhiteSpace(property.OwnerId)
            ? property.OwnerId
            : property.CreatedByUserId;

        if (string.Equals(ownerUserId, userId.ToString(), StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("لا يمكنك حجز إعلانك الخاص", 400);

        var booking = new Booking
        {
            PropertyId = property.Id,
            RequestedByUserId = userId,
            PropertyOwnerUserId = string.IsNullOrWhiteSpace(ownerUserId) ? null : ownerUserId,
            StartDate = start,
            EndDate = end,
            GuestName = request.GuestName.Trim(),
            Phone = string.IsNullOrWhiteSpace(request.Phone) ? null : request.Phone.Trim(),
            Notes = string.IsNullOrWhiteSpace(request.Notes) ? null : request.Notes.Trim(),
            Status = "Pending"
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Booking created: {BookingId} | Property: {PropertyId} | By: {UserId}", booking.Id, property.Id, userId);

        return Map(booking);
    }

    private static BookingResponse Map(Booking booking) => new()
    {
        Id = booking.Id,
        PropertyId = booking.PropertyId,
        RequestedByUserId = booking.RequestedByUserId,
        PropertyOwnerUserId = booking.PropertyOwnerUserId,
        StartDate = booking.StartDate,
        EndDate = booking.EndDate,
        GuestName = booking.GuestName,
        Phone = booking.Phone,
        Notes = booking.Notes,
        Status = booking.Status,
        CreatedAt = booking.CreatedAt
    };
}