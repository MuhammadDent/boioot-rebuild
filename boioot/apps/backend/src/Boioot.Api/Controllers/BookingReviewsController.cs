using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Data;
using System.Data.Common;

namespace Boioot.Api.Controllers;

// ─────────────────────────────────────────────────────────────────────────────
// Request / Response DTOs (inline — no extra project layer needed for MVP)
// ─────────────────────────────────────────────────────────────────────────────

public sealed record CreateTenantReviewRequest(
    int Cleanliness,
    int Accuracy,
    int Facilities,
    int Communication,
    int ContractCommitment,
    int ValueForMoney,
    string? Comment);

public sealed record CreateOwnerReviewRequest(
    int Communication,
    int ContractCommitment,
    int RespectProperty,
    int Timeliness,
    string? Comment);

public sealed record UpdateReviewSettingsRequest(bool PublicVisibilityEnabled);

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

[Authorize]
[Route("api")]
public class BookingReviewsController : BaseController
{
    private readonly BoiootDbContext _context;
    private readonly ILogger<BookingReviewsController> _logger;

    public BookingReviewsController(
        BoiootDbContext context,
        ILogger<BookingReviewsController> logger)
    {
        _context = context;
        _logger  = logger;
    }

    // ─── POST /api/bookings/{id}/reviews/tenant ───────────────────────────────

