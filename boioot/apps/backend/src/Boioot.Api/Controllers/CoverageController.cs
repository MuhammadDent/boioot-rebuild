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
    // GET /api/coverage
    // Returns the calling user's registered coverage areas.
    // ─────────────────────────────────────────────────────────────────────────
    [HttpGet]
    public async Task<IActionResult> GetMyCoverage(CancellationToken ct)
    {
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
                CityName         = uc.City.Name,
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
        var userId = GetUserId();

        // Validate city exists
        var city = await _db.LocationCities
            .FirstOrDefaultAsync(c => c.Id == dto.CityId && c.IsActive, ct)
            ?? throw new BoiootException("المدينة غير موجودة", 404);

        // Validate neighborhood if custom coverage
        LocationNeighborhood? neighborhood = null;
        if (dto.CoverageType == "custom")
        {
            if (!dto.NeighborhoodId.HasValue)
                throw new BoiootException("يجب تحديد الحي عند اختيار تغطية مخصصة", 400);

            neighborhood = await _db.LocationNeighborhoods
                .FirstOrDefaultAsync(n => n.Id == dto.NeighborhoodId.Value && n.IsActive, ct)
                ?? throw new BoiootException("الحي غير موجود", 404);
        }

        // Prevent duplicates
        var exists = await _db.Set<UserCoverage>()
            .AnyAsync(uc =>
                uc.UserId == userId
             && uc.CityId == dto.CityId
             && uc.CoverageType == dto.CoverageType
             && uc.NeighborhoodId == dto.NeighborhoodId, ct);

        if (exists)
            throw new BoiootException("منطقة التغطية هذه مسجّلة مسبقاً", 409);

        var entry = new UserCoverage
        {
            UserId         = userId,
            CityId         = dto.CityId,
            NeighborhoodId = dto.NeighborhoodId,
            CoverageType   = dto.CoverageType,
            CreatedAt      = DateTime.UtcNow,
            UpdatedAt      = DateTime.UtcNow,
        };

        _db.Set<UserCoverage>().Add(entry);
        await _db.SaveChangesAsync(ct);

        return Ok(new CoverageItemDto
        {
            Id               = entry.Id,
            CityId           = entry.CityId,
            CityName         = city.Name,
            NeighborhoodId   = entry.NeighborhoodId,
            NeighborhoodName = neighborhood?.Name,
            CoverageType     = entry.CoverageType,
            AddedAt          = entry.CreatedAt,
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
