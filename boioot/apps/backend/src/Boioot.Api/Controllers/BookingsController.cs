using Boioot.Application.Features.Bookings.DTOs;
using Boioot.Application.Features.Bookings.Interfaces;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.AspNetCore.Mvc;
using System.Data;
using System.Data.Common;

namespace Boioot.Api.Controllers;

[Authorize]
[Route("api/bookings")]
public class BookingsController : BaseController
{
    private readonly IBookingService _bookingService;
    private readonly BoiootDbContext _context;
    private readonly IUserNotificationService _notificationService;
    private readonly INotificationTemplateService _notificationTemplates;
    private readonly ILogger<BookingsController> _logger;

    public BookingsController(
        IBookingService bookingService,
        BoiootDbContext context,
        IUserNotificationService notificationService,
        INotificationTemplateService notificationTemplates,
        ILogger<BookingsController> logger)
    {
        _bookingService = bookingService;
        _context = context;
        _notificationService = notificationService;
        _notificationTemplates = notificationTemplates;
        _logger = logger;
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateBookingRequest request, CancellationToken ct)
    {
        await EnsurePaymentStatusColumnAsync(ct);
        var start = DateTime.SpecifyKind(request.StartDate.Date, DateTimeKind.Utc);
        var end = DateTime.SpecifyKind(request.EndDate.Date, DateTimeKind.Utc);
        if (end > start && await HasBlockingOverlapAsync(request.PropertyId, start, end, null, ct))
            return Conflict(new { message = "هذه الفترة محجوزة مسبقاً لهذا العقار" });

        var result = await _bookingService.CreateAsync(GetUserId(), request, ct);
        return StatusCode(201, result);
    }

    [HttpGet("mine")]
    public async Task<IActionResult> Mine(CancellationToken ct)
    {
        await EnsurePaymentStatusColumnAsync(ct);
        var result = await QueryBookingsAsync("""
            SELECT b."Id", b."PropertyId", p."Title" AS "PropertyTitle", b."RequestedByUserId", b."PropertyOwnerUserId",
                   b."StartDate", b."EndDate", b."GuestName", b."Phone", b."Notes",
                   COALESCE(b."PricePerNight", 0) AS "PricePerNight", COALESCE(b."TotalAmount", 0) AS "TotalAmount",
                   COALESCE(b."CommissionPercent", 0) AS "CommissionPercent", COALESCE(b."CommissionAmount", 0) AS "CommissionAmount",
                   COALESCE(b."PaymentStatus", 'NotPaid') AS "PaymentStatus",
                   CASE WHEN b."Status" = 'Confirmed' THEN 'Approved' ELSE b."Status" END AS "Status",
                   b."CreatedAt",
                   COALESCE(b."GuestCount", 1) AS "GuestCount"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId" = p."Id"
            WHERE b."RequestedByUserId" = @userId
            ORDER BY b."CreatedAt" DESC
            """, cmd => AddParameter(cmd, "@userId", GetUserId()), ct);
        return Ok(result);
    }

    [HttpGet("for-my-properties")]
    public async Task<IActionResult> ForMyProperties(CancellationToken ct)
    {
        await EnsurePaymentStatusColumnAsync(ct);
        var userIdText = GetUserId().ToString();
        var result = await QueryBookingsAsync("""
            SELECT b."Id", b."PropertyId", p."Title" AS "PropertyTitle", b."RequestedByUserId", b."PropertyOwnerUserId",
                   b."StartDate", b."EndDate", b."GuestName", b."Phone", b."Notes",
                   COALESCE(b."PricePerNight", 0) AS "PricePerNight", COALESCE(b."TotalAmount", 0) AS "TotalAmount",
                   COALESCE(b."CommissionPercent", 0) AS "CommissionPercent", COALESCE(b."CommissionAmount", 0) AS "CommissionAmount",
                   COALESCE(b."PaymentStatus", 'NotPaid') AS "PaymentStatus",
                   CASE WHEN b."Status" = 'Confirmed' THEN 'Approved' ELSE b."Status" END AS "Status",
                   b."CreatedAt",
                   COALESCE(b."GuestCount", 1) AS "GuestCount"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId" = p."Id"
            WHERE b."PropertyOwnerUserId" = @userIdText OR p."OwnerId" = @userIdText OR p."CreatedByUserId" = @userIdText
            ORDER BY b."CreatedAt" DESC
            """, cmd => AddParameter(cmd, "@userIdText", userIdText), ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken ct)
    {
        return await Approve(id, ct);
    }

    [HttpPost("{id:guid}/approve")]
    public async Task<IActionResult> Approve(Guid id, CancellationToken ct)
    {
        await EnsurePaymentStatusColumnAsync(ct);
        var booking = await GetBookingForOwnerActionAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "طلب الحجز غير موجود" });

        var userIdText = GetUserId().ToString();
        if (!CanManage(booking, userIdText))
            return StatusCode(403, new { message = "غير مصرح لك بإدارة هذا الحجز" });

        if (!string.Equals(booking.Status, "Pending", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "يمكن الموافقة على طلبات الحجز المعلقة فقط" });

