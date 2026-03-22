using Boioot.Domain.Entities;
using Boioot.Infrastructure.Features.Locations;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Route("api/locations")]
public class LocationsController : BaseController
{
    private readonly BoiootDbContext _db;

    public LocationsController(BoiootDbContext db)
    {
        _db = db;
    }

    // ─── Provinces ─────────────────────────────────────────────────────────────

    [HttpGet("provinces")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProvinces(CancellationToken ct = default)
    {
        var provinces = await _db.LocationCities
            .Where(c => !string.IsNullOrEmpty(c.Province))
            .Select(c => c.Province)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(ct);
        return Ok(provinces);
    }

    // ─── Cities ────────────────────────────────────────────────────────────────

    [HttpGet("cities")]
    [AllowAnonymous]
    public async Task<IActionResult> GetCities([FromQuery] string? province, CancellationToken ct = default)
    {
        var query = _db.LocationCities.AsQueryable();
        if (!string.IsNullOrWhiteSpace(province))
            query = query.Where(c => c.Province == province);

        var cities = await query
            .OrderBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Province })
            .ToListAsync(ct);
        return Ok(cities);
    }

    /// <summary>
    /// Add a city with Arabic normalization and smart duplicate / similarity detection.
    ///
    /// Response shape:
    ///   { status: "created"|"exists"|"similar", item: {...}, suggestion?: {...} }
    ///
    /// - "created"  → new city saved; item = the new city
    /// - "exists"   → strict duplicate found; item = the existing city
    /// - "similar"  → soft-normalized match found; item = null; suggestion = the similar city
    /// </summary>
    [HttpPost("cities")]
    [Authorize]
    public async Task<IActionResult> AddCity([FromBody] AddCityRequest req, CancellationToken ct = default)
    {
        var rawName  = req.Name?.Trim();
        var province = req.Province?.Trim() ?? string.Empty;

        if (string.IsNullOrEmpty(rawName))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        var displayName    = rawName;
        var normalizedName = ArabicNormalizer.Normalize(rawName);

        // ── 1. Strict duplicate check ────────────────────────────────────────────
        var strictDup = await _db.LocationCities
            .Where(c => c.Province == province && c.NormalizedName == normalizedName)
            .Select(c => new CityDto(c.Id, c.Name, c.Province))
            .FirstOrDefaultAsync(ct);

        if (strictDup is not null)
            return Ok(new LocationCreateResult("exists", strictDup, null));

        // ── 2. Soft similarity check (skip if user forced create) ────────────────
        if (req.ForceCreate != true)
        {
            var softKey = ArabicNormalizer.SoftNormalize(rawName);

            var siblings = await _db.LocationCities
                .Where(c => c.Province == province)
                .Select(c => new { c.Id, c.Name, c.Province, c.NormalizedName })
                .ToListAsync(ct);

            CityDto? suggestion = null;
            foreach (var sibling in siblings)
            {
                var sibSoft = ArabicNormalizer.SoftNormalize(sibling.NormalizedName);
                if (sibSoft == softKey)
                {
                    suggestion = new CityDto(sibling.Id, sibling.Name, sibling.Province);
                    break;
                }
            }

            if (suggestion is not null)
                return Ok(new LocationCreateResult("similar", null, suggestion));
        }

        // ── 3. Create new city ───────────────────────────────────────────────────
        var city = new LocationCity
        {
            Name           = displayName,
            NormalizedName = normalizedName,
            Province       = province,
        };
        _db.LocationCities.Add(city);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            // Unique index violation — race condition; return the existing one
            var race = await _db.LocationCities
                .Where(c => c.Province == province && c.NormalizedName == normalizedName)
                .Select(c => new CityDto(c.Id, c.Name, c.Province))
                .FirstOrDefaultAsync(ct);
            if (race is not null)
                return Ok(new LocationCreateResult("exists", race, null));
            throw;
        }

        return Ok(new LocationCreateResult("created", new CityDto(city.Id, city.Name, city.Province), null));
    }

    // ─── Neighborhoods ─────────────────────────────────────────────────────────

    [HttpGet("neighborhoods")]
    [AllowAnonymous]
    public async Task<IActionResult> GetNeighborhoods([FromQuery] string? city, CancellationToken ct = default)
    {
        var query = _db.LocationNeighborhoods.AsQueryable();
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(n => n.City == city);

        var neighborhoods = await query
            .OrderBy(n => n.Name)
            .Select(n => new { n.Id, n.Name, n.City })
            .ToListAsync(ct);
        return Ok(neighborhoods);
    }

    /// <summary>
    /// Add a neighborhood with Arabic normalization and smart duplicate / similarity detection.
    ///
    /// Response shape:
    ///   { status: "created"|"exists"|"similar", item: {...}, suggestion?: {...} }
    /// </summary>
    [HttpPost("neighborhoods")]
    [Authorize]
    public async Task<IActionResult> AddNeighborhood([FromBody] AddNeighborhoodRequest req, CancellationToken ct = default)
    {
        var rawName = req.Name?.Trim();
        var city    = req.City?.Trim();

        if (string.IsNullOrEmpty(rawName))
            return BadRequest(new { error = "اسم الحي مطلوب" });
        if (string.IsNullOrEmpty(city))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        var displayName    = rawName;
        var normalizedName = ArabicNormalizer.Normalize(rawName);

        // ── 1. Strict duplicate check ────────────────────────────────────────────
        var strictDup = await _db.LocationNeighborhoods
            .Where(n => n.City == city && n.NormalizedName == normalizedName)
            .Select(n => new NeighborhoodDto(n.Id, n.Name, n.City))
            .FirstOrDefaultAsync(ct);

        if (strictDup is not null)
            return Ok(new LocationCreateResult("exists", strictDup, null));

        // ── 2. Soft similarity check (skip if user forced create) ────────────────
        if (req.ForceCreate != true)
        {
            var softKey = ArabicNormalizer.SoftNormalize(rawName);

            var siblings = await _db.LocationNeighborhoods
                .Where(n => n.City == city)
                .Select(n => new { n.Id, n.Name, n.City, n.NormalizedName })
                .ToListAsync(ct);

            NeighborhoodDto? suggestion = null;
            foreach (var sibling in siblings)
            {
                var sibSoft = ArabicNormalizer.SoftNormalize(sibling.NormalizedName);
                if (sibSoft == softKey)
                {
                    suggestion = new NeighborhoodDto(sibling.Id, sibling.Name, sibling.City);
                    break;
                }
            }

            if (suggestion is not null)
                return Ok(new LocationCreateResult("similar", null, suggestion));
        }

        // ── 3. Create new neighborhood ───────────────────────────────────────────
        var neighborhood = new LocationNeighborhood
        {
            Name           = displayName,
            NormalizedName = normalizedName,
            City           = city,
        };
        _db.LocationNeighborhoods.Add(neighborhood);

        try
        {
            await _db.SaveChangesAsync(ct);
        }
        catch (DbUpdateException)
        {
            var race = await _db.LocationNeighborhoods
                .Where(n => n.City == city && n.NormalizedName == normalizedName)
                .Select(n => new NeighborhoodDto(n.Id, n.Name, n.City))
                .FirstOrDefaultAsync(ct);
            if (race is not null)
                return Ok(new LocationCreateResult("exists", race, null));
            throw;
        }

        return Ok(new LocationCreateResult("created",
            new NeighborhoodDto(neighborhood.Id, neighborhood.Name, neighborhood.City), null));
    }

    // ─── Property Location Options (derived from actual property data) ──────────

    [HttpGet("property-options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPropertyOptions(
        [FromQuery] string? province,
        [FromQuery] string? city,
        CancellationToken ct = default)
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

// ─── DTOs and records ──────────────────────────────────────────────────────────

public record AddCityRequest(string? Name, string? Province, bool? ForceCreate);
public record AddNeighborhoodRequest(string? Name, string? City, bool? ForceCreate);

public record CityDto(Guid Id, string Name, string Province);
public record NeighborhoodDto(Guid Id, string Name, string City);

/// <summary>
/// Structured result returned from POST /cities and POST /neighborhoods.
///
/// status:     "created" | "exists" | "similar"
/// item:       the saved or found location (null when status = "similar")
/// suggestion: a nearby similar entry (only when status = "similar")
/// </summary>
public record LocationCreateResult(string Status, object? Item, object? Suggestion);
