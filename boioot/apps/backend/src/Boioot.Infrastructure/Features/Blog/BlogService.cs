using System.Text.RegularExpressions;
using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Blog.DTOs;
using Boioot.Application.Features.Blog.DTOs.Public;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Application.Features.Blog.Validation;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Blog;

public class BlogService : IBlogService
{
    private readonly BoiootDbContext _db;
    private readonly IBlogSlugService _slugService;
    private readonly ILogger<BlogService> _logger;

    private static readonly Guid SeoSettingsId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public BlogService(BoiootDbContext db, IBlogSlugService slugService, ILogger<BlogService> logger)
    {
        _db          = db;
        _slugService = slugService;
        _logger      = logger;
    }

    // ── Map helpers ───────────────────────────────────────────────────────────

    private static BlogCategoryResponse MapCategory(BlogCategory c, int postCount = 0) => new()
    {
        Id          = c.Id,
        Name        = c.Name,
        Slug        = c.Slug,
        Description = c.Description,
        IsActive    = c.IsActive,
        SortOrder   = c.SortOrder,
        PostCount   = postCount,
        CreatedAt   = c.CreatedAt,
        UpdatedAt   = c.UpdatedAt
    };

    private static List<BlogCategoryResponse> MapCategories(BlogPost p) =>
        p.BlogPostCategories
            .Select(bpc => MapCategory(bpc.BlogCategory))
            .ToList();

    private static List<string> ParseTags(string? raw) =>
        string.IsNullOrWhiteSpace(raw)
            ? new List<string>()
            : raw.Split(',', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries).ToList();

    private static string? SerializeTags(IEnumerable<string>? tags)
    {
        if (tags == null) return null;
        var joined = string.Join(",", tags.Select(t => t.Trim()).Where(t => t.Length > 0));
        return joined.Length == 0 ? null : joined;
    }

    // ── SEO template resolution ───────────────────────────────────────────────

    /// <summary>Replaces {Variable} tokens in a template with resolved values.</summary>
    private static string ResolveTemplate(string template, BlogPost post, BlogSeoSettings settings)
    {
        var primaryCategory = post.BlogPostCategories
            .Select(bpc => bpc.BlogCategory?.Name)
            .FirstOrDefault(n => n != null) ?? "";

        var publishDate = post.PublishedAt.HasValue
            ? post.PublishedAt.Value.ToString("yyyy-MM-dd")
            : DateTime.UtcNow.ToString("yyyy-MM-dd");

        var readTime = post.ReadTimeMinutes.HasValue
            ? $"{post.ReadTimeMinutes} دقائق"
            : "";

        var result = template
            .Replace("{PostTitle}",       post.Title)
            .Replace("{Excerpt}",         post.Excerpt ?? "")
            .Replace("{PrimaryCategory}", primaryCategory)
            .Replace("{SiteName}",        settings.SiteName)
            .Replace("{PublishDate}",     publishDate)
            .Replace("{Year}",            DateTime.UtcNow.Year.ToString())
            .Replace("{ReadTime}",        readTime);

        // Remove any unknown {Token} patterns
        result = Regex.Replace(result, @"\{[^}]+\}", "").Trim();

        return result;
    }

    /// <summary>Strips HTML tags and truncates to maxLength chars.</summary>
    private static string StripHtml(string? html, int maxLength = 160)
    {
        if (string.IsNullOrWhiteSpace(html)) return "";
        var text = Regex.Replace(html, "<[^>]+>", " ");
        text = Regex.Replace(text, @"\s+", " ").Trim();
        return text.Length <= maxLength ? text : text[..maxLength].TrimEnd() + "…";
    }

    private static string ResolveSeoTitle(BlogPost post, BlogSeoSettings settings)
    {
        return post.SeoTitleMode switch
        {
            "Custom" when !string.IsNullOrWhiteSpace(post.SeoTitle)
                => post.SeoTitle,
            "Template"
                => ResolveTemplate(settings.DefaultPostSeoTitleTemplate, post, settings),
            _ // Auto (default) + Custom when empty
                => $"{post.Title} | {settings.SiteName}"
        };
    }

