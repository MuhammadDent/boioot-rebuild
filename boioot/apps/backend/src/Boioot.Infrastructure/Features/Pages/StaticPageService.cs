using Boioot.Application.Features.Pages.DTOs;
using Boioot.Application.Features.Pages.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Pages;

public class StaticPageService : IStaticPageService
{
    private readonly BoiootDbContext _db;

    public StaticPageService(BoiootDbContext db) => _db = db;

    // ── Table bootstrap ───────────────────────────────────────────────────────

    public async Task EnsureTableAsync(CancellationToken ct = default)
    {
        await _db.Database.ExecuteSqlRawAsync(@"
            CREATE TABLE IF NOT EXISTS ""StaticPages"" (
                ""Id""                  character varying(36)  NOT NULL,
                ""Slug""                VARCHAR(100)  NOT NULL,
                ""TitleAr""             VARCHAR(200)  NOT NULL,
                ""ContentAr""           TEXT          NULL,
                ""MetaDescriptionAr""   VARCHAR(500)  NULL,
                ""IsActive""            BOOLEAN       NOT NULL DEFAULT TRUE,
                ""ShowInFooter""        BOOLEAN       NOT NULL DEFAULT FALSE,
                ""FooterSection""       VARCHAR(50)   NULL,
                ""SortOrder""           INTEGER       NOT NULL DEFAULT 0,
                ""IsSystem""            BOOLEAN       NOT NULL DEFAULT FALSE,
                ""CreatedAt""           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                ""UpdatedAt""           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
                CONSTRAINT ""PK_StaticPages"" PRIMARY KEY (""Id"")
            );
            CREATE UNIQUE INDEX IF NOT EXISTS ""IX_StaticPages_Slug"" ON ""StaticPages"" (""Slug"");
        ", ct);
    }

    // ── Public ────────────────────────────────────────────────────────────────

    public async Task<StaticPagePublicDto?> GetBySlugAsync(string slug, CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);
        var page = await _db.StaticPages
            .AsNoTracking()
            .Where(p => p.Slug == slug && p.IsActive)
            .Select(p => new StaticPagePublicDto(p.Slug, p.TitleAr, p.ContentAr, p.MetaDescriptionAr))
            .FirstOrDefaultAsync(ct);

        return page;
    }

    public async Task<List<FooterLinkDto>> GetFooterLinksAsync(CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);
        return await _db.StaticPages
            .AsNoTracking()
            .Where(p => p.IsActive && p.ShowInFooter)
            .OrderBy(p => p.FooterSection)
            .ThenBy(p => p.SortOrder)
            .ThenBy(p => p.TitleAr)
            .Select(p => new FooterLinkDto(p.Slug, p.TitleAr, p.FooterSection, p.SortOrder))
            .ToListAsync(ct);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public async Task<List<StaticPageAdminDto>> GetAllAdminAsync(CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);
        return await _db.StaticPages
            .AsNoTracking()
            .OrderBy(p => p.FooterSection)
            .ThenBy(p => p.SortOrder)
            .ThenBy(p => p.TitleAr)
            .Select(p => ToAdminDto(p))
            .ToListAsync(ct);
    }

    public async Task<StaticPageAdminDto> CreateAsync(UpsertStaticPageDto dto, CancellationToken ct = default)
    {
        await EnsureTableAsync(ct);
        var slugExists = await _db.StaticPages
            .AnyAsync(p => p.Slug == dto.Slug, ct);

        if (slugExists)
            throw new InvalidOperationException($"الرابط '{dto.Slug}' مستخدم بالفعل.");

        var page = new StaticPage
        {
            Slug               = dto.Slug.Trim().ToLowerInvariant(),
            TitleAr            = dto.TitleAr.Trim(),
            ContentAr          = dto.ContentAr,
            MetaDescriptionAr  = dto.MetaDescriptionAr,
            IsActive           = dto.IsActive,
            ShowInFooter       = dto.ShowInFooter,
            FooterSection      = dto.FooterSection,
            SortOrder          = dto.SortOrder,
            IsSystem           = false,
        };

        _db.StaticPages.Add(page);
        await _db.SaveChangesAsync(ct);
        return ToAdminDto(page);
    }

    public async Task<StaticPageAdminDto> UpdateAsync(Guid id, UpsertStaticPageDto dto, CancellationToken ct = default)
    {
        var page = await _db.StaticPages.FindAsync([id], ct)
                   ?? throw new KeyNotFoundException($"الصفحة {id} غير موجودة.");

        var slugConflict = await _db.StaticPages
            .AnyAsync(p => p.Slug == dto.Slug && p.Id != id, ct);

        if (slugConflict)
            throw new InvalidOperationException($"الرابط '{dto.Slug}' مستخدم بالفعل.");

        page.Slug              = dto.Slug.Trim().ToLowerInvariant();
        page.TitleAr           = dto.TitleAr.Trim();
        page.ContentAr         = dto.ContentAr;
        page.MetaDescriptionAr = dto.MetaDescriptionAr;
        page.IsActive          = dto.IsActive;
        page.ShowInFooter      = dto.ShowInFooter;
        page.FooterSection     = dto.FooterSection;
        page.SortOrder         = dto.SortOrder;

        await _db.SaveChangesAsync(ct);
        return ToAdminDto(page);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var page = await _db.StaticPages.FindAsync([id], ct)
                   ?? throw new KeyNotFoundException($"الصفحة {id} غير موجودة.");

        if (page.IsSystem)
            throw new InvalidOperationException("لا يمكن حذف الصفحات النظامية.");

        _db.StaticPages.Remove(page);
        await _db.SaveChangesAsync(ct);
    }

    // ── Mapping ───────────────────────────────────────────────────────────────

    private static StaticPageAdminDto ToAdminDto(StaticPage p) =>
        new(p.Id, p.Slug, p.TitleAr, p.ContentAr, p.MetaDescriptionAr,
            p.IsActive, p.ShowInFooter, p.FooterSection, p.SortOrder,
            p.IsSystem, p.CreatedAt, p.UpdatedAt);
}
