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

    private static BlogPostDetailResponse MapToAdminDetail(BlogPost p) => new()
    {
        Id                = p.Id,
        Title             = p.Title,
        Slug              = p.Slug,
        Excerpt           = p.Excerpt,
        Content           = p.Content,
        CoverImageUrl     = p.CoverImageUrl,
        CoverImageAlt     = p.CoverImageAlt,
        Tags              = ParseTags(p.Tags),
        Status            = p.Status,
        IsFeatured        = p.IsFeatured,
        ReadTimeMinutes   = p.ReadTimeMinutes,
        ViewCount         = p.ViewCount,
        SeoTitle          = p.SeoTitle,
        SeoDescription    = p.SeoDescription,
        PublishedAt       = p.PublishedAt,
        CreatedByUserId   = p.CreatedByUserId,
        CreatedByName     = p.CreatedBy?.FullName ?? string.Empty,
        UpdatedByUserId   = p.UpdatedByUserId,
        PublishedByUserId = p.PublishedByUserId,
        IsDeleted         = p.IsDeleted,
        Categories        = MapCategories(p),
        CreatedAt         = p.CreatedAt,
        UpdatedAt         = p.UpdatedAt
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

        return MapToAdminDetail(post);
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
            Title           = request.Title.Trim(),
            Slug            = slug,
            Excerpt         = request.Excerpt?.Trim(),
            Content         = request.Content.Trim(),
            CoverImageUrl   = request.CoverImageUrl?.Trim(),
            CoverImageAlt   = request.CoverImageAlt?.Trim(),
            Tags            = SerializeTags(request.Tags),
            Status          = BlogPostStatus.Draft,
            IsFeatured      = request.IsFeatured,
            SeoTitle        = request.SeoTitle?.Trim(),
            SeoDescription  = request.SeoDescription?.Trim(),
            ReadTimeMinutes = request.ReadTimeMinutes,
            CreatedByUserId = createdByUserId,
            ViewCount       = 0
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
        if (request.SeoTitle       != null) post.SeoTitle      = request.SeoTitle.Trim();
        if (request.SeoDescription != null) post.SeoDescription = request.SeoDescription.Trim();
        if (request.ReadTimeMinutes != null) post.ReadTimeMinutes = request.ReadTimeMinutes;

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

        // Runs all publish-readiness checks (including archived check)
        BlogPostValidation.EnsurePublishReady(post);

        post.Status            = BlogPostStatus.Published;
        post.PublishedAt     ??= DateTime.UtcNow;   // Set only on first publish
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

        // Query filter (HasQueryFilter) already excludes IsDeleted=true
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
        // Query filter excludes IsDeleted=true automatically
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
}