    private static string ResolveSeoDescription(BlogPost post, BlogSeoSettings settings)
    {
        return post.SeoDescriptionMode switch
        {
            "Custom" when !string.IsNullOrWhiteSpace(post.SeoDescription)
                => post.SeoDescription,
            "Template"
                => ResolveTemplate(settings.DefaultPostSeoDescriptionTemplate, post, settings),
            _ // Auto (default) + Custom when empty
                => !string.IsNullOrWhiteSpace(post.Excerpt)
                    ? post.Excerpt
                    : StripHtml(post.Content)
        };
    }

    // Admin maps — include all fields
    private static BlogPostSummaryResponse MapToAdminSummary(BlogPost p) => new()
    {
        Id              = p.Id,
        Title           = p.Title,
        Slug            = p.Slug,
        Excerpt         = p.Excerpt,
        CoverImageUrl   = p.CoverImageUrl,
        CoverImageAlt   = p.CoverImageAlt,
        Tags            = ParseTags(p.Tags),
        Status          = p.Status,
        IsFeatured      = p.IsFeatured,
        ReadTimeMinutes = p.ReadTimeMinutes,
        ViewCount       = p.ViewCount,
        PublishedAt     = p.PublishedAt,
        CreatedByUserId = p.CreatedByUserId,
        CreatedByName   = p.CreatedBy?.FullName ?? string.Empty,
        Categories      = MapCategories(p),
        CreatedAt       = p.CreatedAt,
        UpdatedAt       = p.UpdatedAt
    };

    private static BlogPostDetailResponse MapToAdminDetail(BlogPost p, BlogSeoSettings settings) => new()
    {
        Id                    = p.Id,
        Title                 = p.Title,
        Slug                  = p.Slug,
        Excerpt               = p.Excerpt,
        Content               = p.Content,
        CoverImageUrl         = p.CoverImageUrl,
        CoverImageAlt         = p.CoverImageAlt,
        Tags                  = ParseTags(p.Tags),
        Status                = p.Status,
        IsFeatured            = p.IsFeatured,
        ReadTimeMinutes       = p.ReadTimeMinutes,
        ViewCount             = p.ViewCount,
        SeoTitle              = p.SeoTitle,
        SeoDescription        = p.SeoDescription,
        SeoTitleMode          = p.SeoTitleMode,
        SeoDescriptionMode    = p.SeoDescriptionMode,
        SlugMode              = p.SlugMode,
        SeoMode               = p.SeoMode,
        OgTitle               = p.OgTitle,
        OgDescription         = p.OgDescription,
        ResolvedSeoTitle      = ResolveSeoTitle(p, settings),
        ResolvedSeoDescription= ResolveSeoDescription(p, settings),
        PublishedAt           = p.PublishedAt,
        CreatedByUserId       = p.CreatedByUserId,
        CreatedByName         = p.CreatedBy?.FullName ?? string.Empty,
        UpdatedByUserId       = p.UpdatedByUserId,
        PublishedByUserId     = p.PublishedByUserId,
        IsDeleted             = p.IsDeleted,
        Categories            = MapCategories(p),
        CreatedAt             = p.CreatedAt,
        UpdatedAt             = p.UpdatedAt
    };

    // Public maps — no internal fields, no content in summary
    private static PublicBlogPostSummary MapToPublicSummary(BlogPost p) => new()
    {
        Id              = p.Id,
        Title           = p.Title,
        Slug            = p.Slug,
        Excerpt         = p.Excerpt,
        CoverImageUrl   = p.CoverImageUrl,
        CoverImageAlt   = p.CoverImageAlt,
        Tags            = ParseTags(p.Tags),
        IsFeatured      = p.IsFeatured,
        ReadTimeMinutes = p.ReadTimeMinutes,
        ViewCount       = p.ViewCount,
        PublishedAt     = p.PublishedAt,
        Categories      = MapCategories(p),
        CreatedAt       = p.CreatedAt
    };