        if (await HasBlockingOverlapAsync(booking.PropertyId, booking.StartDate, booking.EndDate, id, ct))
            return Conflict(new { message = "هذه الفترة محجوزة مسبقاً لهذا العقار" });

        await ExecuteAsync("""
            UPDATE "Bookings"
            SET "Status" = 'Approved', "PaymentStatus" = 'ReadyForPayment', "UpdatedAt" = @updatedAt
            WHERE "Id" = @id
            """, cmd =>
        {
            AddParameter(cmd, "@id", id);
            AddParameter(cmd, "@updatedAt", DateTime.UtcNow);
        }, ct);

        await NotifySafelyAsync(booking.RequestedByUserId, "booking_approved", "تمت الموافقة على طلب الحجز", $"وافق المالك على حجزك للعقار {booking.PropertyTitle}. يمكنك متابعة تفاصيل الحجز من لوحة التحكم.", booking.PropertyTitle, id, ct);

        var result = await GetBookingByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/reject")]
    public async Task<IActionResult> Reject(Guid id, CancellationToken ct)
    {
        await EnsurePaymentStatusColumnAsync(ct);
        var booking = await GetBookingForOwnerActionAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "طلب الحجز غير موجود" });

        var userIdText = GetUserId().ToString();
        if (!CanManage(booking, userIdText))
            return StatusCode(403, new { message = "غير مصرح لك بإدارة هذا الحجز" });

        if (!string.Equals(booking.Status, "Pending", StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { message = "يمكن رفض طلبات الحجز المعلقة فقط" });

        await ExecuteAsync("""
            UPDATE "Bookings"
            SET "Status" = 'Rejected', "UpdatedAt" = @updatedAt
            WHERE "Id" = @id
            """, cmd =>
        {
            AddParameter(cmd, "@id", id);
            AddParameter(cmd, "@updatedAt", DateTime.UtcNow);
        }, ct);

        await NotifySafelyAsync(booking.RequestedByUserId, "booking_rejected", "تم رفض طلب الحجز", $"تم رفض طلب حجزك للعقار {booking.PropertyTitle}.", booking.PropertyTitle, id, ct);

        var result = await GetBookingByIdAsync(id, ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/cancel")]
    public async Task<IActionResult> Cancel(Guid id, CancellationToken ct)
    {
        var result = await _bookingService.CancelAsync(GetUserId(), id, ct);
        return Ok(result);
    }

    private async Task EnsurePaymentStatusColumnAsync(CancellationToken ct)
    {
        if (!_context.Database.IsNpgsql()) return;

        await _context.Database.ExecuteSqlRawAsync(
            """ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentStatus" character varying(30) NOT NULL DEFAULT 'NotPaid'""",
            ct);
    }

    private async Task<bool> HasBlockingOverlapAsync(Guid propertyId, DateTime start, DateTime end, Guid? excludedBookingId, CancellationToken ct)
    {
        var count = await ExecuteScalarAsync("""
            SELECT COUNT(1)
            FROM "Bookings"
            WHERE "PropertyId" = @propertyId
              AND CASE WHEN "Status" = 'Confirmed' THEN 'Approved' ELSE "Status" END = 'Approved'
              AND (@excludedBookingId IS NULL OR "Id" <> @excludedBookingId)
              AND @start < "EndDate"
              AND @end > "StartDate"
            """, cmd =>
        {
            AddParameter(cmd, "@propertyId", propertyId);
            AddParameter(cmd, "@excludedBookingId", excludedBookingId.HasValue ? excludedBookingId.Value : DBNull.Value);
            AddParameter(cmd, "@start", start);
            AddParameter(cmd, "@end", end);
        }, ct);

        return Convert.ToInt32(count) > 0;
    }

    private async Task<OwnerBookingRow?> GetBookingForOwnerActionAsync(Guid bookingId, CancellationToken ct)
    {
        var items = await QueryOwnerBookingsAsync("""
            SELECT b."Id", b."PropertyId", b."RequestedByUserId", b."PropertyOwnerUserId", b."StartDate", b."EndDate", b."Status",
                   p."Title" AS "PropertyTitle", p."OwnerId", p."CreatedByUserId"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId" = p."Id"
            WHERE b."Id" = @id
            """, cmd => AddParameter(cmd, "@id", bookingId), ct);

        return items.FirstOrDefault();
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var booking = await GetBookingByIdAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "طلب الحجز غير موجود" });

        var userIdText = GetUserId().ToString();
        var isRenter = booking.RequestedByUserId.ToString().Equals(userIdText, StringComparison.OrdinalIgnoreCase);
        var isOwner = !string.IsNullOrEmpty(booking.PropertyOwnerUserId) &&
                      booking.PropertyOwnerUserId.Equals(userIdText, StringComparison.OrdinalIgnoreCase);

        if (!isRenter && !isOwner)
            return StatusCode(403, new { message = "غير مصرح لك بعرض هذا الحجز" });

        return Ok(booking);
    }

    private async Task<BookingListItem?> GetBookingByIdAsync(Guid bookingId, CancellationToken ct)
    {
        var items = await QueryBookingsAsync("""
            SELECT b."Id", b."PropertyId", p."Title" AS "PropertyTitle", b."RequestedByUserId", b."PropertyOwnerUserId",
                   b."StartDate", b."EndDate", b."GuestName", b."Phone", b."Notes",
                   COALESCE(b."PricePerNight", 0) AS "PricePerNight", COALESCE(b."TotalAmount", 0) AS "TotalAmount",
                   COALESCE(b."CommissionPercent", 0) AS "CommissionPercent", COALESCE(b."CommissionAmount", 0) AS "CommissionAmount",
                   COALESCE(b."PaymentStatus", 'NotPaid') AS "PaymentStatus",
                   CASE WHEN b."Status" = 'Confirmed' THEN 'Approved' ELSE b."Status" END AS "Status",
                   b."CreatedAt",
                   COALESCE(b."GuestCount", 1) AS "GuestCount"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId" = p."Id"
            WHERE b."Id" = @id
            """, cmd => AddParameter(cmd, "@id", bookingId), ct);

        return items.FirstOrDefault();
    }

    private async Task NotifySafelyAsync(Guid userId, string type, string title, string body, string propertyTitle, Guid bookingId, CancellationToken ct)
    {
        try
        {
            var rendered = _notificationTemplates.Render(
                type,
                new Dictionary<string, string?> { ["propertyTitle"] = propertyTitle });

            await _notificationService.CreateAsync(
                userId,
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

    private static bool CanManage(OwnerBookingRow booking, string userIdText)
    {
        return string.Equals(booking.PropertyOwnerUserId, userIdText, StringComparison.OrdinalIgnoreCase)
            || string.Equals(booking.OwnerId, userIdText, StringComparison.OrdinalIgnoreCase)
            || string.Equals(booking.CreatedByUserId, userIdText, StringComparison.OrdinalIgnoreCase);
    }

    private async Task<List<BookingListItem>> QueryBookingsAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        var result = new List<BookingListItem>();
        await using var command = await CreateCommandAsync(sql, bind, ct);
        await using var reader = await command.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            result.Add(new BookingListItem(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.IsDBNull(2) ? null : reader.GetString(2),
                reader.GetGuid(3),
                reader.IsDBNull(4) ? null : reader.GetString(4),
                reader.GetDateTime(5),
                reader.GetDateTime(6),
                reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetString(8),
                reader.IsDBNull(9) ? null : reader.GetString(9),
                reader.GetDecimal(10),
                reader.GetDecimal(11),
                reader.GetDecimal(12),
                reader.GetDecimal(13),
                reader.GetString(14),
                NormalizeBookingStatus(reader.GetString(15)),
                reader.GetDateTime(16),
                reader.IsDBNull(17) ? 1 : reader.GetInt32(17)));
        }

        return result;
    }

    private async Task<List<OwnerBookingRow>> QueryOwnerBookingsAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        var result = new List<OwnerBookingRow>();
        await using var command = await CreateCommandAsync(sql, bind, ct);
        await using var reader = await command.ExecuteReaderAsync(ct);

        while (await reader.ReadAsync(ct))
        {
            result.Add(new OwnerBookingRow(
                reader.GetGuid(0),
                reader.GetGuid(1),
                reader.GetGuid(2),
                reader.IsDBNull(3) ? null : reader.GetString(3),
                reader.GetDateTime(4),
                reader.GetDateTime(5),
                reader.GetString(6),
                reader.GetString(7),
                reader.IsDBNull(8) ? null : reader.GetString(8),
                reader.IsDBNull(9) ? null : reader.GetString(9)));
        }

        return result;
    }

    private async Task<object?> ExecuteScalarAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        await using var command = await CreateCommandAsync(sql, bind, ct);
        return await command.ExecuteScalarAsync(ct);
    }

    private async Task ExecuteAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        await using var command = await CreateCommandAsync(sql, bind, ct);
        await command.ExecuteNonQueryAsync(ct);
    }

    private async Task<DbCommand> CreateCommandAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        var command = connection.CreateCommand();
        command.CommandText = sql;
        bind(command);
        return command;
    }

    private static void AddParameter(DbCommand command, string name, object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }

    private static string NormalizeBookingStatus(string status)
    {
        return string.Equals(status, "Confirmed", StringComparison.OrdinalIgnoreCase) ? "Approved" : status;
    }

    private sealed record BookingListItem(
        Guid Id,
        Guid PropertyId,
        string? PropertyTitle,
        Guid RequestedByUserId,
        string? PropertyOwnerUserId,
        DateTime StartDate,
        DateTime EndDate,
        string GuestName,
        string? Phone,
        string? Notes,
        decimal PricePerNight,
        decimal TotalAmount,
        decimal CommissionPercent,
        decimal CommissionAmount,
        string PaymentStatus,
        string Status,
        DateTime CreatedAt,
        int GuestCount = 1);

    private sealed record OwnerBookingRow(
        Guid Id,
        Guid PropertyId,
        Guid RequestedByUserId,
        string? PropertyOwnerUserId,
        DateTime StartDate,
        DateTime EndDate,
        string Status,
        string PropertyTitle,
        string? OwnerId,
        string? CreatedByUserId);
}