using Boioot.Application.Exceptions;
using Boioot.Application.Features.Blog.DTOs;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Blog;

public class BlogService : IBlogService
{
    private readonly BoiootDbContext _db;
    private readonly ILogger<BlogService> _logger;

    public BlogService(BoiootDbContext db, ILogger<BlogService> logger)
    {
        _db = db;
        _logger = logger;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private static string GenerateSlug(string title)
    {
        var slug = title.ToLowerInvariant()
            .Trim()
            .Replace(" ", "-")
            .Replace("_", "-");

        // Remove characters that are not alphanumeric, Arabic, or hyphens
        var chars = slug.ToCharArray()
            .Where(c => char.IsLetterOrDigit(c) || c == '-')
            .ToArray();

        slug = new string(chars);

        // Collapse multiple hyphens
        while (slug.Contains("--"))
            slug = slug.Replace("--", "-");

        return slug.Trim('-');
    }

    private static BlogPostSummaryResponse MapToSummary(BlogPost p) => new()
    {
        Id           = p.Id,
        Title        = p.Title,
        Slug         = p.Slug,
        Excerpt      = p.Excerpt,
        CoverImageUrl= p.CoverImageUrl,
        Status       = p.Status,
        AuthorId     = p.AuthorId,
        AuthorName   = p.Author?.FullName ?? string.Empty,
        CategoryId   = p.CategoryId,
        CategoryName = p.Category?.Name ?? string.Empty,
        CategorySlug = p.Category?.Slug ?? string.Empty,
        PublishedAt  = p.PublishedAt,
        ReadingTime  = p.ReadingTime,
        IsFeatured   = p.IsFeatured,
        CreatedAt    = p.CreatedAt,
        UpdatedAt    = p.UpdatedAt
    };

    private static BlogPostDetailResponse MapToDetail(BlogPost p) => new()
    {
        Id              = p.Id,
        Title           = p.Title,
        Slug            = p.Slug,
        Excerpt         = p.Excerpt,
        Content         = p.Content,
        CoverImageUrl   = p.CoverImageUrl,
        Status          = p.Status,
        AuthorId        = p.AuthorId,
        AuthorName      = p.Author?.FullName ?? string.Empty,
        CategoryId      = p.CategoryId,
        CategoryName    = p.Category?.Name ?? string.Empty,
        CategorySlug    = p.Category?.Slug ?? string.Empty,
        PublishedAt     = p.PublishedAt,
        MetaTitle       = p.MetaTitle,
        MetaDescription = p.MetaDescription,
        ReadingTime     = p.ReadingTime,
        IsFeatured      = p.IsFeatured,
        CreatedAt       = p.CreatedAt,
        UpdatedAt       = p.UpdatedAt
    };

    private static BlogCategoryResponse MapCategory(BlogCategory c, int postCount = 0) => new()
    {
        Id           = c.Id,
        Name         = c.Name,
        Slug         = c.Slug,
        Description  = c.Description,
        IsActive     = c.IsActive,
        DisplayOrder = c.DisplayOrder,
        PostCount    = postCount,
        CreatedAt    = c.CreatedAt,
        UpdatedAt    = c.UpdatedAt
    };

    private IQueryable<BlogPost> PostsWithIncludes() =>
        _db.Set<BlogPost>()
            .Include(p => p.Author)
            .Include(p => p.Category);

    // ── Admin: Posts ──────────────────────────────────────────────────────────

    public async Task<List<BlogPostSummaryResponse>> AdminGetPostsAsync(
        BlogPostStatus? status, Guid? categoryId, CancellationToken ct = default)
    {
        var q = PostsWithIncludes().AsQueryable();

        if (status.HasValue)
            q = q.Where(p => p.Status == status.Value);

        if (categoryId.HasValue)
            q = q.Where(p => p.CategoryId == categoryId.Value);

        return await q
            .OrderByDescending(p => p.CreatedAt)
            .Select(p => MapToSummary(p))
            .ToListAsync(ct);
    }

    public async Task<BlogPostDetailResponse> AdminGetPostByIdAsync(Guid id, CancellationToken ct = default)
    {
        var post = await PostsWithIncludes()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        return MapToDetail(post);
    }

    public async Task<BlogPostDetailResponse> AdminCreatePostAsync(
        Guid authorId, CreateBlogPostRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Title))
            throw new BoiootException("عنوان المقال مطلوب", 400);

