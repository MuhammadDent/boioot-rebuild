using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Properties.Interfaces;
using Boioot.Application.Features.Bookings.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Route("api/properties")]
public class PropertiesController : BaseController
{
    private readonly IPropertyService _propertyService;
    private readonly IBookingService _bookingService;
    private readonly BoiootDbContext _db;
    private readonly ILogger<PropertiesController> _logger;

    public PropertiesController(
        IPropertyService propertyService,
        IBookingService bookingService,
        BoiootDbContext db,
        ILogger<PropertiesController> logger)
    {
        _propertyService = propertyService;
        _bookingService  = bookingService;
        _db              = db;
        _logger          = logger;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] PropertyFilters filters, CancellationToken ct)
    {
        // Short-lived public cache — safe because list is non-personalised (auth is separate)
        Response.Headers.Append("Cache-Control", "public, max-age=30, stale-while-revalidate=60");
        var result = await _propertyService.GetPublicListAsync(filters, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        // Detail page: shorter cache — view counter increments on every hit
        Response.Headers.Append("Cache-Control", "public, max-age=10, stale-while-revalidate=30");
        var result = await _propertyService.GetByIdPublicAsync(id, ct);
        return Ok(result);
    }

    [AllowAnonymous]
    [HttpGet("{id:guid}/availability")]
    public async Task<IActionResult> GetAvailability(
        Guid id,
        [FromQuery] string? startDate,
        [FromQuery] string? endDate,
        CancellationToken ct)
    {
        _logger.LogInformation(
            "[AvailabilityController] Request — propertyId={PropertyId} rawStart={RawStart} rawEnd={RawEnd}",
            id, startDate, endDate);

        // ── Step 1: validate presence ──────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(startDate) || string.IsNullOrWhiteSpace(endDate))
        {
            _logger.LogWarning("[AvailabilityController] Missing date params — propertyId={PropertyId}", id);
            return BadRequest(new { available = false, reason = "تاريخا الوصول والمغادرة مطلوبان" });
        }

        // ── Step 2: parse dates manually to avoid culture/kind binding issues ─
        if (!DateTime.TryParse(startDate, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var parsedStart) ||
            !DateTime.TryParse(endDate, System.Globalization.CultureInfo.InvariantCulture,
                System.Globalization.DateTimeStyles.None, out var parsedEnd))
        {
            _logger.LogWarning(
                "[AvailabilityController] Invalid date format — propertyId={PropertyId} start={Start} end={End}",
                id, startDate, endDate);
            return BadRequest(new { available = false, reason = "صيغة التاريخ غير صالحة" });
        }

        // ── Step 3: normalise to UTC midnight before any comparison ───────────
        var start = DateTime.SpecifyKind(parsedStart.Date, DateTimeKind.Utc);
        var end   = DateTime.SpecifyKind(parsedEnd.Date,   DateTimeKind.Utc);

        _logger.LogInformation(
            "[AvailabilityController] Parsed — start={Start:yyyy-MM-dd}(Kind={SK}) end={End:yyyy-MM-dd}(Kind={EK})",
            start, start.Kind, end, end.Kind);

        // ── Step 4: guard end > start before hitting the service ──────────────
        if (end <= start)
        {
            _logger.LogWarning(
                "[AvailabilityController] REJECT end<=start — propertyId={PropertyId} start={Start:yyyy-MM-dd} end={End:yyyy-MM-dd}",
                id, start, end);
            return BadRequest(new { available = false, reason = "تاريخ المغادرة يجب أن يكون بعد تاريخ الوصول" });
        }

        // ── Step 5: delegate to service (already normalised, UTC-kind datetimes) ─
        try
        {
            var (available, reason) = await _bookingService.IsAvailableAsync(id, start, end, ct);

            _logger.LogInformation(
                "[AvailabilityController] Result — propertyId={PropertyId} available={Available} reason={Reason}",
                id, available, reason);

            return Ok(new { available, reason });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[AvailabilityController] EXCEPTION — propertyId={PropertyId} start={Start:yyyy-MM-dd} end={End:yyyy-MM-dd} msg={Msg}",
                id, start, end, ex.Message);
            return StatusCode(500, new { available = false, reason = "حدث خطأ أثناء التحقق من توفر العقار" });
        }
    }

    // ── Property creation — two routes, same permission intent ──────────────────
    //
    // POST /api/properties          → AdminOrCompanyOwner policy
    //   Used by: Admin, CompanyOwner (company-linked listings)
    //   Frontend routes: dashboard/properties/new with COMPANY_ROLES check
    //
    // POST /api/properties/post     → [Authorize] (any authenticated user)
    //   Used by: Owner, Broker (personal listings)
    //   Also used by: public /post-ad wizard (any platform user)
    //   Frontend routes: dashboard/properties/new with user listing path
    //
    // Canonical permission string (frontend + seeder): "properties.create"
    // Backend enforces via role claim policies, not DB permission claims.

    [Authorize(Policy = "AdminOrCompanyOwner")]
    [HttpPost]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> Create([FromBody] CreatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.CreateAsync(GetUserId(), GetUserRole(), request, ct);
        return StatusCode(201, result);
    }

    [Authorize(Policy = "AdminOrCompanyOwnerOrAgent")]
    [HttpPut("{id:guid}")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.UpdateAsync(GetUserId(), GetUserRole(), id, request, ct);
        return Ok(result);
    }

    [Authorize(Policy = "AdminOrCompanyOwner")]
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _propertyService.DeleteAsync(GetUserId(), GetUserRole(), id, ct);
        return NoContent();
    }

    // ── Personal listing endpoints (any authenticated user) ──────────────────

    [Authorize]
    [HttpPost("post")]
    [RequestSizeLimit(104_857_600)]
    public async Task<IActionResult> PostUserListing(
        [FromBody] CreatePropertyRequest request, CancellationToken ct)
    {
        var result = await _propertyService.CreateUserListingAsync(GetUserId(), GetUserRole(), request, ct);
        return StatusCode(201, result);
    }

    [Authorize]
    [HttpGet("my-listings")]
    public async Task<IActionResult> GetMyListings(
        [FromQuery] int page = 1, [FromQuery] int pageSize = 20, CancellationToken ct = default)
    {
        var result = await _propertyService.GetMyListingsAsync(GetUserId(), page, pageSize, ct);
        return Ok(result);
    }

    [Authorize]
    [HttpDelete("my-listings/{id:guid}")]
    public async Task<IActionResult> DeleteMyListing(Guid id, CancellationToken ct)
    {
        await _propertyService.DeleteMyListingAsync(GetUserId(), id, ct);
        return NoContent();
    }

    [Authorize]
    [HttpGet("my-listings/stats")]
    public async Task<IActionResult> GetMyListingStats(CancellationToken ct)
    {
        var (used, limit, isFreeTrial) = await _propertyService.GetMonthlyListingStatsAsync(GetUserId(), GetUserRole(), ct);
        return Ok(new { used, limit, isFreeTrial });
    }

    // ── GET /api/properties/{id}/images ──────────────────────────────────────

    /// <summary>
    /// Returns all images for a property, ordered by Order ASC.
    /// Public endpoint — no auth required.
    ///
    /// Prefer: GET /api/images/property/{id}
    /// </summary>
    [AllowAnonymous]
    [HttpGet("{id:guid}/images")]
    public async Task<IActionResult> GetImages(Guid id, CancellationToken ct)
    {
        bool exists = await _db.Properties
            .AnyAsync(p => p.Id == id && !p.IsDeleted, ct);

        if (!exists)
            return NotFound(new { error = "العقار غير موجود" });

        var images = await _db.Set<PropertyImage>()
            .Where(i => i.PropertyId == id)
            .OrderBy(i => i.Order)
            .Select(i => new
            {
                i.Id,
                i.ImageUrl,
                i.IsCover,
                i.IsPrimary,
                i.Order,
                i.UserImageId,
            })
            .ToListAsync(ct);

        return Ok(images);
    }

    // ── Admin moderation ──────────────────────────────────────────────────────

    [Authorize(Roles = "Admin")]
    [HttpPatch("admin/{id:guid}/moderation")]
    public async Task<IActionResult> AdminSetModeration(
        Guid id, [FromBody] SetModerationRequest request, CancellationToken ct)
    {
        await _propertyService.AdminSetModerationAsync(id, request.ModerationStatus, ct);
        return NoContent();
    }
}

public record SetModerationRequest(string ModerationStatus);