    private static PublicBlogPostDetail MapToPublicDetail(BlogPost p) => new()
    {
        Id              = p.Id,
        Title           = p.Title,
        Slug            = p.Slug,
        Excerpt         = p.Excerpt,
        Content         = p.Content,
        CoverImageUrl   = p.CoverImageUrl,
        CoverImageAlt   = p.CoverImageAlt,
        Tags            = ParseTags(p.Tags),
        IsFeatured      = p.IsFeatured,
        ReadTimeMinutes = p.ReadTimeMinutes,
        ViewCount       = p.ViewCount,
        SeoTitle        = p.SeoTitle,
        SeoDescription  = p.SeoDescription,
        SeoMode         = p.SeoMode,
        OgTitle         = p.OgTitle,
        OgDescription   = p.OgDescription,
        PublishedAt     = p.PublishedAt,
        Categories      = MapCategories(p),
        CreatedAt       = p.CreatedAt
    };

    // ── Query helpers ─────────────────────────────────────────────────────────

    private IQueryable<BlogPost> PostsWithIncludes(bool ignoreFilters = false)
    {
        var q = ignoreFilters
            ? _db.Set<BlogPost>().IgnoreQueryFilters()
            : _db.Set<BlogPost>().AsQueryable();

        return q
            .Include(p => p.CreatedBy)
            .Include(p => p.BlogPostCategories)
                .ThenInclude(bpc => bpc.BlogCategory);
    }

    private async Task<BlogSeoSettings> GetOrCreateSettingsAsync(CancellationToken ct = default)
    {
        try
        {
            var s = await _db.Set<BlogSeoSettings>().FindAsync(new object[] { SeoSettingsId }, ct);
            if (s != null) return s;

            s = new BlogSeoSettings { Id = SeoSettingsId };
            _db.Set<BlogSeoSettings>().Add(s);
            await _db.SaveChangesAsync(ct);
            return s;
        }
        catch
        {
            // BlogSeoSettings table may not exist yet on this environment — return safe defaults
            return new BlogSeoSettings { Id = SeoSettingsId };
        }
    }

    // ── Category sync ─────────────────────────────────────────────────────────

