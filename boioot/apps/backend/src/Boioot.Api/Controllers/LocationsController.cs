using Boioot.Application.Features.Locations.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Route("api/locations")]
public class LocationsController : BaseController
{
    private readonly BoiootDbContext          _db;
    private readonly ILocationMasterService   _locationService;

    public LocationsController(BoiootDbContext db, ILocationMasterService locationService)
    {
        _db              = db;
        _locationService = locationService;
    }

    // ─── Provinces ─────────────────────────────────────────────────────────────

    [HttpGet("provinces")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProvinces(CancellationToken ct = default)
    {
        var provinces = await _db.LocationCities
            .Where(c => c.IsActive && !string.IsNullOrEmpty(c.Province))
            .Select(c => c.Province)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(ct);

        return Ok(provinces);
    }

    // ─── Cities ────────────────────────────────────────────────────────────────

    [HttpGet("cities")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCities(
        [FromQuery] string? province,
        [FromQuery] bool    includeInactive = false,
        CancellationToken   ct = default)
    {
        var query = _db.LocationCities.AsQueryable();

        if (!includeInactive)
            query = query.Where(c => c.IsActive);

        if (!string.IsNullOrWhiteSpace(province))
            query = query.Where(c => c.Province == province);

        var cities = await query
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Province })
            .ToListAsync(ct);

        return Ok(cities);
    }

    /// <summary>
    /// POST /api/locations/cities
    ///
    /// Delegates all creation logic to <see cref="ILocationMasterService"/>.
    /// Response shape:
    ///   { status: "created"|"exists"|"similar",
    ///     item: {...} | null,
    ///     suggestions: [...] }          ← always an array (empty unless status="similar")
    /// </summary>
    [HttpPost("cities")]
    [Authorize]
    public async Task<IActionResult> AddCity(
        [FromBody] AddCityRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        try
        {
            var result = await _locationService.AddCityAsync(
                req.Name,
                req.Province ?? string.Empty,
                req.ForceCreate ?? false,
                ct);

            return Ok(new LocationApiResult(result.Status, result.Item, result.Suggestions));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ─── Neighborhoods ─────────────────────────────────────────────────────────

    [HttpGet("neighborhoods")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNeighborhoods(
        [FromQuery] string? city,
        [FromQuery] bool    includeInactive = false,
        CancellationToken   ct = default)
    {
        var query = _db.LocationNeighborhoods.AsQueryable();

        if (!includeInactive)
            query = query.Where(n => n.IsActive);

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(n => n.City == city);

        var neighborhoods = await query
            .OrderBy(n => n.Name)
            .Select(n => new { n.Id, n.Name, n.City })
            .ToListAsync(ct);

        return Ok(neighborhoods);
    }

    /// <summary>
    /// POST /api/locations/neighborhoods
    ///
    /// Response shape identical to POST /cities.
    /// </summary>
    [HttpPost("neighborhoods")]
    [Authorize]
    public async Task<IActionResult> AddNeighborhood(
        [FromBody] AddNeighborhoodRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "اسم الحي مطلوب" });
        if (string.IsNullOrWhiteSpace(req.City))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        try
        {
            var result = await _locationService.AddNeighborhoodAsync(
                req.Name,
                req.City,
                req.ForceCreate ?? false,
                ct);

            return Ok(new LocationApiResult(result.Status, result.Item, result.Suggestions));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ─── Duplicate report (admin-only) ─────────────────────────────────────────

    [HttpGet("duplicates/cities")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> GetDuplicateCities(CancellationToken ct = default)
    {
        var groups = await _locationService.DetectDuplicateCitiesAsync(ct);
        return Ok(groups);
    }

    [HttpGet("duplicates/neighborhoods")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> GetDuplicateNeighborhoods(CancellationToken ct = default)
    {
        var groups = await _locationService.DetectDuplicateNeighborhoodsAsync(ct);
        return Ok(groups);
    }

    // ─── Property Location Options (derived from actual property data) ──────────

    [HttpGet("property-options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPropertyOptions(
        [FromQuery] string? province,
        [FromQuery] string? city,
        CancellationToken   ct = default)
    {
        var baseQuery = _db.Properties
            .IgnoreQueryFilters()
            .Where(p => !p.IsDeleted);

        var provinces = await baseQuery
            .Where(p => !string.IsNullOrEmpty(p.Province))
            .Select(p => p.Province!)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(ct);

        var cityQuery = baseQuery.Where(p => !string.IsNullOrEmpty(p.City));
        if (!string.IsNullOrWhiteSpace(province))
            cityQuery = cityQuery.Where(p => p.Province == province);

        var cities = await cityQuery
            .Select(p => new { p.City, p.Province })
            .Distinct()
            .OrderBy(x => x.City)
            .ToListAsync(ct);

        var nbrQuery = baseQuery.Where(p => !string.IsNullOrEmpty(p.Neighborhood));
        if (!string.IsNullOrWhiteSpace(city))
            nbrQuery = nbrQuery.Where(p => p.City == city);
        else if (!string.IsNullOrWhiteSpace(province))
            nbrQuery = nbrQuery.Where(p => p.Province == province);

        var neighborhoods = await nbrQuery
            .Select(p => new { p.Neighborhood, p.City, p.Province })
            .Distinct()
            .OrderBy(x => x.Neighborhood)
            .ToListAsync(ct);

        return Ok(new
        {
            provinces,
            cities        = cities.Select(x => new { name = x.City, province = x.Province }),
            neighborhoods = neighborhoods.Select(x => new { name = x.Neighborhood, city = x.City, province = x.Province }),
        });
    }
}

// ─── Request / Response DTOs ───────────────────────────────────────────────────

public record AddCityRequest(string? Name, string? Province, bool? ForceCreate);
public record AddNeighborhoodRequest(string? Name, string? City, bool? ForceCreate);

/// <summary>
/// Unified response for POST /cities and POST /neighborhoods.
///
/// status:      "created" | "exists" | "similar"
/// item:        the saved or found location (null only when status = "similar")
/// suggestions: similar candidates — empty list unless status = "similar"
/// </summary>
public record LocationApiResult(
    string                          Status,
    LocationItemDto?                Item,
    IReadOnlyList<LocationItemDto>  Suggestions);