    [HttpPost("bookings/{id:guid}/reviews/tenant")]
    public async Task<IActionResult> CreateTenantReview(
        Guid id,
        [FromBody] CreateTenantReviewRequest request,
        CancellationToken ct)
    {

        int[] scores =
        [
            request.Cleanliness, request.Accuracy, request.Facilities,
            request.Communication, request.ContractCommitment, request.ValueForMoney
        ];
        if (scores.Any(s => s < 1 || s > 5))
            return BadRequest(new { message = "جميع المحاور يجب أن تكون بين 1 و 5" });

        var userId    = GetUserId();
        var userIdStr = userId.ToString("D");

        var booking = await GetBookingInfoAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "الحجز غير موجود" });

        if (!string.Equals(booking.RequestedByUserIdText, userIdStr, StringComparison.OrdinalIgnoreCase))
            return StatusCode(403, new { message = "غير مصرح بهذا الإجراء" });

        var tenantIneligibility = GetIneligibilityReason(booking);
        if (tenantIneligibility is not null)
            return BadRequest(new { message = tenantIneligibility });

        if (await ReviewExistsAsync(id, "TenantToProperty", ct))
            return Conflict(new { message = "لقد قدّمت تقييمك لهذا الحجز مسبقاً" });

        var overall = Math.Round((decimal)scores.Average(), 2);

        Guid? ownerGuid = Guid.TryParse(booking.PropertyOwnerUserIdText, out var og) ? og : null;

        await ExecuteAsync("""
            INSERT INTO "BookingReviews"
                ("Id","BookingId","PropertyId","ReviewType","ReviewerUserId","ReviewedUserId",
                 "Comment","Cleanliness","Accuracy","Facilities","Communication",
                 "ContractCommitment","ValueForMoney","OverallRating","CreatedAt")
            VALUES
                (gen_random_uuid(),@BookingId,@PropertyId,'TenantToProperty',@Reviewer,@Reviewed,
                 @Comment,@Cleanliness,@Accuracy,@Facilities,@Communication,
                 @ContractCommitment,@ValueForMoney,@Overall,NOW())
            """, cmd =>
        {
            AddParameter(cmd, "BookingId",          id);
            AddParameter(cmd, "PropertyId",         booking.PropertyId);
            AddParameter(cmd, "Reviewer",           userId);
            AddParameter(cmd, "Reviewed",           (object?)ownerGuid ?? DBNull.Value);
            AddParameter(cmd, "Comment",            (object?)request.Comment?.Trim() ?? DBNull.Value);
            AddParameter(cmd, "Cleanliness",        request.Cleanliness);
            AddParameter(cmd, "Accuracy",           request.Accuracy);
            AddParameter(cmd, "Facilities",         request.Facilities);
            AddParameter(cmd, "Communication",      request.Communication);
            AddParameter(cmd, "ContractCommitment", request.ContractCommitment);
            AddParameter(cmd, "ValueForMoney",      request.ValueForMoney);
            AddParameter(cmd, "Overall",            overall);
        }, ct);

        _logger.LogInformation(
            "[Reviews] Tenant {UserId} reviewed booking {BookingId} overall={Overall:F2}",
            userId, id, overall);

        return StatusCode(201, new { message = "تم حفظ تقييمك بنجاح", overallRating = overall });
    }

    // ─── POST /api/bookings/{id}/reviews/owner ────────────────────────────────

    [HttpPost("bookings/{id:guid}/reviews/owner")]
    public async Task<IActionResult> CreateOwnerReview(
        Guid id,
        [FromBody] CreateOwnerReviewRequest request,
        CancellationToken ct)
    {

        int[] scores =
        [
            request.Communication, request.ContractCommitment,
            request.RespectProperty, request.Timeliness
        ];
        if (scores.Any(s => s < 1 || s > 5))
            return BadRequest(new { message = "جميع المحاور يجب أن تكون بين 1 و 5" });

        var userId    = GetUserId();
        var userIdStr = userId.ToString("D");

        var booking = await GetBookingInfoAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "الحجز غير موجود" });

        if (!string.Equals(booking.PropertyOwnerUserIdText, userIdStr, StringComparison.OrdinalIgnoreCase))
            return StatusCode(403, new { message = "غير مصرح بهذا الإجراء" });

        var ownerIneligibility = GetIneligibilityReason(booking);
        if (ownerIneligibility is not null)
            return BadRequest(new { message = ownerIneligibility });

        if (await ReviewExistsAsync(id, "OwnerToTenant", ct))
            return Conflict(new { message = "لقد قدّمت تقييمك للمستأجر مسبقاً" });

        var overall = Math.Round((decimal)scores.Average(), 2);

        Guid? tenantGuid = Guid.TryParse(booking.RequestedByUserIdText, out var tg) ? tg : null;

        await ExecuteAsync("""
            INSERT INTO "BookingReviews"
                ("Id","BookingId","PropertyId","ReviewType","ReviewerUserId","ReviewedUserId",
                 "Comment","Communication","ContractCommitment","RespectProperty","Timeliness",
                 "OverallRating","CreatedAt")
            VALUES
                (gen_random_uuid(),@BookingId,@PropertyId,'OwnerToTenant',@Reviewer,@Reviewed,
                 @Comment,@Communication,@ContractCommitment,@RespectProperty,@Timeliness,
                 @Overall,NOW())
            """, cmd =>
        {
            AddParameter(cmd, "BookingId",          id);
            AddParameter(cmd, "PropertyId",         booking.PropertyId);
            AddParameter(cmd, "Reviewer",           userId);
            AddParameter(cmd, "Reviewed",           (object?)tenantGuid ?? DBNull.Value);
            AddParameter(cmd, "Comment",            (object?)request.Comment?.Trim() ?? DBNull.Value);
            AddParameter(cmd, "Communication",      request.Communication);
            AddParameter(cmd, "ContractCommitment", request.ContractCommitment);
            AddParameter(cmd, "RespectProperty",    request.RespectProperty);
            AddParameter(cmd, "Timeliness",         request.Timeliness);
            AddParameter(cmd, "Overall",            overall);
        }, ct);

        _logger.LogInformation(
            "[Reviews] Owner {UserId} reviewed tenant for booking {BookingId} overall={Overall:F2}",
            userId, id, overall);

        return StatusCode(201, new { message = "تم حفظ تقييمك للمستأجر بنجاح", overallRating = overall });
    }

    // ─── GET /api/bookings/{id}/reviews ──────────────────────────────────────

    [HttpGet("bookings/{id:guid}/reviews")]
    public async Task<IActionResult> GetBookingReviews(Guid id, CancellationToken ct)
    {

        var userId    = GetUserId();
        var userIdStr = userId.ToString("D");

        var booking = await GetBookingInfoAsync(id, ct);
        if (booking is null)
            return NotFound(new { message = "الحجز غير موجود" });

        var isTenant = string.Equals(booking.RequestedByUserIdText, userIdStr, StringComparison.OrdinalIgnoreCase);
        var isOwner  = string.Equals(booking.PropertyOwnerUserIdText, userIdStr, StringComparison.OrdinalIgnoreCase);
        if (!isTenant && !isOwner)
            return StatusCode(403, new { message = "غير مصرح بهذا الإجراء" });

        var reviews = await QueryReviewsAsync(
            """
            SELECT "Id","BookingId","PropertyId","ReviewType","ReviewerUserId","ReviewedUserId",
                   "Comment","Cleanliness","Accuracy","Facilities","Communication",
                   "ContractCommitment","ValueForMoney","RespectProperty","Timeliness",
                   "OverallRating","CreatedAt"
            FROM "BookingReviews"
            WHERE "BookingId" = @BookingId
            """,
            cmd => AddParameter(cmd, "BookingId", id), ct);

        var tenant = reviews.FirstOrDefault(r => r.ReviewType == "TenantToProperty");
        var owner  = reviews.FirstOrDefault(r => r.ReviewType == "OwnerToTenant");

        return Ok(new
        {
            hasTenantReview = tenant is not null,
            hasOwnerReview  = owner  is not null,
            tenantReview    = tenant,
            ownerReview     = owner,
        });
    }

    // ─── GET /api/properties/{id}/reviews ────────────────────────────────────

    [AllowAnonymous]
    [HttpGet("properties/{id:guid}/reviews")]
    public async Task<IActionResult> GetPropertyReviews(Guid id, CancellationToken ct)
    {

        var visible = await IsPublicVisibilityEnabledAsync(ct);
        if (!visible)
            return Ok(new
            {
                publicVisibilityEnabled = false,
                averageRating           = (decimal?)null,
                count                   = 0,
                reviews                 = Array.Empty<object>(),
            });

        var reviews = await QueryReviewsAsync(
            """
            SELECT "Id","BookingId","PropertyId","ReviewType","ReviewerUserId","ReviewedUserId",
                   "Comment","Cleanliness","Accuracy","Facilities","Communication",
                   "ContractCommitment","ValueForMoney","RespectProperty","Timeliness",
                   "OverallRating","CreatedAt"
            FROM "BookingReviews"
            WHERE "PropertyId" = @PropertyId AND "ReviewType" = 'TenantToProperty'
            ORDER BY "CreatedAt" DESC
            LIMIT 20
            """,
            cmd => AddParameter(cmd, "PropertyId", id), ct);

        var avg = reviews.Count > 0
            ? Math.Round(reviews.Average(r => r.OverallRating), 2)
            : (decimal?)null;

        return Ok(new
        {
            publicVisibilityEnabled = true,
            averageRating           = avg,
            count                   = reviews.Count,
            reviews,
        });
    }

    // ─── GET /api/admin/settings/reviews ─────────────────────────────────────

    [HttpGet("admin/settings/reviews")]
    public async Task<IActionResult> GetAdminReviewSettings(CancellationToken ct)
    {
        if (GetUserRole() != "Admin")
            return StatusCode(403, new { message = "غير مصرح" });

        var visible = await IsPublicVisibilityEnabledAsync(ct);
        return Ok(new { publicVisibilityEnabled = visible });
    }

    // ─── PUT /api/admin/settings/reviews ─────────────────────────────────────

    [HttpPut("admin/settings/reviews")]
    public async Task<IActionResult> UpdateAdminReviewSettings(
        [FromBody] UpdateReviewSettingsRequest request,
        CancellationToken ct)
    {
        if (GetUserRole() != "Admin")
            return StatusCode(403, new { message = "غير مصرح" });


        await ExecuteAsync("""
            INSERT INTO "AppSettings"("Key","Value","UpdatedAt")
            VALUES ('reviews.publicVisibilityEnabled',@Value,NOW())
            ON CONFLICT("Key") DO UPDATE SET "Value" = EXCLUDED."Value", "UpdatedAt" = NOW()
            """,
            cmd => AddParameter(cmd, "Value", request.PublicVisibilityEnabled ? "true" : "false"), ct);

        return Ok(new { publicVisibilityEnabled = request.PublicVisibilityEnabled });
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    /// <summary>
    /// Returns null when eligible, or an Arabic error message explaining why not.
    /// Eligibility requires:
    ///   1. Booking status is Confirmed or Completed.
    ///   2. The checkout date (EndDate) has already passed (UTC).
    /// </summary>
    private static string? GetIneligibilityReason(BookingInfo booking)
    {
        if (booking.Status is not ("Confirmed" or "Completed"))
            return "لا يمكن تقييم هذا الحجز إلا بعد تأكيده";

        // Ensure end-date comparison is done in UTC to avoid timezone issues.
        if (booking.EndDate.ToUniversalTime() >= DateTime.UtcNow)
            return "يمكنك تقييم العقار بعد انتهاء مدة الإقامة";

        return null; // eligible
    }

    private async Task<bool> ReviewExistsAsync(Guid bookingId, string reviewType, CancellationToken ct)
    {
        var result = await ExecuteScalarAsync(
            """
            SELECT COUNT(1) FROM "BookingReviews"
            WHERE "BookingId" = @B AND "ReviewType" = @T
            """,
            cmd =>
            {
                AddParameter(cmd, "B", bookingId);
                AddParameter(cmd, "T", reviewType);
            }, ct);
        return Convert.ToInt64(result ?? 0L) > 0;
    }

    private async Task<bool> IsPublicVisibilityEnabledAsync(CancellationToken ct)
    {
        var result = await ExecuteScalarAsync(
            """SELECT "Value" FROM "AppSettings" WHERE "Key" = 'reviews.publicVisibilityEnabled'""",
            _ => { }, ct);
        return result is string s && s == "true";
    }

    private sealed record BookingInfo(
        Guid     Id,
        Guid     PropertyId,
        string   RequestedByUserIdText,
        string?  PropertyOwnerUserIdText,
        string   Status,
        DateTime EndDate);   // checkout date — used for post-stay review eligibility

    private async Task<BookingInfo?> GetBookingInfoAsync(Guid bookingId, CancellationToken ct)
    {
        const string sql = """
            SELECT "Id", "PropertyId", "RequestedByUserId"::text, "PropertyOwnerUserId", "Status", "EndDate"
            FROM "Bookings"
            WHERE "Id" = @BookingId
            LIMIT 1
            """;

        await using var cmd = await CreateCommandAsync(sql, c => AddParameter(c, "BookingId", bookingId), ct);
        await using var rdr = await cmd.ExecuteReaderAsync(ct);

        if (!await rdr.ReadAsync(ct)) return null;

        return new BookingInfo(
            rdr.GetGuid(0),
            rdr.GetGuid(1),
            rdr.GetString(2),
            rdr.IsDBNull(3) ? null : rdr.GetString(3),
            rdr.GetString(4),
            rdr.GetDateTime(5));
    }

    private sealed record ReviewRow(
        Guid     Id,
        Guid     BookingId,
        Guid     PropertyId,
        string   ReviewType,
        Guid     ReviewerUserId,
        Guid?    ReviewedUserId,
        string?  Comment,
        int?     Cleanliness,
        int?     Accuracy,
        int?     Facilities,
        int?     Communication,
        int?     ContractCommitment,
        int?     ValueForMoney,
        int?     RespectProperty,
        int?     Timeliness,
        decimal  OverallRating,
        DateTime CreatedAt);

    private async Task<List<ReviewRow>> QueryReviewsAsync(
        string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        var result = new List<ReviewRow>();
        await using var cmd = await CreateCommandAsync(sql, bind, ct);
        await using var rdr = await cmd.ExecuteReaderAsync(ct);

        while (await rdr.ReadAsync(ct))
        {
            result.Add(new ReviewRow(
                rdr.GetGuid(0),
                rdr.GetGuid(1),
                rdr.GetGuid(2),
                rdr.GetString(3),
                rdr.GetGuid(4),
                rdr.IsDBNull(5) ? null : rdr.GetGuid(5),
                rdr.IsDBNull(6) ? null : rdr.GetString(6),
                rdr.IsDBNull(7)  ? null : rdr.GetInt32(7),
                rdr.IsDBNull(8)  ? null : rdr.GetInt32(8),
                rdr.IsDBNull(9)  ? null : rdr.GetInt32(9),
                rdr.IsDBNull(10) ? null : rdr.GetInt32(10),
                rdr.IsDBNull(11) ? null : rdr.GetInt32(11),
                rdr.IsDBNull(12) ? null : rdr.GetInt32(12),
                rdr.IsDBNull(13) ? null : rdr.GetInt32(13),
                rdr.IsDBNull(14) ? null : rdr.GetInt32(14),
                rdr.GetDecimal(15),
                rdr.GetDateTime(16)));
        }

        return result;
    }

    // ─── Raw SQL helpers (same pattern as BookingsController) ─────────────────

    private async Task ExecuteAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        await using var cmd = await CreateCommandAsync(sql, bind, ct);
        await cmd.ExecuteNonQueryAsync(ct);
    }

    private async Task<object?> ExecuteScalarAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        await using var cmd = await CreateCommandAsync(sql, bind, ct);
        return await cmd.ExecuteScalarAsync(ct);
    }

    private async Task<DbCommand> CreateCommandAsync(string sql, Action<DbCommand> bind, CancellationToken ct)
    {
        var connection = _context.Database.GetDbConnection();
        if (connection.State != ConnectionState.Open)
            await connection.OpenAsync(ct);

        var cmd = connection.CreateCommand();
        cmd.CommandText = sql;
        bind(cmd);
        return cmd;
    }

    private static void AddParameter(DbCommand cmd, string name, object? value)
    {
        var p = cmd.CreateParameter();
        p.ParameterName = name;
        p.Value = value ?? DBNull.Value;
        cmd.Parameters.Add(p);
    }
}
