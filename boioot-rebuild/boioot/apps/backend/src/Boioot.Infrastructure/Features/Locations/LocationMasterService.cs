using Boioot.Application.Features.Locations.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Locations;

/// <summary>
/// Strict master-data service for cities and neighborhoods.
///
/// Enforces three layers of protection against dirty data:
///   1. Strict normalization  — deterministic duplicate prevention
///   2. Soft similarity       — "did you mean?" detection
///   3. DB uniqueness index   — last-resort race-condition guard
/// </summary>
public sealed class LocationMasterService : ILocationMasterService
{
    private readonly BoiootDbContext    _db;
    private readonly ILogger<LocationMasterService> _logger;

    private const int MinNameLength   = 2;
    private const int MaxSuggestions  = 5;

    public LocationMasterService(BoiootDbContext db, ILogger<LocationMasterService> logger)
    {
        _db     = db;
        _logger = logger;
    }

    // ── Cities ────────────────────────────────────────────────────────────────

    public async Task<LocationMasterResult> AddCityAsync(
        string name,
        string province,
        bool   forceCreate,
        CancellationToken ct = default)
    {
        name     = name.Trim();
        province = province.Trim();

        // ── Validation ────────────────────────────────────────────────────────
        if (name.Length < MinNameLength)
            throw new ArgumentException($"اسم المدينة يجب أن يكون {MinNameLength} حروف على الأقل.");
        if (string.IsNullOrEmpty(province))
            throw new ArgumentException("يجب تحديد المحافظة قبل إضافة مدينة.");

        var displayName    = CapitalizeArabic(name);
        var normalizedName = ArabicNormalizer.Normalize(name);

        // ── 1. Strict duplicate — ACTIVE rows only ────────────────────────────
        // Inactive rows are deactivated duplicates; they do NOT block creation.
        var strictDup = await _db.LocationCities
            .Where(c => c.IsActive && c.Province == province && c.NormalizedName == normalizedName)
            .Select(c => new LocationItemDto(c.Id, c.Name, c.Province))
            .FirstOrDefaultAsync(ct);

        if (strictDup is not null)
        {
            _logger.LogDebug("City '{Name}' already exists in province '{Province}' (strict match).", name, province);
            return new LocationMasterResult("exists", strictDup, []);
        }

        // ── 2. Soft similarity — ACTIVE rows only; blocked unless forceCreate ─
        // If similar active entries exist and the user has NOT explicitly confirmed,
        // return suggestions. Creation is BLOCKED until forceCreate = true.
        if (!forceCreate)
        {
            var softKey = ArabicNormalizer.SoftNormalize(name);

            var candidates = await _db.LocationCities
                .Where(c => c.IsActive && c.Province == province)
                .Select(c => new { c.Id, c.Name, c.Province, c.NormalizedName })
                .ToListAsync(ct);

            var similar = candidates
                .Where(c => ArabicNormalizer.SoftNormalize(c.NormalizedName) == softKey)
                .Take(MaxSuggestions)
                .Select(c => new LocationItemDto(c.Id, c.Name, c.Province))
                .ToList();

            if (similar.Count > 0)
            {
                _logger.LogDebug("City '{Name}' has {Count} soft similar entries in '{Province}'. Creation blocked — forceCreate required.", name, similar.Count, province);
                return new LocationMasterResult("similar", null, similar);
            }
        }

        // ── 3. Create ─────────────────────────────────────────────────────────
        var city = new LocationCity
        {
            Name           = displayName,
            NormalizedName = normalizedName,
            Province       = province,
            IsActive       = true,
        };
        _db.LocationCities.Add(city);

        try
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("City '{Name}' created in province '{Province}'.", displayName, province);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
        {
            // Race condition — another active request beat us; return that existing row.
            var race = await _db.LocationCities
                .Where(c => c.IsActive && c.Province == province && c.NormalizedName == normalizedName)
                .Select(c => new LocationItemDto(c.Id, c.Name, c.Province))
                .FirstOrDefaultAsync(ct);

            if (race is not null)
                return new LocationMasterResult("exists", race, []);
            throw;
        }

        return new LocationMasterResult("created", new LocationItemDto(city.Id, city.Name, city.Province), []);
    }

    // ── Neighborhoods ─────────────────────────────────────────────────────────

