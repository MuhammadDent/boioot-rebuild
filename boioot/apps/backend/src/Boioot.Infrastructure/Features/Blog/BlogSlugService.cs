using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Blog;

public class BlogSlugService : IBlogSlugService
{
    private readonly BoiootDbContext _db;

    public BlogSlugService(BoiootDbContext db)
    {
        _db = db;
    }

    // ── Normalize ─────────────────────────────────────────────────────────────

    public string Normalize(string input)
    {
        if (string.IsNullOrWhiteSpace(input)) return string.Empty;

        var slug = input.ToLowerInvariant().Trim()
            .Replace(" ", "-")
            .Replace("_", "-");

        // Keep letters (including Arabic/Unicode), digits, and hyphens
        var chars = slug.ToCharArray()
            .Where(c => char.IsLetterOrDigit(c) || c == '-')
            .ToArray();

        slug = new string(chars);

        // Collapse consecutive hyphens
        while (slug.Contains("--"))
            slug = slug.Replace("--", "-");

        return slug.Trim('-');
    }

    // ── Posts ─────────────────────────────────────────────────────────────────

    public async Task<string> UniquePostSlugAsync(
        string input, Guid? excludeId = null, CancellationToken ct = default)
    {
        var base_ = Normalize(input);
        if (string.IsNullOrEmpty(base_))
            throw new Application.Exceptions.BoiootException("تعذّر إنشاء slug من النص المُدخَل", 400);

        return await FindUniqueAsync(
            base_,
            slug => PostSlugExistsAsync(slug, excludeId, ct));
    }

    // ── Categories ────────────────────────────────────────────────────────────

    public async Task<string> UniqueCategorySlugAsync(
        string input, Guid? excludeId = null, CancellationToken ct = default)
    {
        var base_ = Normalize(input);
        if (string.IsNullOrEmpty(base_))
            throw new Application.Exceptions.BoiootException("تعذّر إنشاء slug من النص المُدخَل", 400);

        return await FindUniqueAsync(
            base_,
            slug => CategorySlugExistsAsync(slug, excludeId, ct));
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    /// <summary>
    /// Tries base slug first, then base-1, base-2, … until a free one is found.
    /// </summary>
    private static async Task<string> FindUniqueAsync(
        string baseSlug, Func<string, Task<bool>> existsAsync)
    {
        if (!await existsAsync(baseSlug))
            return baseSlug;

        for (var suffix = 1; suffix <= 999; suffix++)
        {
            var candidate = $"{baseSlug}-{suffix}";
            if (!await existsAsync(candidate))
                return candidate;
        }

        // Extremely unlikely — fall back to timestamp suffix
        return $"{baseSlug}-{DateTimeOffset.UtcNow.ToUnixTimeMilliseconds()}";
    }

    private async Task<bool> PostSlugExistsAsync(string slug, Guid? excludeId, CancellationToken ct)
    {
        var q = _db.Set<BlogPost>().IgnoreQueryFilters().Where(p => p.Slug == slug);
        if (excludeId.HasValue) q = q.Where(p => p.Id != excludeId.Value);
        return await q.AnyAsync(ct);
    }

    private async Task<bool> CategorySlugExistsAsync(string slug, Guid? excludeId, CancellationToken ct)
    {
        var q = _db.Set<BlogCategory>().Where(c => c.Slug == slug);
        if (excludeId.HasValue) q = q.Where(c => c.Id != excludeId.Value);
        return await q.AnyAsync(ct);
    }
}