    private async Task SyncCategoriesAsync(BlogPost post, List<Guid> categoryIds, CancellationToken ct)
    {
        if (categoryIds.Count > 0)
        {
            var validIds = await _db.Set<BlogCategory>()
                .Where(c => categoryIds.Contains(c.Id))
                .Select(c => c.Id)
                .ToListAsync(ct);

            var invalid = categoryIds.Except(validIds).ToList();
            if (invalid.Count > 0)
                throw new BoiootException(
                    $"تصنيف غير موجود: {string.Join(", ", invalid)}", 404);
        }

        var existing = await _db.Set<BlogPostCategory>()
            .Where(bpc => bpc.BlogPostId == post.Id)
            .ToListAsync(ct);
        _db.Set<BlogPostCategory>().RemoveRange(existing);

        foreach (var catId in categoryIds.Distinct())
        {
            _db.Set<BlogPostCategory>().Add(new BlogPostCategory
            {
                BlogPostId     = post.Id,
                BlogCategoryId = catId
            });
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Admin: Posts
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<PagedResult<BlogPostSummaryResponse>> AdminGetPostsAsync(
        AdminBlogPostQuery query, CancellationToken ct = default)
    {
        query.Page     = Math.Max(1, query.Page);
        query.PageSize = Math.Clamp(query.PageSize, 1, 100);

        var q = PostsWithIncludes(ignoreFilters: true).AsNoTracking();

        if (!string.IsNullOrWhiteSpace(query.Search))
        {
            var term = query.Search.Trim().ToLower();
            q = q.Where(p => p.Title.ToLower().Contains(term));
        }

        if (query.Status.HasValue)
            q = q.Where(p => p.Status == query.Status.Value);

        if (query.CategoryId.HasValue)
            q = q.Where(p => p.BlogPostCategories.Any(bpc => bpc.BlogCategoryId == query.CategoryId.Value));

        q = (query.SortBy.ToLower(), query.SortDir.ToLower()) switch
        {
            ("publishedat", "asc")  => q.OrderBy(p => p.PublishedAt),
            ("publishedat", _)      => q.OrderByDescending(p => p.PublishedAt),
            ("createdat",  "asc")   => q.OrderBy(p => p.CreatedAt),
            _                       => q.OrderByDescending(p => p.CreatedAt)
        };

        var total = await q.CountAsync(ct);
        var items = await q
            .Skip((query.Page - 1) * query.PageSize)
            .Take(query.PageSize)
            .ToListAsync(ct);

        return new PagedResult<BlogPostSummaryResponse>(
            items.Select(MapToAdminSummary).ToList(),
            query.Page, query.PageSize, total);
    }

    public async Task<BlogPostDetailResponse> AdminGetPostByIdAsync(Guid id, CancellationToken ct = default)
    {
        var post = await PostsWithIncludes(ignoreFilters: true)
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        var settings = await GetOrCreateSettingsAsync(ct);
        return MapToAdminDetail(post, settings);
    }

    public async Task<BlogPostDetailResponse> AdminCreatePostAsync(
        Guid createdByUserId, CreateBlogPostRequest request, CancellationToken ct = default)
    {
        BlogPostValidation.EnsureCreateValid(request);

        var slug = await _slugService.UniquePostSlugAsync(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Title : request.Slug,
            excludeId: null, ct);

        var post = new BlogPost
        {
            Title             = request.Title.Trim(),
            Slug              = slug,
            Excerpt           = request.Excerpt?.Trim(),
            Content           = request.Content.Trim(),
            CoverImageUrl     = request.CoverImageUrl?.Trim(),
            CoverImageAlt     = request.CoverImageAlt?.Trim(),
            Tags              = SerializeTags(request.Tags),
            Status            = BlogPostStatus.Draft,
            IsFeatured        = request.IsFeatured,
            SeoTitle          = request.SeoTitle?.Trim(),
            SeoDescription    = request.SeoDescription?.Trim(),
            SeoTitleMode      = request.SeoTitleMode,
            SeoDescriptionMode= request.SeoDescriptionMode,
            SlugMode          = request.SlugMode,
            SeoMode           = request.SeoMode,
            OgTitle           = request.OgTitle?.Trim(),
            OgDescription     = request.OgDescription?.Trim(),
            ReadTimeMinutes   = request.ReadTimeMinutes,
            CreatedByUserId   = createdByUserId,
            ViewCount         = 0
        };

        _db.Set<BlogPost>().Add(post);
        await _db.SaveChangesAsync(ct);

        await SyncCategoriesAsync(post, request.CategoryIds, ct);
        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task<BlogPostDetailResponse> AdminUpdatePostAsync(
        Guid id, Guid updatedByUserId, UpdateBlogPostRequest request, CancellationToken ct = default)
    {
        BlogPostValidation.EnsureUpdateValid(request);

        var post = await _db.Set<BlogPost>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        if (request.Title != null)
            post.Title = request.Title.Trim();

        // Slug is locked once published — only update it for Draft/Archived posts
        if (request.Slug != null)
        {
            if (post.Status == BlogPostStatus.Published)
                throw new BoiootException("لا يمكن تغيير الـ slug بعد نشر المقال", 409);

            var newSlug = await _slugService.UniquePostSlugAsync(request.Slug, excludeId: id, ct);
            post.Slug = newSlug;
        }

        if (request.Excerpt        != null) post.Excerpt       = request.Excerpt.Trim();
        if (request.Content        != null) post.Content       = request.Content.Trim();
        if (request.CoverImageUrl  != null) post.CoverImageUrl = request.CoverImageUrl.Trim();
        if (request.CoverImageAlt  != null) post.CoverImageAlt = request.CoverImageAlt.Trim();
        if (request.Tags           != null) post.Tags          = SerializeTags(request.Tags);
        if (request.IsFeatured     != null) post.IsFeatured    = request.IsFeatured.Value;
        if (request.SeoTitle           != null) post.SeoTitle           = request.SeoTitle.Trim();
        if (request.SeoDescription     != null) post.SeoDescription     = request.SeoDescription.Trim();
        if (request.SeoTitleMode       != null) post.SeoTitleMode       = request.SeoTitleMode;
        if (request.SeoDescriptionMode != null) post.SeoDescriptionMode = request.SeoDescriptionMode;
        if (request.SlugMode           != null) post.SlugMode           = request.SlugMode;
        if (request.SeoMode            != null) post.SeoMode            = request.SeoMode;
        if (request.OgTitle            != null) post.OgTitle            = request.OgTitle.Trim();
        if (request.OgDescription      != null) post.OgDescription      = request.OgDescription.Trim();
        if (request.ReadTimeMinutes    != null) post.ReadTimeMinutes    = request.ReadTimeMinutes;

        post.UpdatedByUserId = updatedByUserId;

        if (request.CategoryIds != null)
            await SyncCategoriesAsync(post, request.CategoryIds, ct);

        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task AdminDeletePostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        post.IsDeleted = true;
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Blog post {PostId} ({Slug}) soft-deleted", post.Id, post.Slug);
    }

    public async Task<BlogPostDetailResponse> AdminPublishPostAsync(
        Guid id, Guid publishedByUserId, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        BlogPostValidation.EnsurePublishReady(post);

        post.Status            = BlogPostStatus.Published;
        post.PublishedAt     ??= DateTime.UtcNow;
        post.PublishedByUserId = publishedByUserId;

        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task<BlogPostDetailResponse> AdminUnpublishPostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        post.Status = BlogPostStatus.Draft;
        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task<BlogPostDetailResponse> AdminArchivePostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .IgnoreQueryFilters()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        if (post.Status == BlogPostStatus.Archived)
            throw new BoiootException("المقال مؤرشف بالفعل", 409);

        post.Status = BlogPostStatus.Archived;
        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Admin: Blog SEO Settings
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<BlogSeoSettingsDto> GetBlogSeoSettingsAsync(CancellationToken ct = default)
    {
        var s = await GetOrCreateSettingsAsync(ct);
        return MapSeoDto(s);
    }

    public async Task<BlogSeoSettingsDto> UpdateBlogSeoSettingsAsync(
        UpdateBlogSeoSettingsRequest request, CancellationToken ct = default)
    {
        var s = await GetOrCreateSettingsAsync(ct);

        if (request.SiteName                          != null) s.SiteName                           = request.SiteName.Trim();
        if (request.DefaultPostSeoTitleTemplate       != null) s.DefaultPostSeoTitleTemplate        = request.DefaultPostSeoTitleTemplate.Trim();
        if (request.DefaultPostSeoDescriptionTemplate != null) s.DefaultPostSeoDescriptionTemplate  = request.DefaultPostSeoDescriptionTemplate.Trim();
        if (request.DefaultBlogListSeoTitle           != null) s.DefaultBlogListSeoTitle            = request.DefaultBlogListSeoTitle.Trim();
        if (request.DefaultBlogListSeoDescription     != null) s.DefaultBlogListSeoDescription      = request.DefaultBlogListSeoDescription.Trim();

        await _db.SaveChangesAsync(ct);

        return MapSeoDto(s);
    }

    private static BlogSeoSettingsDto MapSeoDto(BlogSeoSettings s) => new()
    {
        SiteName                          = s.SiteName,
        DefaultPostSeoTitleTemplate       = s.DefaultPostSeoTitleTemplate,
        DefaultPostSeoDescriptionTemplate = s.DefaultPostSeoDescriptionTemplate,
        DefaultBlogListSeoTitle           = s.DefaultBlogListSeoTitle,
        DefaultBlogListSeoDescription     = s.DefaultBlogListSeoDescription,
        DefaultOgTitleTemplate            = s.DefaultOgTitleTemplate,
        DefaultOgDescriptionTemplate      = s.DefaultOgDescriptionTemplate,
    };

    public async Task<BlogSeoSettingsDto> PublicGetSeoSettingsAsync(CancellationToken ct = default)
    {
        var s = await GetOrCreateSettingsAsync(ct);
        return MapSeoDto(s);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Admin: Categories
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<List<BlogCategoryResponse>> AdminGetCategoriesAsync(CancellationToken ct = default)
    {
        var cats = await _db.Set<BlogCategory>()
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync(ct);

        var counts = await _db.Set<BlogPostCategory>()
            .IgnoreQueryFilters()
            .GroupBy(bpc => bpc.BlogCategoryId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var countMap = counts.ToDictionary(x => x.Id, x => x.Count);

        return cats.Select(c => MapCategory(c, countMap.GetValueOrDefault(c.Id, 0))).ToList();
    }

    public async Task<BlogCategoryResponse> AdminGetCategoryByIdAsync(Guid id, CancellationToken ct = default)
    {
        var cat = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        var count = await _db.Set<BlogPostCategory>()
            .IgnoreQueryFilters()
            .CountAsync(bpc => bpc.BlogCategoryId == id, ct);

        return MapCategory(cat, count);
    }

    public async Task<BlogCategoryResponse> AdminCreateCategoryAsync(
        CreateBlogCategoryRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BoiootException("اسم التصنيف مطلوب", 400);

        var slug = await _slugService.UniqueCategorySlugAsync(
            string.IsNullOrWhiteSpace(request.Slug) ? request.Name : request.Slug,
            excludeId: null, ct);

        var cat = new BlogCategory
        {
            Name        = request.Name.Trim(),
            Slug        = slug,
            Description = request.Description?.Trim(),
            IsActive    = request.IsActive,
            SortOrder   = request.SortOrder
        };

        _db.Set<BlogCategory>().Add(cat);
        await _db.SaveChangesAsync(ct);

        return MapCategory(cat, 0);
    }

    public async Task<BlogCategoryResponse> AdminUpdateCategoryAsync(
        Guid id, UpdateBlogCategoryRequest request, CancellationToken ct = default)
    {
        var cat = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        if (request.Name != null)
        {
            if (string.IsNullOrWhiteSpace(request.Name))
                throw new BoiootException("اسم التصنيف لا يمكن أن يكون فارغاً", 400);
            cat.Name = request.Name.Trim();
        }

        if (request.Slug != null)
        {
            var newSlug = await _slugService.UniqueCategorySlugAsync(request.Slug, excludeId: id, ct);
            cat.Slug = newSlug;
        }

        if (request.Description != null) cat.Description = request.Description.Trim();
        if (request.IsActive    != null) cat.IsActive    = request.IsActive.Value;
        if (request.SortOrder   != null) cat.SortOrder   = request.SortOrder.Value;

        await _db.SaveChangesAsync(ct);

        var count = await _db.Set<BlogPostCategory>()
            .IgnoreQueryFilters()
            .CountAsync(bpc => bpc.BlogCategoryId == id, ct);

        return MapCategory(cat, count);
    }

    public async Task AdminDeleteCategoryAsync(Guid id, CancellationToken ct = default)
    {
        var cat = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        var hasPublishedPosts = await _db.Set<BlogPostCategory>()
            .AnyAsync(bpc =>
                bpc.BlogCategoryId == id &&
                bpc.BlogPost.Status == BlogPostStatus.Published, ct);

        if (hasPublishedPosts)
            throw new BoiootException(
                "لا يمكن حذف التصنيف لأنه مرتبط بمقالات منشورة. قم بأرشفة المقالات أولاً", 409);

        _db.Set<BlogCategory>().Remove(cat);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Blog category {CategoryId} ({Slug}) deleted", cat.Id, cat.Slug);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Public: Posts
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<PagedResult<PublicBlogPostSummary>> PublicGetPostsAsync(
        string? categorySlug, bool? isFeatured, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var q = PostsWithIncludes()
            .AsNoTracking()
            .Where(p => p.Status == BlogPostStatus.Published);

        if (!string.IsNullOrWhiteSpace(categorySlug))
            q = q.Where(p => p.BlogPostCategories.Any(bpc => bpc.BlogCategory.Slug == categorySlug));

        if (isFeatured.HasValue)
            q = q.Where(p => p.IsFeatured == isFeatured.Value);

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(p => p.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PublicBlogPostSummary>(
            items.Select(MapToPublicSummary).ToList(), page, pageSize, total);
    }

    public async Task<PublicBlogPostDetail> PublicGetPostBySlugAsync(string slug, CancellationToken ct = default)
    {
        var post = await PostsWithIncludes()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.Status == BlogPostStatus.Published, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        return MapToPublicDetail(post);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Public: Categories
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<List<BlogCategoryResponse>> PublicGetCategoriesAsync(CancellationToken ct = default)
    {
        var cats = await _db.Set<BlogCategory>()
            .Where(c => c.IsActive)
            .OrderBy(c => c.SortOrder).ThenBy(c => c.Name)
            .ToListAsync(ct);

        var counts = await _db.Set<BlogPostCategory>()
            .Where(bpc => bpc.BlogPost.Status == BlogPostStatus.Published)
            .GroupBy(bpc => bpc.BlogCategoryId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var countMap = counts.ToDictionary(x => x.Id, x => x.Count);

        return cats.Select(c => MapCategory(c, countMap.GetValueOrDefault(c.Id, 0))).ToList();
    }

    public async Task<PagedResult<PublicBlogPostSummary>> PublicGetPostsByCategorySlugAsync(
        string categorySlug, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var cat = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Slug == categorySlug && c.IsActive, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        var q = PostsWithIncludes()
            .AsNoTracking()
            .Where(p => p.Status == BlogPostStatus.Published &&
                        p.BlogPostCategories.Any(bpc => bpc.BlogCategoryId == cat.Id));

        var total = await q.CountAsync(ct);
        var items = await q
            .OrderByDescending(p => p.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<PublicBlogPostSummary>(
            items.Select(MapToPublicSummary).ToList(), page, pageSize, total);
    }

    // ═════════════════════════════════════════════════════════════════════════
    // Public: Related Posts
    // ═════════════════════════════════════════════════════════════════════════

    public async Task<List<PublicBlogPostSummary>> PublicGetRelatedPostsAsync(
        string slug, int count, CancellationToken ct = default)
    {
        count = Math.Clamp(count, 1, 10);

        // Load the current post (lightweight — we only need id, categories, tags)
        var current = await _db.Set<BlogPost>()
            .AsNoTracking()
            .Include(p => p.BlogPostCategories)
            .FirstOrDefaultAsync(p => p.Slug == slug && p.Status == BlogPostStatus.Published, ct);

        if (current is null)
            return new List<PublicBlogPostSummary>();

        var currentId      = current.Id;
        var categoryIds    = current.BlogPostCategories.Select(bpc => bpc.BlogCategoryId).ToList();
        var currentTags    = ParseTags(current.Tags);

        var result = new List<PublicBlogPostSummary>();
        var seenIds = new HashSet<Guid> { currentId };

        // ── 1. Same category ─────────────────────────────────────────────────
        if (categoryIds.Count > 0 && result.Count < count)
        {
            var needed = count - result.Count;
            var byCategory = await PostsWithIncludes()
                .AsNoTracking()
                .Where(p => p.Status == BlogPostStatus.Published
                         && p.Id != currentId
                         && p.BlogPostCategories.Any(bpc => categoryIds.Contains(bpc.BlogCategoryId)))
                .OrderByDescending(p => p.PublishedAt)
                .Take(needed)
                .ToListAsync(ct);

            foreach (var p in byCategory)
            {
                if (seenIds.Add(p.Id))
                    result.Add(MapToPublicSummary(p));
            }
        }

        // ── 2. Same tags ─────────────────────────────────────────────────────
        if (currentTags.Count > 0 && result.Count < count)
        {
            var needed = count - result.Count;
            var allPublished = await PostsWithIncludes()
                .AsNoTracking()
                .Where(p => p.Status == BlogPostStatus.Published && !seenIds.Contains(p.Id))
                .OrderByDescending(p => p.PublishedAt)
                .Take(50) // load a pool then filter in memory
                .ToListAsync(ct);

            foreach (var p in allPublished)
            {
                if (result.Count >= count) break;
                var tags = ParseTags(p.Tags);
                if (tags.Any(t => currentTags.Contains(t)) && seenIds.Add(p.Id))
                    result.Add(MapToPublicSummary(p));
            }
        }

        // ── 3. Latest published ───────────────────────────────────────────────
        if (result.Count < count)
        {
            var needed = count - result.Count;
            var latest = await PostsWithIncludes()
                .AsNoTracking()
                .Where(p => p.Status == BlogPostStatus.Published && !seenIds.Contains(p.Id))
                .OrderByDescending(p => p.PublishedAt)
                .Take(needed)
                .ToListAsync(ct);

            foreach (var p in latest)
                result.Add(MapToPublicSummary(p));
        }

        return result;
    }
}
