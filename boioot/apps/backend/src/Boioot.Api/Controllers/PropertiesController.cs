using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Properties.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/properties")]
public class PropertiesController : BaseController
{
    private readonly IPropertyService _propertyService;

    public PropertiesController(IPropertyService propertyService)
    {
        _propertyService = propertyService;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] PropertyFilters filters, CancellationToken ct)
    {
        var result = await _propertyService.GetPublicListAsync(filters, ct);
        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id, CancellationToken ct)
    {
        var result = await _propertyService.GetByIdPublicAsync(id, ct);
        return Ok(result);
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
