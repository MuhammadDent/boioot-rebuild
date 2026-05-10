using Boioot.Application.Features.Locations.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;

namespace Boioot.Api.Controllers;

[Route("api/locations")]
public class LocationsController : BaseController
{
    private readonly BoiootDbContext          _db;
    private readonly ILocationMasterService   _locationService;
    private readonly IMemoryCache             _cache;

    private static readonly TimeSpan CitiesTtl        = TimeSpan.FromHours(6);
    private static readonly TimeSpan NeighborhoodsTtl = TimeSpan.FromHours(2);
    private static readonly TimeSpan PropOptionsTtl   = TimeSpan.FromMinutes(5);

    // ── Idempotent schema bootstrap ────────────────────────────────────────────
    // Adds IsVerified + UsageCount columns if they don't exist yet.
    // DEFAULT TRUE on IsVerified so all pre-existing rows (admin-seeded) become verified.
    // DEFAULT 0 on UsageCount for all existing rows.

    private static volatile bool _columnsEnsured;
    private static readonly SemaphoreSlim _columnLock = new(1, 1);

    private async Task EnsureLocationColumnsAsync(CancellationToken ct = default)
    {
        if (_columnsEnsured) return;

        await _columnLock.WaitAsync(ct);
        try
        {
            if (_columnsEnsured) return;

            await _db.Database.ExecuteSqlRawAsync("""
                ALTER TABLE "LocationCities"
                    ADD COLUMN IF NOT EXISTS "IsVerified"  BOOLEAN NOT NULL DEFAULT TRUE,
                    ADD COLUMN IF NOT EXISTS "UsageCount"  INTEGER NOT NULL DEFAULT 0;

                ALTER TABLE "LocationNeighborhoods"
                    ADD COLUMN IF NOT EXISTS "IsVerified"  BOOLEAN NOT NULL DEFAULT TRUE,
                    ADD COLUMN IF NOT EXISTS "UsageCount"  INTEGER NOT NULL DEFAULT 0;

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_LocationCities_Province_NormalizedName"
                    ON "LocationCities" ("Province", "NormalizedName") WHERE "IsActive" = TRUE;

                CREATE UNIQUE INDEX IF NOT EXISTS "IX_LocationNeighborhoods_City_NormalizedName"
                    ON "LocationNeighborhoods" ("City", "NormalizedName") WHERE "IsActive" = TRUE;
                """, ct);

            _columnsEnsured = true;
        }
        finally
        {
            _columnLock.Release();
        }
    }

    public LocationsController(
        BoiootDbContext        db,
        ILocationMasterService locationService,
        IMemoryCache           cache)
    {
        _db              = db;
        _locationService = locationService;
        _cache           = cache;
    }

    // ─── Provinces ─────────────────────────────────────────────────────────────

    [HttpGet("provinces")]
    [AllowAnonymous]
    public async Task<IActionResult> GetProvinces(CancellationToken ct = default)
    {
        await EnsureLocationColumnsAsync(ct);

        Response.Headers.Append("Cache-Control", "public, max-age=300, stale-while-revalidate=60");

        const string key = "loc:provinces";
        if (_cache.TryGetValue(key, out List<string>? cached) && cached is not null)
            return Ok(cached);

        var provinces = await _db.LocationCities
            .AsNoTracking()
            .Where(c => c.IsActive && !string.IsNullOrEmpty(c.Province))
            .Select(c => c.Province)
            .Distinct()
            .OrderBy(p => p)
            .ToListAsync(ct);

        _cache.Set(key, provinces, CitiesTtl);
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
        await EnsureLocationColumnsAsync(ct);

        Response.Headers.Append("Cache-Control", "public, max-age=300, stale-while-revalidate=60");

        // Only cache the standard active-cities query (no inactive)
        if (!includeInactive)
        {
            var cacheKey = string.IsNullOrWhiteSpace(province)
                ? "loc:cities:v2"
                : $"loc:cities:v2:{province}";

            if (_cache.TryGetValue(cacheKey, out object? hit))
                return Ok(hit);

            var query = _db.LocationCities.AsNoTracking().Where(c => c.IsActive);
            if (!string.IsNullOrWhiteSpace(province))
                query = query.Where(c => c.Province == province);

            // Sort: verified first → then by usage (popular) → then alphabetically
            var cities = await query
                .OrderByDescending(c => c.IsVerified)
                .ThenByDescending(c => c.UsageCount)
                .ThenBy(c => c.Name)
                .Select(c => new { c.Id, c.Name, c.Province, c.IsVerified })
                .ToListAsync(ct);

            _cache.Set(cacheKey, cities, CitiesTtl);
            return Ok(cities);
        }

        // includeInactive=true — admin-only path, skip cache
        var rawQuery = _db.LocationCities.AsNoTracking();
        if (!string.IsNullOrWhiteSpace(province))
            rawQuery = rawQuery.Where(c => c.Province == province);

        var allCities = await rawQuery
            .OrderByDescending(c => c.IsVerified)
            .ThenByDescending(c => c.UsageCount)
            .ThenBy(c => c.Name)
            .Select(c => new { c.Id, c.Name, c.Province, c.IsVerified, c.IsActive })
            .ToListAsync(ct);

        return Ok(allCities);
    }

