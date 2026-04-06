using Boioot.Application.Features.SpecialRequests.DTOs;
using Boioot.Application.Features.SpecialRequests.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.SpecialRequests;

public class SpecialRequestTypeService : ISpecialRequestTypeService
{
    private readonly BoiootDbContext _context;

    public SpecialRequestTypeService(BoiootDbContext context)
    {
        _context = context;
    }

    // ── Public ────────────────────────────────────────────────────────────────

    public async Task<List<SpecialRequestTypeResponse>> GetActiveAsync(CancellationToken ct = default)
    {
        return await _context.SpecialRequestTypes
            .Where(t => t.IsActive)
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.CreatedAt)
            .Select(t => Map(t))
            .ToListAsync(ct);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public async Task<List<SpecialRequestTypeResponse>> GetAllAsync(CancellationToken ct = default)
    {
        return await _context.SpecialRequestTypes
            .OrderBy(t => t.SortOrder)
            .ThenBy(t => t.CreatedAt)
            .Select(t => Map(t))
            .ToListAsync(ct);
    }

    public async Task<SpecialRequestTypeResponse> CreateAsync(CreateSpecialRequestTypeDto dto, CancellationToken ct = default)
    {
        var entity = new SpecialRequestType
        {
            Label     = dto.Label.Trim(),
            Value     = dto.Value.Trim().ToLowerInvariant(),
            SortOrder = dto.SortOrder,
            IsActive  = dto.IsActive,
        };

        _context.SpecialRequestTypes.Add(entity);
        await _context.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task<SpecialRequestTypeResponse> UpdateAsync(Guid id, UpdateSpecialRequestTypeDto dto, CancellationToken ct = default)
    {
        var entity = await _context.SpecialRequestTypes.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"SpecialRequestType {id} not found");

        if (dto.Label     is not null) entity.Label     = dto.Label.Trim();
        if (dto.Value     is not null) entity.Value     = dto.Value.Trim().ToLowerInvariant();
        if (dto.SortOrder is not null) entity.SortOrder = dto.SortOrder.Value;
        if (dto.IsActive  is not null) entity.IsActive  = dto.IsActive.Value;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.SpecialRequestTypes.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"SpecialRequestType {id} not found");

        _context.SpecialRequestTypes.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static SpecialRequestTypeResponse Map(SpecialRequestType t) => new()
    {
        Id        = t.Id,
        Label     = t.Label,
        Value     = t.Value,
        SortOrder = t.SortOrder,
        IsActive  = t.IsActive,
        CreatedAt = t.CreatedAt,
        UpdatedAt = t.UpdatedAt,
    };
}
