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