    [HttpPost("cities")]
    [Authorize]
    public async Task<IActionResult> AddCity(
        [FromBody] AddCityRequest req,
        CancellationToken ct = default)
    {
        await EnsureLocationColumnsAsync(ct);

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "اسم المدينة مطلوب" });

        try
        {
            var result = await _locationService.AddCityAsync(
                req.Name,
                req.Province ?? string.Empty,
                req.ForceCreate ?? false,
                ct);

            // Invalidate city/province caches on successful creation
            if (result.Status == "created")
            {
                InvalidateCityCaches(req.Province);
            }

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
        await EnsureLocationColumnsAsync(ct);

        Response.Headers.Append("Cache-Control", "public, max-age=300, stale-while-revalidate=60");

        if (!includeInactive && !string.IsNullOrWhiteSpace(city))
        {
            var cacheKey = $"loc:nbrs:v2:{city}";
            if (_cache.TryGetValue(cacheKey, out object? hit))
                return Ok(hit);

            var nbrs = await _db.LocationNeighborhoods
                .AsNoTracking()
                .Where(n => n.IsActive && n.City == city)
                .OrderByDescending(n => n.IsVerified)
                .ThenByDescending(n => n.UsageCount)
                .ThenBy(n => n.Name)
                .Select(n => new { n.Id, n.Name, n.City, n.IsVerified })
                .ToListAsync(ct);

            _cache.Set(cacheKey, nbrs, NeighborhoodsTtl);
            return Ok(nbrs);
        }

        // Uncached path: no city filter or includeInactive=true
        var query = _db.LocationNeighborhoods.AsNoTracking();
        if (!includeInactive)
            query = query.Where(n => n.IsActive);
        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(n => n.City == city);

        var neighborhoods = await query
            .OrderByDescending(n => n.IsVerified)
            .ThenByDescending(n => n.UsageCount)
            .ThenBy(n => n.Name)
            .Select(n => new { n.Id, n.Name, n.City, n.IsVerified })
            .ToListAsync(ct);

        return Ok(neighborhoods);
    }

    [HttpPost("neighborhoods")]
    [Authorize]
    public async Task<IActionResult> AddNeighborhood(
        [FromBody] AddNeighborhoodRequest req,
        CancellationToken ct = default)
    {
        await EnsureLocationColumnsAsync(ct);

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

            if (result.Status == "created" && !string.IsNullOrWhiteSpace(req.City))
            {
                _cache.Remove($"loc:nbrs:v2:{req.City}");
                _cache.Remove($"loc:nbrs:{req.City}");  // invalidate old key too
            }

            return Ok(new LocationApiResult(result.Status, result.Item, result.Suggestions));
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ─── Search (typeahead) ────────────────────────────────────────────────────

    [HttpGet("search")]
    [AllowAnonymous]
    public async Task<IActionResult> Search(
        [FromQuery] string  q,
        [FromQuery] string  type     = "city",
        [FromQuery] string? province = null,
        [FromQuery] string? city     = null,
        [FromQuery] int     limit    = 10,
        CancellationToken   ct = default)
    {
        q = (q ?? "").Trim();
        if (q.Length < 1)
            return Ok(Array.Empty<object>());

        limit = Math.Clamp(limit, 1, 20);
        var norm = Boioot.Infrastructure.Features.Locations.ArabicNormalizer.Normalize(q);

        if (type == "neighborhood")
        {
            var nbrs = _db.LocationNeighborhoods
                .AsNoTracking()
                .Where(n => n.IsActive);

            if (!string.IsNullOrWhiteSpace(city))
                nbrs = nbrs.Where(n => n.City == city);

            var hits = await nbrs
                .Where(n => n.NormalizedName.Contains(norm) || n.Name.Contains(q))
                .OrderByDescending(n => n.IsVerified)
                .ThenByDescending(n => n.UsageCount)
                .ThenBy(n => n.NormalizedName)
                .Take(limit)
                .Select(n => new { n.Id, n.Name, parent = n.City, n.IsVerified })
                .ToListAsync(ct);

            return Ok(hits);
        }
        else // city
        {
            var cities = _db.LocationCities
                .AsNoTracking()
                .Where(c => c.IsActive);

            if (!string.IsNullOrWhiteSpace(province))
                cities = cities.Where(c => c.Province == province);

            var hits = await cities
                .Where(c => c.NormalizedName.Contains(norm) || c.Name.Contains(q))
                .OrderByDescending(c => c.IsVerified)
                .ThenByDescending(c => c.UsageCount)
                .ThenBy(c => c.NormalizedName)
                .Take(limit)
                .Select(c => new { c.Id, c.Name, parent = c.Province, c.IsVerified })
                .ToListAsync(ct);

            return Ok(hits);
        }
    }

    // ─── Instant-create (typeahead flow) ───────────────────────────────────────

    [HttpPost("instant-create")]
    [Authorize]
    public async Task<IActionResult> InstantCreate(
        [FromBody] InstantCreateLocationRequest req,
        CancellationToken ct = default)
    {
        await EnsureLocationColumnsAsync(ct);

        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "الاسم مطلوب" });

        var type = req.Type?.Trim().ToLower();

        try
        {
            if (type == "neighborhood")
            {
                if (string.IsNullOrWhiteSpace(req.City))
                    return BadRequest(new { error = "اسم المدينة مطلوب لإضافة حي" });

                var result = await _locationService.AddNeighborhoodAsync(
                    req.Name, req.City!, forceCreate: true, ct);

                _cache.Remove($"loc:nbrs:v2:{req.City}");
                _cache.Remove($"loc:nbrs:{req.City}");
                return Ok(new
                {
                    id         = result.Item!.Id,
                    name       = result.Item.Name,
                    parent     = result.Item.ParentName,
                    status     = result.Status,
                    isVerified = false,
                });
            }
            else // city
            {
                if (string.IsNullOrWhiteSpace(req.Province))
                    return BadRequest(new { error = "اسم المحافظة مطلوب لإضافة مدينة" });

                var result = await _locationService.AddCityAsync(
                    req.Name, req.Province!, forceCreate: true, ct);

                InvalidateCityCaches(req.Province);

                return Ok(new
                {
                    id         = result.Item!.Id,
                    name       = result.Item.Name,
                    parent     = result.Item.ParentName,
                    status     = result.Status,
                    isVerified = false,
                });
            }
        }
        catch (ArgumentException ex)
        {
            return BadRequest(new { error = ex.Message });
        }
    }

    // ─── Verify / unverify (admin) ─────────────────────────────────────────────

    [HttpPatch("cities/{id:guid}/verify")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> VerifyCity(Guid id, [FromBody] VerifyLocationRequest req, CancellationToken ct = default)
    {
        var city = await _db.LocationCities.FindAsync([id], ct);
        if (city is null) return NotFound();

        city.IsVerified = req.IsVerified;
        await _db.SaveChangesAsync(ct);

        InvalidateCityCaches(city.Province);
        return Ok(new { id = city.Id, name = city.Name, isVerified = city.IsVerified });
    }

    [HttpPatch("neighborhoods/{id:guid}/verify")]
    [Authorize(Policy = "Admin")]
    public async Task<IActionResult> VerifyNeighborhood(Guid id, [FromBody] VerifyLocationRequest req, CancellationToken ct = default)
    {
        var nbr = await _db.LocationNeighborhoods.FindAsync([id], ct);
        if (nbr is null) return NotFound();

        nbr.IsVerified = req.IsVerified;
        await _db.SaveChangesAsync(ct);

        _cache.Remove($"loc:nbrs:v2:{nbr.City}");
        _cache.Remove($"loc:nbrs:{nbr.City}");
        return Ok(new { id = nbr.Id, name = nbr.Name, isVerified = nbr.IsVerified });
    }

    // ─── Usage count bump (called by property-save logic) ──────────────────────

    [HttpPost("cities/bump-usage")]
    [Authorize]
    public async Task<IActionResult> BumpCityUsage([FromBody] BumpUsageRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest();
        await _db.LocationCities
            .Where(c => c.IsActive && c.Name == req.Name)
            .ExecuteUpdateAsync(s => s.SetProperty(c => c.UsageCount, c => c.UsageCount + 1), ct);
        InvalidateCityCaches(req.Province);
        return Ok();
    }

    [HttpPost("neighborhoods/bump-usage")]
    [Authorize]
    public async Task<IActionResult> BumpNeighborhoodUsage([FromBody] BumpUsageRequest req, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name)) return BadRequest();
        await _db.LocationNeighborhoods
            .Where(n => n.IsActive && n.Name == req.Name)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.UsageCount, n => n.UsageCount + 1), ct);
        if (!string.IsNullOrWhiteSpace(req.Province))
        {
            _cache.Remove($"loc:nbrs:v2:{req.Province}");
            _cache.Remove($"loc:nbrs:{req.Province}");
        }
        return Ok();
    }

    // ─── Location Suggestions ──────────────────────────────────────────────────

    [HttpPost("suggestions")]
    [Authorize]
    public async Task<IActionResult> SubmitSuggestion(
        [FromBody] SubmitLocationSuggestionRequest req,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Name))
            return BadRequest(new { error = "الاسم مطلوب" });

        var type = req.Type?.Trim().ToLower();
        if (type != "city" && type != "neighborhood")
            return BadRequest(new { error = "النوع يجب أن يكون city أو neighborhood" });

        var suggestion = new Boioot.Domain.Entities.LocationSuggestion
        {
            Id        = Guid.NewGuid(),
            Name      = req.Name.Trim(),
            Type      = type!,
            ParentId  = req.ParentId,
            Status    = "pending",
            CreatedAt = DateTime.UtcNow,
        };

        _db.LocationSuggestions.Add(suggestion);
        await _db.SaveChangesAsync(ct);

        return Ok(new { id = suggestion.Id, status = "pending" });
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

    // ─── Property Location Options ─────────────────────────────────────────────

    [HttpGet("property-options")]
    [AllowAnonymous]
    public async Task<IActionResult> GetPropertyOptions(
        [FromQuery] string? province,
        [FromQuery] string? city,
        CancellationToken   ct = default)
    {
        Response.Headers.Append("Cache-Control", "public, max-age=120, stale-while-revalidate=30");

        var cacheKey = $"loc:prop-opts:{province ?? "_"}:{city ?? "_"}";
        if (_cache.TryGetValue(cacheKey, out object? cachedOpts))
            return Ok(cachedOpts);

        var baseQuery = _db.Properties
            .AsNoTracking()
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

        var result = new
        {
            provinces,
            cities        = cities.Select(x => new { name = x.City, province = x.Province }),
            neighborhoods = neighborhoods.Select(x => new { name = x.Neighborhood, city = x.City, province = x.Province }),
        };

        _cache.Set(cacheKey, result, PropOptionsTtl);
        return Ok(result);
    }

    // ─── Private helpers ───────────────────────────────────────────────────────

    private void InvalidateCityCaches(string? province)
    {
        _cache.Remove("loc:provinces");
        _cache.Remove("loc:cities:v2");
        _cache.Remove("loc:cities");  // invalidate old key too
        if (!string.IsNullOrWhiteSpace(province))
        {
            _cache.Remove($"loc:cities:v2:{province}");
            _cache.Remove($"loc:cities:{province}");
        }
    }
}

// ─── Request / Response DTOs ───────────────────────────────────────────────────

public record AddCityRequest(string? Name, string? Province, bool? ForceCreate);
public record AddNeighborhoodRequest(string? Name, string? City, bool? ForceCreate);
public record VerifyLocationRequest(bool IsVerified);
public record BumpUsageRequest(string? Name, string? Province);

public record LocationApiResult(
    string                          Status,
    LocationItemDto?                Item,
    IReadOnlyList<LocationItemDto>  Suggestions);

public record SubmitLocationSuggestionRequest(string? Name, string? Type, Guid? ParentId);

public record InstantCreateLocationRequest(string? Name, string? Type, string? Province, string? City);
