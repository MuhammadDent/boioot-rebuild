using Boioot.Application.Exceptions;
using Boioot.Application.Features.Bookings.DTOs;
using Boioot.Application.Features.Bookings.Interfaces;
using Boioot.Application.Features.Bookings.Settings;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Boioot.Infrastructure.Features.Bookings;

public class BookingService : IBookingService
{
    private const string Pending = "Pending";
    private const string Approved = "Approved";
    private const string Confirmed = "Confirmed";
    private const string Rejected = "Rejected";
    private const string Cancelled = "Cancelled";
    private const string Completed = "Completed";
    private const string NotPaid = "NotPaid";
    private const string ReadyForPayment = "ReadyForPayment";
    private const string Paid = "Paid";

    private readonly BoiootDbContext _context;
    private readonly IUserNotificationService _notificationService;
    private readonly INotificationTemplateService _notificationTemplates;
    private readonly BookingOptions _bookingOptions;
    private readonly ILogger<BookingService> _logger;

    public BookingService(
        BoiootDbContext context,
        IUserNotificationService notificationService,
        INotificationTemplateService notificationTemplates,
        IOptions<BookingOptions> bookingOptions,
        ILogger<BookingService> logger)
    {
        _context = context;
        _notificationService = notificationService;
        _notificationTemplates = notificationTemplates;
        _bookingOptions = bookingOptions.Value;
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
                p.OwnerId,
                p.CreatedByUserId,
                p.Title,
                p.Price
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new BoiootException("العقار غير موجود", 404);

        if (property.Status != PropertyStatus.Available)
            throw new BoiootException("هذا العقار غير متاح للحجز حالياً", 400);

        if (!string.Equals(property.ListingType, "DailyRent", StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("هذا العقار غير متاح للحجز المباشر", 400);

        var start = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
        var end   = DateTime.SpecifyKind(request.EndDate.Date,   DateTimeKind.Utc);
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date,   DateTimeKind.Utc);

        _logger.LogDebug("[CreateBooking] Raw request StartDate={StartDate:O} EndDate={EndDate:O} | Normalised start={Start:yyyy-MM-dd} end={End:yyyy-MM-dd} today={Today:yyyy-MM-dd}",
            request.StartDate, request.EndDate, start, end, today);

        if (start < today)
            throw new BoiootException("لا يمكن اختيار تاريخ قديم", 400);

        if (end <= start)
            throw new BoiootException("تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول", 400);

        await EnsureNoApprovedOverlapAsync(property.Id, start, end, null, ct);

        var ownerUserId = !string.IsNullOrWhiteSpace(property.OwnerId)
            ? property.OwnerId
            : property.CreatedByUserId;

        if (string.Equals(ownerUserId, userId.ToString(), StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("لا يمكنك حجز إعلانك الخاص", 400);

        var nights = (end - start).Days;
        var pricePerNight = property.Price;
        var totalAmount = pricePerNight * nights;
        var commissionPercent = Math.Max(0m, _bookingOptions.CommissionPercent);
        var commissionAmount = Math.Round(totalAmount * commissionPercent / 100m, 2, MidpointRounding.AwayFromZero);

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
            GuestCount = Math.Max(1, request.GuestCount),
            PricePerNight = pricePerNight,
            TotalAmount = totalAmount,
            CommissionPercent = commissionPercent,
            CommissionAmount = commissionAmount,
            PaymentStatus = NotPaid,
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
            property.Title,
            booking.Id,
            ct);

        return Map(booking, property.Title);
    }

    public async Task<(bool Available, string? Reason)> IsAvailableAsync(
        Guid propertyId, DateTime startDate, DateTime endDate, CancellationToken ct = default)
    {
        // ── 1. Log raw inputs ─────────────────────────────────────────────────
        _logger.LogInformation(
            "[Availability] START — propertyId={PropertyId} rawStart={RawStart:O} rawEnd={RawEnd:O} startKind={SK} endKind={EK}",
            propertyId, startDate, endDate, startDate.Kind, endDate.Kind);

        // ── 2. Normalise to UTC-midnight (Npgsql requires Utc kind for timestamptz) ─
        var start = DateTime.SpecifyKind(startDate.Date, DateTimeKind.Utc);
        var end   = DateTime.SpecifyKind(endDate.Date,   DateTimeKind.Utc);
        var today = DateTime.SpecifyKind(DateTime.UtcNow.Date, DateTimeKind.Utc);

        _logger.LogInformation(
            "[Availability] Normalised — start={Start:yyyy-MM-dd}({SK}) end={End:yyyy-MM-dd}({EK}) today={Today:yyyy-MM-dd}",
            start, start.Kind, end, end.Kind, today);

        // ── 3. Fetch property from DB ──────────────────────────────────────────
        Guid       foundId          = default;
        PropertyStatus foundStatus  = default;
        string?    foundListingType = null;
        bool       propertyFound    = false;

        try
        {
            var row = await _context.Properties
                .AsNoTracking()
                .Where(p => p.Id == propertyId && !p.IsDeleted)
                .Select(p => new { p.Id, p.Status, p.ListingType })
                .FirstOrDefaultAsync(ct);

            if (row is not null)
            {
                foundId          = row.Id;
                foundStatus      = row.Status;
                foundListingType = row.ListingType;
                propertyFound    = true;
            }
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[Availability] DB ERROR fetching property — propertyId={PropertyId} msg={Msg}",
                propertyId, ex.Message);
            return (false, "حدث خطأ أثناء التحقق من توفر العقار");
        }

        if (!propertyFound)
        {
            _logger.LogWarning("[Availability] REJECT — property not found propertyId={PropertyId}", propertyId);
            return (false, "العقار غير موجود");
        }

        _logger.LogInformation(
            "[Availability] Property found — status={Status} listingType={ListingType}",
            foundStatus, foundListingType);

        // ── 4. Business rule guards ────────────────────────────────────────────
        if (foundStatus != PropertyStatus.Available)
        {
            _logger.LogInformation("[Availability] REJECT — status={Status} is not Available", foundStatus);
            return (false, "العقار غير متاح للحجز حالياً");
        }

        if (!string.Equals(foundListingType, "DailyRent", StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogInformation("[Availability] REJECT — listingType={ListingType} not DailyRent", foundListingType);
            return (false, "هذا العقار غير متاح للحجز المباشر");
        }

        if (start < today)
        {
            _logger.LogInformation(
                "[Availability] REJECT — start={Start:yyyy-MM-dd} is before today={Today:yyyy-MM-dd}", start, today);
            return (false, "لا يمكن اختيار تاريخ قديم");
        }

        if (end <= start)
        {
            _logger.LogInformation(
                "[Availability] REJECT — end={End:yyyy-MM-dd} <= start={Start:yyyy-MM-dd}", end, start);
            return (false, "تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول");
        }

        // ── 5. Overlap query ──────────────────────────────────────────────────
        // Overlap condition: existing booking overlaps if (start < existing.End) AND (end > existing.Start)
        // Status: treat legacy 'Confirmed' the same as 'Approved' (both block the slot)
        bool hasOverlap;
        try
        {
            _logger.LogInformation(
                "[Availability] Overlap query — propertyId={PropertyId} start={Start:yyyy-MM-dd} end={End:yyyy-MM-dd}",
                foundId, start, end);

            hasOverlap = await _context.Bookings
                .AsNoTracking()
                .AnyAsync(b =>
                    b.PropertyId == foundId &&
                    (b.Status == Approved || b.Status == Confirmed) &&
                    start < b.EndDate &&
                    end > b.StartDate,
                    ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[Availability] DB ERROR in overlap query — propertyId={PropertyId} start={Start:yyyy-MM-dd} end={End:yyyy-MM-dd} msg={Msg}",
                foundId, start, end, ex.Message);
            return (false, "حدث خطأ أثناء التحقق من توفر العقار");
        }

        _logger.LogInformation(
            "[Availability] DONE — propertyId={PropertyId} hasOverlap={HasOverlap} available={Available}",
            foundId, hasOverlap, !hasOverlap);

        return (!hasOverlap, hasOverlap ? "الفترة المحددة محجوزة مسبقاً" : null);
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
                GuestCount = booking.GuestCount < 1 ? 1 : booking.GuestCount,
                PricePerNight = booking.PricePerNight,
                TotalAmount = booking.TotalAmount,
                CommissionPercent = booking.CommissionPercent,
                CommissionAmount = booking.CommissionAmount,
                PaymentStatus = booking.PaymentStatus,
                Status = booking.Status == Confirmed ? Approved : booking.Status,
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
                GuestCount = booking.GuestCount < 1 ? 1 : booking.GuestCount,
                PricePerNight = booking.PricePerNight,
                TotalAmount = booking.TotalAmount,
                CommissionPercent = booking.CommissionPercent,
                CommissionAmount = booking.CommissionAmount,
                PaymentStatus = booking.PaymentStatus,
                Status = booking.Status == Confirmed ? Approved : booking.Status,
                CreatedAt = booking.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<BookingResponse> ConfirmAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default)
    {
        return await ApproveAsync(ownerUserId, bookingId, ct);
    }

    public async Task<BookingResponse> ApproveAsync(Guid ownerUserId, Guid bookingId, CancellationToken ct = default)
    {
        var (booking, propertyTitle) = await GetOwnedBookingAsync(ownerUserId, bookingId, ct);

        if (!string.Equals(booking.Status, Pending, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("يمكن الموافقة على طلبات الحجز المعلقة فقط", 400);

        await EnsureNoApprovedOverlapAsync(booking.PropertyId, booking.StartDate, booking.EndDate, booking.Id, ct);

        booking.Status = Approved;
        booking.PaymentStatus = ReadyForPayment;
        await _context.SaveChangesAsync(ct);

        await NotifySafelyAsync(
            booking.RequestedByUserId.ToString(),
            "booking_approved",
            "تمت الموافقة على طلب الحجز",
            $"وافق المالك على حجزك للعقار {propertyTitle}. يمكنك متابعة تفاصيل الحجز من لوحة التحكم.",
            propertyTitle,
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
            propertyTitle,
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

        if (string.Equals(booking.Status, Completed, StringComparison.OrdinalIgnoreCase))
            throw new BoiootException("لا يمكن إلغاء حجز مكتمل", 400);

        if (string.Equals(booking.Status, Cancelled, StringComparison.OrdinalIgnoreCase))
            return Map(booking, await GetPropertyTitleAsync(booking.PropertyId, ct));

        booking.Status = Cancelled;
        if (!string.Equals(booking.PaymentStatus, Paid, StringComparison.OrdinalIgnoreCase))
            booking.PaymentStatus = NotPaid;
        await _context.SaveChangesAsync(ct);

        return Map(booking, await GetPropertyTitleAsync(booking.PropertyId, ct));
    }

    private async Task EnsureNoApprovedOverlapAsync(Guid propertyId, DateTime start, DateTime end, Guid? excludedBookingId, CancellationToken ct)
    {
        var hasConflict = await HasApprovedOverlapAsync(propertyId, start, end, excludedBookingId, ct);

        if (hasConflict)
            throw new BoiootException("هذه الفترة محجوزة مسبقاً لهذا العقار", 409);
    }

    private async Task<bool> HasApprovedOverlapAsync(Guid propertyId, DateTime start, DateTime end, Guid? excludedBookingId, CancellationToken ct)
    {
        return await _context.Bookings
            .AsNoTracking()
            .AnyAsync(b =>
                b.PropertyId == propertyId &&
                (b.Status == Confirmed ? Approved : b.Status) == Approved &&
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

    private async Task NotifySafelyAsync(string? userIdText, string type, string title, string body, string propertyTitle, Guid bookingId, CancellationToken ct)
    {
        if (!Guid.TryParse(userIdText, out var recipientId)) return;

        try
        {
            var rendered = _notificationTemplates.Render(
                type,
                new Dictionary<string, string?>
                {
                    ["propertyTitle"] = propertyTitle
                });

            await _notificationService.CreateAsync(
                recipientId,
                type,
                rendered?.Title ?? title,
                rendered?.Body ?? body,
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
        GuestCount = booking.GuestCount < 1 ? 1 : booking.GuestCount,
        PricePerNight = booking.PricePerNight,
        TotalAmount = booking.TotalAmount,
        CommissionPercent = booking.CommissionPercent,
        CommissionAmount = booking.CommissionAmount,
        PaymentStatus = booking.PaymentStatus,
        Status = NormalizeStatus(booking.Status),
        CreatedAt = booking.CreatedAt
    };

    private static string NormalizeStatus(string status)
    {
        return string.Equals(status, Confirmed, StringComparison.OrdinalIgnoreCase) ? Approved : status;
    }
}