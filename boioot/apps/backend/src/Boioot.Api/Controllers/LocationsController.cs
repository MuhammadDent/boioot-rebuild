using Boioot.Domain.Entities;
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

    [HttpPost("cities")]
    [Authorize]
    public async Task<IActionResult> AddCity([FromBody] AddCityRequest req, CancellationToken ct = default)
    {
        var name = req.Name?.Trim();
        var province = req.Province?.Trim() ?? string.Empty;
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        var exists = await _db.LocationCities.AnyAsync(c => c.Name == name, ct);
        if (exists)
        {
            var existing = await _db.LocationCities
                .Where(c => c.Name == name)
                .Select(c => new { c.Id, c.Name, c.Province })
                .FirstAsync(ct);
            return Ok(existing);
        }

        var city = new LocationCity { Name = name, Province = province };
        _db.LocationCities.Add(city);
        await _db.SaveChangesAsync(ct);

        return Ok(new { city.Id, city.Name, city.Province });
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

    // ─── Property Location Options (derived from actual property data) ──────────

    /// <summary>
    /// Returns distinct province / city / neighborhood values that appear in
    /// the Properties table.  Used to drive the public filter dropdowns so that
    /// only locations with real listings are shown.
    /// Optional query params: province (filters cities & neighborhoods)
    ///                        city     (filters neighborhoods only)
    /// </summary>
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

        // Provinces — distinct non-null values from Properties.Province
        var provinces = await baseQuery
            .Where(p => !string.IsNullOrEmpty(p.Province))
            .Select(p => p.Province!)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(ct);

        // Cities — distinct non-null, optionally filtered by province
        var cityQuery = baseQuery.Where(p => !string.IsNullOrEmpty(p.City));
        if (!string.IsNullOrWhiteSpace(province))
            cityQuery = cityQuery.Where(p => p.Province == province);

        var cities = await cityQuery
            .Select(p => new { p.City, p.Province })
            .Distinct()
            .OrderBy(x => x.City)
            .ToListAsync(ct);

        // Neighborhoods — distinct non-null, optionally filtered by city
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
            cities    = cities.Select(x => new { name = x.City, province = x.Province }),
            neighborhoods = neighborhoods.Select(x => new { name = x.Neighborhood, city = x.City, province = x.Province }),
        });
    }

    [HttpPost("neighborhoods")]
    [Authorize]
    public async Task<IActionResult> AddNeighborhood([FromBody] AddNeighborhoodRequest req, CancellationToken ct = default)
    {
        var name = req.Name?.Trim();
        var city = req.City?.Trim();
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { error = "اسم الحي مطلوب" });
        if (string.IsNullOrEmpty(city))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        var exists = await _db.LocationNeighborhoods.AnyAsync(n => n.Name == name && n.City == city, ct);
        if (exists)
        {
            var existing = await _db.LocationNeighborhoods
                .Where(n => n.Name == name && n.City == city)
                .Select(n => new { n.Id, n.Name, n.City })
                .FirstAsync(ct);
            return Ok(existing);
        }

        var neighborhood = new LocationNeighborhood { Name = name, City = city };
        _db.LocationNeighborhoods.Add(neighborhood);
        await _db.SaveChangesAsync(ct);

        return Ok(new { neighborhood.Id, neighborhood.Name, neighborhood.City });
    }
}

public record AddCityRequest(string? Name, string? Province);
public record AddNeighborhoodRequest(string? Name, string? City);
