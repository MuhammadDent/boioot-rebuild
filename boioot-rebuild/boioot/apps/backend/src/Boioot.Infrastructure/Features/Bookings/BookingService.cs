using Boioot.Application.Exceptions;
using Boioot.Application.Features.Bookings.DTOs;
using Boioot.Application.Features.Bookings.Interfaces;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Bookings;

public class BookingService : IBookingService
{
    private const string Pending = "Pending";
    private const string Confirmed = "Confirmed";
    private const string Rejected = "Rejected";
    private const string Cancelled = "Cancelled";

    private readonly BoiootDbContext _context;
    private readonly IUserNotificationService _notificationService;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        BoiootDbContext context,
        IUserNotificationService notificationService,
        ILogger<BookingService> logger)
    {
        _context = context;
        _notificationService = notificationService;
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
                p.CreatedByUserId,
                p.Title
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

        await EnsureNoConfirmedOverlapAsync(property.Id, start, end, null, ct);

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
            Status = Pending
        };

        _context.Bookings.Add(booking);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("Booking created: {BookingId} | Property: {PropertyId} | By: {UserId}", booking.Id, property.Id, userId);

        await NotifySafelyAsync(
            booking.PropertyOwnerUserId,
            "booking_created",
            "طلب حجز جديد",
            $"وصل طلب حجز جديد لعقارك {property.Title}. راجع الطلب وأكده أو ارفضه من لوحة التحكم.",
            booking.Id,
            ct);

        return Map(booking, property.Title);
    }

    public async Task<bool> IsAvailableAsync(Guid propertyId, DateTime startDate, DateTime endDate, CancellationToken ct = default)
    {
        var property = await _context.Properties
            .AsNoTracking()
            .Where(p => p.Id == propertyId && !p.IsDeleted)
            .Select(p => new
            {
                p.Id,
                p.Status,
                p.ListingType,
                p.IsBookable
            })
            .FirstOrDefaultAsync(ct);

        if (property is null)
            return false;

        if (property.Status != PropertyStatus.Available)
            return false;

        if (!property.IsBookable || !string.Equals(property.ListingType, "DailyRent", StringComparison.OrdinalIgnoreCase))
            return false;

        var start = DateTime.SpecifyKind(startDate.Date, DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(endDate.Date, DateTimeKind.Utc);
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        if (start < today || end <= start)
            return false;

        return !await HasConfirmedOverlapAsync(property.Id, start, end, null, ct);
    }

    public async Task<IReadOnlyList<BookingResponse>> GetMineAsync(Guid userId, CancellationToken ct = default)
    {
        return await (
            from booking in _context.Bookings.AsNoTracking()
            join property in _context.Properties.AsNoTracking() on booking.PropertyId equals property.Id
            where booking.RequestedByUserId == userId
            orderby booking.CreatedAt descending
            select new BookingResponse
            {
                Id = booking.Id,
                PropertyId = booking.PropertyId,
                PropertyTitle = property.Title,
                RequestedByUserId = booking.RequestedByUserId,
                PropertyOwnerUserId = booking.PropertyOwnerUserId,
                StartDate = booking.StartDate,
                EndDate = booking.EndDate,
                GuestName = booking.GuestName,
                Phone = booking.Phone,
                Notes = booking.Notes,
                Status = booking.Status,
                CreatedAt = booking.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<IReadOnlyList<BookingResponse>> GetForMyPropertiesAsync(Guid userId, CancellationToken ct = default)
    {
        var userIdText = userId.ToString();

        return await (
            from booking in _context.Bookings.AsNoTracking()
            join property in _context.Properties.AsNoTracking() on booking.PropertyId equals property.Id
            where booking.PropertyOwnerUserId == userIdText
               || property.OwnerId == userIdText
               || property.CreatedByUserId == userIdText
            orderby booking.CreatedAt descending
            select new BookingResponse
            {
                Id = booking.Id,
                PropertyId = booking.PropertyId,
                PropertyTitle = property.Title,
                RequestedByUserId = booking.RequestedByUserId,
                PropertyOwnerUserId = booking.PropertyOwnerUserId,
                StartDate = booking.StartDate,
                EndDate = booking.EndDate,
                GuestName = booking.GuestName,
                Phone = booking.Phone,
                Notes = booking.Notes,
                Status = booking.Status,
                CreatedAt = booking.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<BookingResponse> ConfirmAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default)
    {
        var (booking, propertyTitle) = await GetOwnedBookingAsync(ownerUserId, bookingId, ct);

        if (!string.Equals(booking.Status, Pending, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("يمكن تأكيد طلبات الحجز المعلقة فقط", 400);

        await EnsureNoConfirmedOverlapAsync(booking.PropertyId, booking.StartDate, booking.EndDate, booking.Id, ct);

        booking.Status = Confirmed;
        await _context.SaveChangesAsync(ct);

        await NotifySafelyAsync(
            booking.RequestedByUserId.ToString(),
            "booking_confirmed",
            "تم تأكيد طلب الحجز",
            $"تم تأكيد حجزك للعقار {propertyTitle}.",
            booking.Id,
            ct);

        return Map(booking, propertyTitle);
    }

    public async Task<BookingResponse> RejectAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default)
    {
        var (booking, propertyTitle) = await GetOwnedBookingAsync(ownerUserId, bookingId, ct);

        if (!string.Equals(booking.Status, Pending, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("يمكن رفض طلبات الحجز المعلقة فقط", 400);

        booking.Status = Rejected;
        await _context.SaveChangesAsync(ct);

        await NotifySafelyAsync(
            booking.RequestedByUserId.ToString(),
            "booking_rejected",
            "تم رفض طلب الحجز",
            $"تم رفض طلب حجزك للعقار {propertyTitle}.",
            booking.Id,
            ct);

        return Map(booking, propertyTitle);
    }

    public async Task<BookingResponse> CancelAsync(Guid userId, Guid bookingId, CancellationToken ct = default)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == bookingId && b.RequestedByUserId == userId, ct)
            ?? throw new BoiootException("طلب الحجز غير موجود", 404);

        if (string.Equals(booking.Status, Rejected, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("لا يمكن إلغاء طلب مرفوض", 400);

        if (string.Equals(booking.Status, Cancelled, StringComparison.OrdinalIgnoreCase))
            return Map(booking, await GetPropertyTitleAsync(booking.PropertyId, ct));

        booking.Status = Cancelled;
        await _context.SaveChangesAsync(ct);

        return Map(booking, await GetPropertyTitleAsync(booking.PropertyId, ct));
    }

    private async Task EnsureNoConfirmedOverlapAsync(Guid propertyId, DateTime start, DateTime end, Guid? excludedBookingId, CancellationToken ct)
    {
        var hasConflict = await HasConfirmedOverlapAsync(propertyId, start, end, excludedBookingId, ct);

        if (hasConflict)
            throw new BoiootException("هذه الفترة محجوزة مسبقاً لهذا العقار", 409);
    }

    private async Task<bool> HasConfirmedOverlapAsync(Guid propertyId, DateTime start, DateTime end, Guid? excludedBookingId, CancellationToken ct)
    {
        return await _context.Bookings
            .AsNoTracking()
            .AnyAsync(b =>
                b.PropertyId == propertyId &&
                b.Status == Confirmed &&
                (!excludedBookingId.HasValue || b.Id != excludedBookingId.Value) &&
                start < b.EndDate &&
                end > b.StartDate,
                ct);
    }

    private async Task<(Booking Booking, string PropertyTitle)> GetOwnedBookingAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct)
    {
        var booking = await _context.Bookings
            .FirstOrDefaultAsync(b => b.Id == bookingId, ct)
            ?? throw new BoiootException("طلب الحجز غير موجود", 404);

        var property = await _context.Properties
            .AsNoTracking()
            .Where(p => p.Id == booking.PropertyId)
            .Select(p => new { p.Title, p.OwnerId, p.CreatedByUserId })
            .FirstOrDefaultAsync(ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        var ownerUserIdText = ownerUserId.ToString();
        var canManage =
            string.Equals(booking.PropertyOwnerUserId, ownerUserIdText, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(property.OwnerId, ownerUserIdText, StringComparison.OrdinalIgnoreCase) ||
            string.Equals(property.CreatedByUserId, ownerUserIdText, StringComparison.OrdinalIgnoreCase);

        if (!canManage)
            throw new BoiootException("غير مصرح لك بإدارة هذا الحجز", 403);

        return (booking, property.Title);
    }

    private async Task<string> GetPropertyTitleAsync(Guid propertyId, CancellationToken ct)
    {
        return await _context.Properties
            .AsNoTracking()
            .Where(p => p.Id == propertyId)
            .Select(p => p.Title)
            .FirstOrDefaultAsync(ct) ?? "";
    }

    private async Task NotifySafelyAsync(string? userIdText, string type, string title, string body, Guid bookingId, CancellationToken ct)
    {
        if (!Guid.TryParse(userIdText, out var recipientId)) return;

        try
        {
            await _notificationService.CreateAsync(
                recipientId,
                type,
                title,
                body,
                bookingId.ToString(),
                "Booking",
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Booking notification failed for booking {BookingId}", bookingId);
        }
    }

    private static BookingResponse Map(Booking booking, string? propertyTitle = null) => new()
    {
        Id = booking.Id,
        PropertyId = booking.PropertyId,
        PropertyTitle = propertyTitle,
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