        if (string.IsNullOrWhiteSpace(request.Content))
            throw new BoiootException("محتوى المقال مطلوب", 400);

        if (request.CategoryId == Guid.Empty)
            throw new BoiootException("التصنيف مطلوب", 400);

        // Validate category exists
        var categoryExists = await _db.Set<BlogCategory>()
            .AnyAsync(c => c.Id == request.CategoryId, ct);
        if (!categoryExists)
            throw new BoiootException("التصنيف غير موجود", 404);

        // Determine slug
        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Title)
            : GenerateSlug(request.Slug);

        if (string.IsNullOrEmpty(slug))
            throw new BoiootException("تعذّر إنشاء slug من العنوان المُدخَل", 400);

        // Slug uniqueness check
        var slugTaken = await _db.Set<BlogPost>()
            .AnyAsync(p => p.Slug == slug, ct);
        if (slugTaken)
            throw new BoiootException($"الـ slug '{slug}' مستخدم بالفعل", 409);

        var post = new BlogPost
        {
            Title           = request.Title.Trim(),
            Slug            = slug,
            Excerpt         = request.Excerpt?.Trim(),
            Content         = request.Content.Trim(),
            CoverImageUrl   = request.CoverImageUrl?.Trim(),
            Status          = BlogPostStatus.Draft,
            AuthorId        = authorId,
            CategoryId      = request.CategoryId,
            MetaTitle       = request.MetaTitle?.Trim(),
            MetaDescription = request.MetaDescription?.Trim(),
            ReadingTime     = Math.Max(0, request.ReadingTime),
            IsFeatured      = request.IsFeatured
        };

        _db.Set<BlogPost>().Add(post);
        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task<BlogPostDetailResponse> AdminUpdatePostAsync(
        Guid id, UpdateBlogPostRequest request, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        if (request.Title != null)
            post.Title = request.Title.Trim();

        if (request.Slug != null)
        {
            var newSlug = GenerateSlug(request.Slug);
            if (string.IsNullOrEmpty(newSlug))
                throw new BoiootException("الـ slug المُدخَل غير صالح", 400);

            var slugTaken = await _db.Set<BlogPost>()
                .AnyAsync(p => p.Slug == newSlug && p.Id != id, ct);
            if (slugTaken)
                throw new BoiootException($"الـ slug '{newSlug}' مستخدم بالفعل", 409);

            post.Slug = newSlug;
        }

        if (request.Excerpt != null)
            post.Excerpt = request.Excerpt.Trim();

        if (request.Content != null)
            post.Content = request.Content.Trim();

        if (request.CoverImageUrl != null)
            post.CoverImageUrl = request.CoverImageUrl.Trim();

        if (request.CategoryId.HasValue)
        {
            var categoryExists = await _db.Set<BlogCategory>()
                .AnyAsync(c => c.Id == request.CategoryId.Value, ct);
            if (!categoryExists)
                throw new BoiootException("التصنيف غير موجود", 404);

            post.CategoryId = request.CategoryId.Value;
        }

        if (request.MetaTitle != null)
            post.MetaTitle = request.MetaTitle.Trim();

        if (request.MetaDescription != null)
            post.MetaDescription = request.MetaDescription.Trim();

        if (request.ReadingTime.HasValue)
            post.ReadingTime = Math.Max(0, request.ReadingTime.Value);

        if (request.IsFeatured.HasValue)
            post.IsFeatured = request.IsFeatured.Value;

        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task AdminDeletePostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        _db.Set<BlogPost>().Remove(post);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Blog post {PostId} ({Slug}) deleted", post.Id, post.Slug);
    }

    public async Task<BlogPostDetailResponse> AdminPublishPostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        if (post.Status == BlogPostStatus.Published)
            throw new BoiootException("المقال منشور بالفعل", 409);

        post.Status = BlogPostStatus.Published;
        post.PublishedAt ??= DateTime.UtcNow;

        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task<BlogPostDetailResponse> AdminUnpublishPostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        post.Status = BlogPostStatus.Draft;

        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    public async Task<BlogPostDetailResponse> AdminArchivePostAsync(Guid id, CancellationToken ct = default)
    {
        var post = await _db.Set<BlogPost>()
            .FirstOrDefaultAsync(p => p.Id == id, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        if (post.Status == BlogPostStatus.Archived)
            throw new BoiootException("المقال مؤرشف بالفعل", 409);

        post.Status = BlogPostStatus.Archived;

        await _db.SaveChangesAsync(ct);

        return await AdminGetPostByIdAsync(post.Id, ct);
    }

    // ── Admin: Categories ─────────────────────────────────────────────────────

    public async Task<List<BlogCategoryResponse>> AdminGetCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await _db.Set<BlogCategory>()
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        var postCounts = await _db.Set<BlogPost>()
            .GroupBy(p => p.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var countMap = postCounts.ToDictionary(x => x.CategoryId, x => x.Count);

        return categories
            .Select(c => MapCategory(c, countMap.GetValueOrDefault(c.Id, 0)))
            .ToList();
    }

    public async Task<BlogCategoryResponse> AdminGetCategoryByIdAsync(Guid id, CancellationToken ct = default)
    {
        var category = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        var postCount = await _db.Set<BlogPost>()
            .CountAsync(p => p.CategoryId == id, ct);

        return MapCategory(category, postCount);
    }

    public async Task<BlogCategoryResponse> AdminCreateCategoryAsync(
        CreateBlogCategoryRequest request, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Name))
            throw new BoiootException("اسم التصنيف مطلوب", 400);

        var slug = string.IsNullOrWhiteSpace(request.Slug)
            ? GenerateSlug(request.Name)
            : GenerateSlug(request.Slug);

        if (string.IsNullOrEmpty(slug))
            throw new BoiootException("تعذّر إنشاء slug من الاسم المُدخَل", 400);

        var slugTaken = await _db.Set<BlogCategory>()
            .AnyAsync(c => c.Slug == slug, ct);
        if (slugTaken)
            throw new BoiootException($"الـ slug '{slug}' مستخدم بالفعل", 409);

        var category = new BlogCategory
        {
            Name         = request.Name.Trim(),
            Slug         = slug,
            Description  = request.Description?.Trim(),
            IsActive     = request.IsActive,
            DisplayOrder = request.DisplayOrder
        };

        _db.Set<BlogCategory>().Add(category);
        await _db.SaveChangesAsync(ct);

        return MapCategory(category, 0);
    }

    public async Task<BlogCategoryResponse> AdminUpdateCategoryAsync(
        Guid id, UpdateBlogCategoryRequest request, CancellationToken ct = default)
    {
        var category = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        if (request.Name != null)
            category.Name = request.Name.Trim();

        if (request.Slug != null)
        {
            var newSlug = GenerateSlug(request.Slug);
            if (string.IsNullOrEmpty(newSlug))
                throw new BoiootException("الـ slug المُدخَل غير صالح", 400);

            var slugTaken = await _db.Set<BlogCategory>()
                .AnyAsync(c => c.Slug == newSlug && c.Id != id, ct);
            if (slugTaken)
                throw new BoiootException($"الـ slug '{newSlug}' مستخدم بالفعل", 409);

            category.Slug = newSlug;
        }

        if (request.Description != null)
            category.Description = request.Description.Trim();

        if (request.IsActive.HasValue)
            category.IsActive = request.IsActive.Value;

        if (request.DisplayOrder.HasValue)
            category.DisplayOrder = request.DisplayOrder.Value;

        await _db.SaveChangesAsync(ct);

        var postCount = await _db.Set<BlogPost>()
            .CountAsync(p => p.CategoryId == id, ct);

        return MapCategory(category, postCount);
    }

    public async Task AdminDeleteCategoryAsync(Guid id, CancellationToken ct = default)
    {
        var category = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Id == id, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        var hasPostsInCategory = await _db.Set<BlogPost>()
            .AnyAsync(p => p.CategoryId == id, ct);
        if (hasPostsInCategory)
            throw new BoiootException("لا يمكن حذف التصنيف لأنه يحتوي على مقالات. انقل المقالات أولاً أو احذفها", 409);

        _db.Set<BlogCategory>().Remove(category);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("Blog category {CategoryId} ({Slug}) deleted", category.Id, category.Slug);
    }

    // ── Public: Posts ─────────────────────────────────────────────────────────

    public async Task<List<BlogPostSummaryResponse>> PublicGetPostsAsync(
        string? categorySlug, string? search, int page, int pageSize, CancellationToken ct = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(1, page);

        var q = PostsWithIncludes()
            .Where(p => p.Status == BlogPostStatus.Published);

        if (!string.IsNullOrWhiteSpace(categorySlug))
            q = q.Where(p => p.Category.Slug == categorySlug);

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            q = q.Where(p =>
                p.Title.ToLower().Contains(term) ||
                (p.Excerpt != null && p.Excerpt.ToLower().Contains(term)));
        }

        return await q
            .OrderByDescending(p => p.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => MapToSummary(p))
            .ToListAsync(ct);
    }

    public async Task<BlogPostDetailResponse> PublicGetPostBySlugAsync(string slug, CancellationToken ct = default)
    {
        var post = await PostsWithIncludes()
            .FirstOrDefaultAsync(p => p.Slug == slug && p.Status == BlogPostStatus.Published, ct)
            ?? throw new BoiootException("المقال غير موجود", 404);

        return MapToDetail(post);
    }

    // ── Public: Categories ────────────────────────────────────────────────────

    public async Task<List<BlogCategoryResponse>> PublicGetCategoriesAsync(CancellationToken ct = default)
    {
        var categories = await _db.Set<BlogCategory>()
            .Where(c => c.IsActive)
            .OrderBy(c => c.DisplayOrder)
            .ThenBy(c => c.Name)
            .ToListAsync(ct);

        var postCounts = await _db.Set<BlogPost>()
            .Where(p => p.Status == BlogPostStatus.Published)
            .GroupBy(p => p.CategoryId)
            .Select(g => new { CategoryId = g.Key, Count = g.Count() })
            .ToListAsync(ct);

        var countMap = postCounts.ToDictionary(x => x.CategoryId, x => x.Count);

        return categories
            .Select(c => MapCategory(c, countMap.GetValueOrDefault(c.Id, 0)))
            .ToList();
    }

    public async Task<List<BlogPostSummaryResponse>> PublicGetPostsByCategorySlugAsync(
        string categorySlug, int page, int pageSize, CancellationToken ct = default)
    {
        pageSize = Math.Clamp(pageSize, 1, 50);
        page = Math.Max(1, page);

        var category = await _db.Set<BlogCategory>()
            .FirstOrDefaultAsync(c => c.Slug == categorySlug && c.IsActive, ct)
            ?? throw new BoiootException("التصنيف غير موجود", 404);

        return await PostsWithIncludes()
            .Where(p => p.CategoryId == category.Id && p.Status == BlogPostStatus.Published)
            .OrderByDescending(p => p.PublishedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(p => MapToSummary(p))
            .ToListAsync(ct);
    }
}
