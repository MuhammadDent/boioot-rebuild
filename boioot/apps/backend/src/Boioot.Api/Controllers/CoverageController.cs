using Boioot.Application.Exceptions;
using Boioot.Application.Features.Coverage.DTOs;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Authorize]
[Route("api/coverage")]
public class CoverageController : BaseController
{
    private readonly BoiootDbContext _db;

    public CoverageController(BoiootDbContext db)
    {
        _db = db;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Ensure Province column exists and CityId is nullable (idempotent).
    // ─────────────────────────────────────────────────────────────────────────
    private Task EnsureColumnsAsync(CancellationToken ct) =>
        _db.Database.ExecuteSqlRawAsync(@"
            ALTER TABLE ""UserCoverages"" ADD COLUMN IF NOT EXISTS ""Province"" TEXT;
            ALTER TABLE ""UserCoverages"" ALTER COLUMN ""CityId"" DROP NOT NULL;
        ", ct);

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/coverage
    // Returns the calling user's registered coverage areas.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMyCoverage(CancellationToken ct)
    {
        await EnsureColumnsAsync(ct);

        var userId = GetUserId();

        var items = await _db.Set<UserCoverage>()
            .AsNoTracking()
            .Include(uc => uc.City)
            .Include(uc => uc.Neighborhood)
            .Where(uc => uc.UserId == userId)
            .OrderByDescending(uc => uc.CreatedAt)
            .Select(uc => new CoverageItemDto
            {
                Id               = uc.Id,
                CityId           = uc.CityId,
                CityName         = uc.CoverageType == "province_wide"
                                       ? "كل المدن"
                                       : uc.City != null ? uc.City.Name : "",
                Province         = uc.Province,
                NeighborhoodId   = uc.NeighborhoodId,
                NeighborhoodName = uc.Neighborhood != null ? uc.Neighborhood.Name : null,
                CoverageType     = uc.CoverageType,
                AddedAt          = uc.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(items);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // POST /api/coverage
    // Adds a coverage area for the calling user.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpPost]
    public async Task<IActionResult> AddCoverage(
        [FromBody] AddCoverageDto dto,
        CancellationToken ct)
    {
        await EnsureColumnsAsync(ct);

        var userId = GetUserId();

        // ── province_wide: covers all cities in a province ────────────────────
        if (dto.CoverageType == "province_wide")
        {
            if (string.IsNullOrWhiteSpace(dto.Province))
                throw new BoiootException("يرجى تحديد المحافظة عند اختيار تغطية كاملة للمحافظة", 400);

            var province = dto.Province.Trim();

            var exists = await _db.Set<UserCoverage>()
                .AnyAsync(uc =>
                    uc.UserId       == userId
                 && uc.CoverageType == "province_wide"
                 && uc.Province     == province, ct);

            if (exists)
                throw new BoiootException("منطقة التغطية هذه مسجّلة مسبقاً", 409);

            var entry = new UserCoverage
            {
                UserId       = userId,
                CityId       = null,
                Province     = province,
                CoverageType = "province_wide",
                CreatedAt    = DateTime.UtcNow,
                UpdatedAt    = DateTime.UtcNow,
            };

            _db.Set<UserCoverage>().Add(entry);
            await _db.SaveChangesAsync(ct);

            return Ok(new CoverageItemDto
            {
                Id           = entry.Id,
                CityId       = null,
                CityName     = "كل المدن",
                Province     = province,
                CoverageType = "province_wide",
                AddedAt      = entry.CreatedAt,
            });
        }

        // ── city_wide / custom: requires a valid CityId ───────────────────────
        if (!dto.CityId.HasValue)
            throw new BoiootException("يرجى تحديد المدينة", 400);

        var city = await _db.LocationCities
            .FirstOrDefaultAsync(c => c.Id == dto.CityId.Value && c.IsActive, ct)
            ?? throw new BoiootException("المدينة غير موجودة", 404);

        LocationNeighborhood? neighborhood = null;
        if (dto.CoverageType == "custom")
        {
            if (!dto.NeighborhoodId.HasValue)
                throw new BoiootException("يجب تحديد الحي عند اختيار تغطية مخصصة", 400);

            neighborhood = await _db.LocationNeighborhoods
                .FirstOrDefaultAsync(n => n.Id == dto.NeighborhoodId.Value && n.IsActive, ct)
                ?? throw new BoiootException("الحي غير موجود", 404);
        }

        var dup = await _db.Set<UserCoverage>()
            .AnyAsync(uc =>
                uc.UserId        == userId
             && uc.CityId        == dto.CityId
             && uc.CoverageType  == dto.CoverageType
             && uc.NeighborhoodId == dto.NeighborhoodId, ct);

        if (dup)
            throw new BoiootException("منطقة التغطية هذه مسجّلة مسبقاً", 409);

        var cityEntry = new UserCoverage
        {
            UserId         = userId,
            CityId         = dto.CityId,
            NeighborhoodId = dto.NeighborhoodId,
            CoverageType   = dto.CoverageType,
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };

        _db.Set<UserCoverage>().Add(cityEntry);
        await _db.SaveChangesAsync(ct);

        return Ok(new CoverageItemDto
        {
            Id               = cityEntry.Id,
            CityId           = cityEntry.CityId,
            CityName         = city.Name,
            Province         = null,
            NeighborhoodId   = cityEntry.NeighborhoodId,
            NeighborhoodName = neighborhood?.Name,
            CoverageType     = cityEntry.CoverageType,
            AddedAt          = cityEntry.CreatedAt,
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE /api/coverage/{id}
    // Removes a coverage area belonging to the calling user.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> RemoveCoverage(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();

        var entry = await _db.Set<UserCoverage>()
            .FirstOrDefaultAsync(uc => uc.Id == id, ct)
            ?? throw new BoiootException("منطقة التغطية غير موجودة", 404);

        if (entry.UserId != userId)
            throw new BoiootException("غير مصرح لك بحذف هذه المنطقة", 403);

        _db.Set<UserCoverage>().Remove(entry);
        await _db.SaveChangesAsync(ct);

        return Ok(new { deleted = id });
    }
}
