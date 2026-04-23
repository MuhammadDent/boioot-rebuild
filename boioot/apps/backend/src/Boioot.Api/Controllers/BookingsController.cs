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
        _logger.LogInformation("[Create] START — userId={UserId} propertyId={PropertyId} startDate={StartDate:yyyy-MM-dd} endDate={EndDate:yyyy-MM-dd} guestName={GuestName} phone={Phone} guestCount={GuestCount}",
            GetUserId(), request?.PropertyId, request?.StartDate, request?.EndDate, request?.GuestName, request?.Phone, request?.GuestCount);

        try { await EnsureBookingSchemaAsync(ct); }
        catch (Exception ex) { _logger.LogWarning(ex, "[Create] EnsureBookingSchema non-critical failure: {Msg}", ex.Message); }

        try
        {
            _logger.LogInformation("[Create] Calling BookingService.CreateAsync…");
            var result = await _bookingService.CreateAsync(GetUserId(), request!, ct);
            _logger.LogInformation("[Create] SUCCESS — bookingId={BookingId} status={Status}", result.Id, result.Status);
            return StatusCode(201, result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            _logger.LogWarning("[Create] BoiootException: {Msg}", ex.Message);
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            _logger.LogError(ex, "[Create] DbUpdateException for property {PropertyId} — inner: {Inner}", request?.PropertyId, ex.InnerException?.Message);
            return StatusCode(500, new
            {
                debugType    = "DbUpdateException",
                message      = ex.Message,
                inner        = ex.InnerException?.Message,
                innerType    = ex.InnerException?.GetType().Name,
                stack        = ex.ToString()
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Create] Unexpected error for property {PropertyId} — {ExType}: {Msg}", request?.PropertyId, ex.GetType().Name, ex.Message);
            return StatusCode(500, new
            {
                debugType    = ex.GetType().FullName,
                message      = ex.Message,
                inner        = ex.InnerException?.Message,
                innerType    = ex.InnerException?.GetType().Name,
                stack        = ex.ToString()
            });
        }
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
                   b."Status",
                   b."CreatedAt",
                   COALESCE(b."GuestCount", 1) AS "GuestCount",
                   b."PaymentProofUrls", b."PaymentProofNote", b."PaymentProofSubmittedAt", b."ApprovedAt", b."ConfirmedAt",
                   b."OwnerNotes", b."RevisionRequestedAt"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId"::text = p."Id"
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
                   b."Status",
                   b."CreatedAt",
                   COALESCE(b."GuestCount", 1) AS "GuestCount",
                   b."PaymentProofUrls", b."PaymentProofNote", b."PaymentProofSubmittedAt", b."ApprovedAt", b."ConfirmedAt",
                   b."OwnerNotes", b."RevisionRequestedAt"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId"::text = p."Id"
            WHERE b."PropertyOwnerUserId" = @userIdText OR p."OwnerId" = @userIdText OR p."CreatedByUserId" = @userIdText
            ORDER BY b."CreatedAt" DESC
            """, cmd => AddParameter(cmd, "@userIdText", userIdText), ct);
        return Ok(result);
    }

    [HttpPost("{id:guid}/confirm")]
    public async Task<IActionResult> Confirm(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _bookingService.OwnerConfirmAsync(GetUserId(), id, ct);
            return Ok(result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
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

        var isPending =
            string.Equals(booking.Status, "PendingApproval", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(booking.Status, "Pending", StringComparison.OrdinalIgnoreCase);
        if (!isPending)
            return BadRequest(new { message = "يمكن الموافقة على طلبات الحجز المعلقة فقط" });

        var now = DateTime.UtcNow;
        await ExecuteAsync("""
            UPDATE "Bookings"
            SET "Status" = 'ApprovedAwaitingPaymentProof', "PaymentStatus" = 'ReadyForPayment', "ApprovedAt" = @approvedAt, "UpdatedAt" = @updatedAt
            WHERE "Id" = @id
            """, cmd =>
        {
            AddParameter(cmd, "@id", id);
            AddParameter(cmd, "@approvedAt", now);
            AddParameter(cmd, "@updatedAt", now);
        }, ct);

        await NotifySafelyAsync(booking.RequestedByUserId, "booking_approved", "تمت الموافقة المبدئية على طلب الحجز", $"وافق المالك مبدئياً على حجزك للعقار {booking.PropertyTitle}. يرجى رفع إثبات التحويل لإكمال الحجز.", booking.PropertyTitle, id, ct);

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

        var canReject =
            string.Equals(booking.Status, "PendingApproval", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(booking.Status, "Pending", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(booking.Status, "ApprovedAwaitingPaymentProof", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(booking.Status, "PaymentProofSubmitted", StringComparison.OrdinalIgnoreCase) ||
            string.Equals(booking.Status, "RevisionRequested", StringComparison.OrdinalIgnoreCase);
        if (!canReject)
            return BadRequest(new { message = "لا يمكن رفض هذا الطلب في حالته الحالية" });

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
        try
        {
            var result = await _bookingService.CancelAsync(GetUserId(), id, ct);
            return Ok(result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/submit-proof")]
    public async Task<IActionResult> SubmitProof(Guid id, [FromBody] Boioot.Application.Features.Bookings.DTOs.SubmitPaymentProofRequest request, CancellationToken ct)
    {
        try
        {
            var result = await _bookingService.SubmitPaymentProofAsync(GetUserId(), id, request, ct);
            return Ok(result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/confirm-payment")]
    public async Task<IActionResult> ConfirmPayment(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _bookingService.OwnerConfirmAsync(GetUserId(), id, ct);
            return Ok(result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/reject-proof")]
    public async Task<IActionResult> RejectProof(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _bookingService.RejectProofAsync(GetUserId(), id, ct);
            return Ok(result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/cancel-owner")]
    public async Task<IActionResult> CancelOwner(Guid id, CancellationToken ct)
    {
        try
        {
            var result = await _bookingService.OwnerCancelAsync(GetUserId(), id, ct);
            return Ok(result);
        }
        catch (Boioot.Application.Exceptions.BoiootException ex)
        {
            return StatusCode(ex.StatusCode, new { message = ex.Message });
        }
    }

    [HttpPost("{id:guid}/request-revision")]
    public async Task<IActionResult> RequestRevision(Guid id, [FromBody] Boioot.Application.Features.Bookings.DTOs.RequestRevisionRequest request, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(request?.Note))
            return BadRequest(new { message = "يرجى كتابة ملاحظة توضح المطلوب من المستأجر" });

        await EnsureBookingSchemaAsync(ct);

        var booking = await GetBookingForOwnerActionAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "طلب الحجز غير موجود" });

        var userIdText = GetUserId().ToString();
        if (!CanManage(booking, userIdText))
            return StatusCode(403, new { message = "غير مصرح لك بإدارة هذا الحجز" });

        var canRevise = string.Equals(booking.Status, "PaymentProofSubmitted", StringComparison.OrdinalIgnoreCase);
        if (!canRevise)
            return BadRequest(new { message = "يمكن طلب التعديل فقط بعد رفع المستأجر لإثبات الدفع" });

        var now = DateTime.UtcNow;
        await ExecuteAsync("""
            UPDATE "Bookings"
            SET "Status" = 'RevisionRequested',
                "OwnerNotes" = @ownerNotes,
                "RevisionRequestedAt" = @revisionRequestedAt,
                "UpdatedAt" = @updatedAt
            WHERE "Id" = @id
            """, cmd =>
        {
            AddParameter(cmd, "@id", id);
            AddParameter(cmd, "@ownerNotes", request.Note.Trim());
            AddParameter(cmd, "@revisionRequestedAt", now);
            AddParameter(cmd, "@updatedAt", now);
        }, ct);

        await NotifySafelyAsync(booking.RequestedByUserId, "revision_requested", "طلب تعديل إثبات الدفع", $"طلب المالك تعديل إثبات الدفع للعقار {booking.PropertyTitle}. يرجى مراجعة الملاحظة وإعادة الرفع.", booking.PropertyTitle, id, ct);

        var result = await GetBookingByIdAsync(id, ct);
        return Ok(result);
    }

    private async Task EnsureBookingSchemaAsync(CancellationToken ct)
    {
        if (!_context.Database.IsNpgsql()) return;
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentStatus" character varying(30) NOT NULL DEFAULT 'NotPaid'""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "GuestCount" integer NOT NULL DEFAULT 1""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PricePerNight" numeric(18,2) NOT NULL DEFAULT 0""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "TotalAmount" numeric(18,2) NOT NULL DEFAULT 0""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "CommissionPercent" numeric(5,2) NOT NULL DEFAULT 0""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "CommissionAmount" numeric(18,2) NOT NULL DEFAULT 0""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentProofUrls" text""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentProofNote" character varying(1000)""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "PaymentProofSubmittedAt" timestamp with time zone""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "ApprovedAt" timestamp with time zone""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "ConfirmedAt" timestamp with time zone""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "OwnerNotes" character varying(2000)""", ct);
        await _context.Database.ExecuteSqlRawAsync("""ALTER TABLE "Bookings" ADD COLUMN IF NOT EXISTS "RevisionRequestedAt" timestamp with time zone""", ct);
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
            INNER JOIN "Properties" p ON b."PropertyId"::text = p."Id"
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
                   b."Status",
                   b."CreatedAt",
                   COALESCE(b."GuestCount", 1) AS "GuestCount",
                   b."PaymentProofUrls", b."PaymentProofNote", b."PaymentProofSubmittedAt", b."ApprovedAt", b."ConfirmedAt",
                   b."OwnerNotes", b."RevisionRequestedAt"
            FROM "Bookings" b
            INNER JOIN "Properties" p ON b."PropertyId"::text = p."Id"
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
                reader.GetString(15),
                reader.GetDateTime(16),
                reader.IsDBNull(17) ? 1 : reader.GetInt32(17),
                reader.IsDBNull(18) ? null : reader.GetString(18),
                reader.IsDBNull(19) ? null : reader.GetString(19),
                reader.IsDBNull(20) ? null : reader.GetDateTime(20),
                reader.IsDBNull(21) ? null : reader.GetDateTime(21),
                reader.IsDBNull(22) ? null : reader.GetDateTime(22),
                reader.IsDBNull(23) ? null : reader.GetString(23),
                reader.IsDBNull(24) ? null : reader.GetDateTime(24)));
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
        int GuestCount = 1,
        string? PaymentProofUrls = null,
        string? PaymentProofNote = null,
        DateTime? PaymentProofSubmittedAt = null,
        DateTime? ApprovedAt = null,
        DateTime? ConfirmedAt = null,
        string? OwnerNotes = null,
        DateTime? RevisionRequestedAt = null);

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