    public async Task<LocationMasterResult> AddNeighborhoodAsync(
        string name,
        string city,
        bool   forceCreate,
        CancellationToken ct = default)
    {
        name = name.Trim();
        city = city.Trim();

        // ── Validation ────────────────────────────────────────────────────────
        if (name.Length < MinNameLength)
            throw new ArgumentException($"اسم الحي يجب أن يكون {MinNameLength} حروف على الأقل.");
        if (string.IsNullOrEmpty(city))
            throw new ArgumentException("يجب تحديد المدينة قبل إضافة حي.");

        // Verify city exists in master data
        var parentExists = await _db.LocationCities
            .AnyAsync(c => c.Name == city && c.IsActive, ct);
        if (!parentExists)
            throw new ArgumentException($"المدينة '{city}' غير موجودة في بيانات الأساس.");

        var displayName    = CapitalizeArabic(name);
        var normalizedName = ArabicNormalizer.Normalize(name);

        // ── 1. Strict duplicate — ACTIVE rows only ────────────────────────────
        var strictDup = await _db.LocationNeighborhoods
            .Where(n => n.IsActive && n.City == city && n.NormalizedName == normalizedName)
            .Select(n => new LocationItemDto(n.Id, n.Name, n.City))
            .FirstOrDefaultAsync(ct);

        if (strictDup is not null)
        {
            _logger.LogDebug("Neighborhood '{Name}' already exists in city '{City}' (strict match).", name, city);
            return new LocationMasterResult("exists", strictDup, []);
        }

        // ── 2. Soft similarity — ACTIVE rows only; blocked unless forceCreate ─
        if (!forceCreate)
        {
            var softKey = ArabicNormalizer.SoftNormalize(name);

            var candidates = await _db.LocationNeighborhoods
                .Where(n => n.IsActive && n.City == city)
                .Select(n => new { n.Id, n.Name, n.City, n.NormalizedName })
                .ToListAsync(ct);

            var similar = candidates
                .Where(n => ArabicNormalizer.SoftNormalize(n.NormalizedName) == softKey)
                .Take(MaxSuggestions)
                .Select(n => new LocationItemDto(n.Id, n.Name, n.City))
                .ToList();

            if (similar.Count > 0)
            {
                _logger.LogDebug("Neighborhood '{Name}' has {Count} soft similar entries in '{City}'. Creation blocked — forceCreate required.", name, similar.Count, city);
                return new LocationMasterResult("similar", null, similar);
            }
        }

        // ── 3. Create ─────────────────────────────────────────────────────────
        var neighborhood = new LocationNeighborhood
        {
            Name           = displayName,
            NormalizedName = normalizedName,
            City           = city,
            IsActive       = true,
        };
        _db.LocationNeighborhoods.Add(neighborhood);

        try
        {
            await _db.SaveChangesAsync(ct);
            _logger.LogInformation("Neighborhood '{Name}' created in city '{City}'.", displayName, city);
        }
        catch (DbUpdateException ex) when (ex.InnerException?.Message.Contains("UNIQUE constraint failed") == true)
        {
            // Race condition — another active request beat us; return that existing row.
            var race = await _db.LocationNeighborhoods
                .Where(n => n.IsActive && n.City == city && n.NormalizedName == normalizedName)
                .Select(n => new LocationItemDto(n.Id, n.Name, n.City))
                .FirstOrDefaultAsync(ct);

            if (race is not null)
                return new LocationMasterResult("exists", race, []);
            throw;
        }

        return new LocationMasterResult("created",
            new LocationItemDto(neighborhood.Id, neighborhood.Name, neighborhood.City), []);
    }

    // ── Duplicate detection ───────────────────────────────────────────────────

    public async Task<IReadOnlyList<DuplicateGroup>> DetectDuplicateCitiesAsync(CancellationToken ct = default)
    {
        var cities = await _db.LocationCities
            .Select(c => new { c.Id, c.Name, c.Province, c.NormalizedName, c.IsActive })
            .ToListAsync(ct);

        return cities
            .GroupBy(c => (c.Province, c.NormalizedName))
            .Where(g => g.Count() > 1)
            .Select(g => new DuplicateGroup(
                g.Key.Province,
                g.Key.NormalizedName,
                g.Select(c => new DuplicateEntry(c.Id, c.Name, c.IsActive)).ToList()
            ))
            .ToList();
    }

    public async Task<IReadOnlyList<DuplicateGroup>> DetectDuplicateNeighborhoodsAsync(CancellationToken ct = default)
    {
        var neighborhoods = await _db.LocationNeighborhoods
            .Select(n => new { n.Id, n.Name, n.City, n.NormalizedName, n.IsActive })
            .ToListAsync(ct);

        return neighborhoods
            .GroupBy(n => (n.City, n.NormalizedName))
            .Where(g => g.Count() > 1)
            .Select(g => new DuplicateGroup(
                g.Key.City,
                g.Key.NormalizedName,
                g.Select(n => new DuplicateEntry(n.Id, n.Name, n.IsActive)).ToList()
            ))
            .ToList();
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Keeps the user's display casing while trimming extra whitespace.
    /// Arabic text has no case, so this just cleans spacing.
    /// </summary>
    private static string CapitalizeArabic(string name) =>
        string.Join(' ', name.Split(' ', StringSplitOptions.RemoveEmptyEntries));
}
