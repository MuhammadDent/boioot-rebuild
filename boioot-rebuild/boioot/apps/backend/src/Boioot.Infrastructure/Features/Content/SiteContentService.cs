using Boioot.Application.Exceptions;
using Boioot.Application.Features.Content.DTOs;
using Boioot.Application.Features.Content.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Content;

public sealed class SiteContentService : ISiteContentService
{
    private readonly BoiootDbContext _ctx;
    private readonly ILogger<SiteContentService> _log;

    public SiteContentService(BoiootDbContext ctx, ILogger<SiteContentService> log)
    {
        _ctx = ctx;
        _log = log;
    }

    // ── Public: key→value dictionary ─────────────────────────────────────────

    public async Task<Dictionary<string, string>> GetPublicDictionaryAsync(CancellationToken ct = default)
    {
        return await _ctx.SiteContents
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder)
            .ToDictionaryAsync(
                c => c.Key,
                c => c.ValueAr ?? string.Empty,
                ct);
    }

    // ── Admin: list ───────────────────────────────────────────────────────────

    public async Task<IReadOnlyList<SiteContentResponse>> GetAllAsync(
        string? group = null,
        CancellationToken ct = default)
    {
        var query = _ctx.SiteContents.AsQueryable();

        if (!string.IsNullOrWhiteSpace(group))
            query = query.Where(c => c.Group == group);

        var items = await query
            .OrderBy(c => c.Group)
            .ThenBy(c => c.SortOrder)
            .ThenBy(c => c.Key)
            .ToListAsync(ct);

        return items.Select(Map).ToList();
    }

    // ── Admin: single ─────────────────────────────────────────────────────────

    public async Task<SiteContentResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var item = await _ctx.SiteContents.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("عنصر المحتوى غير موجود", 404);

        return Map(item);
    }

    // ── Admin: create ─────────────────────────────────────────────────────────

    public async Task<SiteContentResponse> CreateAsync(
        CreateSiteContentRequest request,
        CancellationToken ct = default)
    {
        var keyExists = await _ctx.SiteContents.AnyAsync(c => c.Key == request.Key, ct);
        if (keyExists)
            throw new BoiootException($"المفتاح '{request.Key}' مستخدم بالفعل", 409);

        var item = new SiteContent
        {
            Key       = request.Key.Trim(),
            Group     = request.Group.Trim(),
            Type      = request.Type.Trim(),
            LabelAr   = request.LabelAr.Trim(),
            LabelEn   = request.LabelEn?.Trim(),
            ValueAr   = request.ValueAr?.Trim(),
            ValueEn   = request.ValueEn?.Trim(),
            IsActive  = request.IsActive,
            IsSystem  = false,
            SortOrder = request.SortOrder,
            CreatedAt = DateTime.UtcNow,
            UpdatedAt = DateTime.UtcNow,
        };

        _ctx.SiteContents.Add(item);
        await _ctx.SaveChangesAsync(ct);

        _log.LogInformation("[CMS] Created content key: {Key}", item.Key);
        return Map(item);
    }

    // ── Admin: update ─────────────────────────────────────────────────────────

    public async Task<SiteContentResponse> UpdateAsync(
        Guid id,
        UpdateSiteContentRequest request,
        CancellationToken ct = default)
    {
        var item = await _ctx.SiteContents.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("عنصر المحتوى غير موجود", 404);

        item.LabelAr  = request.LabelAr.Trim();
        item.LabelEn  = request.LabelEn?.Trim();
        item.ValueAr  = request.ValueAr?.Trim();
        item.ValueEn  = request.ValueEn?.Trim();
        item.IsActive = request.IsActive;
        item.SortOrder = request.SortOrder;
        item.Type     = request.Type.Trim();
        item.UpdatedAt = DateTime.UtcNow;

        await _ctx.SaveChangesAsync(ct);

        _log.LogInformation("[CMS] Updated content key: {Key}", item.Key);
        return Map(item);
    }

    // ── Admin: delete ─────────────────────────────────────────────────────────

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var item = await _ctx.SiteContents.FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("عنصر المحتوى غير موجود", 404);

        if (item.IsSystem)
            throw new BoiootException("لا يمكن حذف المحتوى الأساسي للنظام", 422);

        _ctx.SiteContents.Remove(item);
        await _ctx.SaveChangesAsync(ct);

        _log.LogInformation("[CMS] Deleted content key: {Key}", item.Key);
    }

    // ── Mapper ────────────────────────────────────────────────────────────────

    private static SiteContentResponse Map(SiteContent c) => new()
    {
        Id        = c.Id,
        Key       = c.Key,
        Group     = c.Group,
        Type      = c.Type,
        LabelAr   = c.LabelAr,
        LabelEn   = c.LabelEn,
        ValueAr   = c.ValueAr,
        ValueEn   = c.ValueEn,
        IsActive  = c.IsActive,
        IsSystem  = c.IsSystem,
        SortOrder = c.SortOrder,
        CreatedAt = c.CreatedAt,
        UpdatedAt = c.UpdatedAt,
    };
}
