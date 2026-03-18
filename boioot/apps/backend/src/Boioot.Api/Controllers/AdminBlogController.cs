using Boioot.Application.Features.Blog.DTOs;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/blog")]
[Authorize(Policy = "AdminOnly")]
public class AdminBlogController : BaseController
{
    private readonly IBlogService _blog;

    public AdminBlogController(IBlogService blog)
    {
        _blog = blog;
    }

    // ── Posts ─────────────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/admin/blog/posts
    /// Paginated list with optional search, status filter, category filter, sort.
    /// sortBy: createdAt (default) | publishedAt
    /// sortDir: desc (default) | asc
    /// </summary>
    [HttpGet("posts")]
    public async Task<IActionResult> GetPosts(
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 20,
        [FromQuery] string? search = null,
        [FromQuery] BlogPostStatus? status = null,
        [FromQuery] Guid? categoryId = null,
        [FromQuery] string sortBy = "createdAt",
        [FromQuery] string sortDir = "desc",
        CancellationToken ct = default)
    {
        var query = new AdminBlogPostQuery
        {
            Page       = page,
            PageSize   = pageSize,
            Search     = search,
            Status     = status,
            CategoryId = categoryId,
            SortBy     = sortBy,
            SortDir    = sortDir
        };

        var result = await _blog.AdminGetPostsAsync(query, ct);
        return Ok(result);
    }

    /// <summary>GET /api/admin/blog/posts/{id}</summary>
    [HttpGet("posts/{id:guid}")]
    public async Task<IActionResult> GetPost(Guid id, CancellationToken ct)
    {
        var result = await _blog.AdminGetPostByIdAsync(id, ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/blog/posts — create draft</summary>
    [HttpPost("posts")]
    public async Task<IActionResult> CreatePost(
        [FromBody] CreateBlogPostRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminCreatePostAsync(GetUserId(), request, ct);
        return Created($"/api/admin/blog/posts/{result.Id}", result);
    }

    /// <summary>PUT /api/admin/blog/posts/{id} — update; slug is locked once published</summary>
    [HttpPut("posts/{id:guid}")]
    public async Task<IActionResult> UpdatePost(
        Guid id, [FromBody] UpdateBlogPostRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminUpdatePostAsync(id, GetUserId(), request, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/admin/blog/posts/{id} — soft delete</summary>
    [HttpDelete("posts/{id:guid}")]
    public async Task<IActionResult> DeletePost(Guid id, CancellationToken ct)
    {
        await _blog.AdminDeletePostAsync(id, ct);
        return NoContent();
    }

    /// <summary>POST /api/admin/blog/posts/{id}/publish — validates Title+Slug+Content</summary>
    [HttpPost("posts/{id:guid}/publish")]
    public async Task<IActionResult> PublishPost(Guid id, CancellationToken ct)
    {
        var result = await _blog.AdminPublishPostAsync(id, GetUserId(), ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/blog/posts/{id}/unpublish — reverts to Draft</summary>
    [HttpPost("posts/{id:guid}/unpublish")]
    public async Task<IActionResult> UnpublishPost(Guid id, CancellationToken ct)
    {
        var result = await _blog.AdminUnpublishPostAsync(id, ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/blog/posts/{id}/archive</summary>
    [HttpPost("posts/{id:guid}/archive")]
    public async Task<IActionResult> ArchivePost(Guid id, CancellationToken ct)
    {
        var result = await _blog.AdminArchivePostAsync(id, ct);
        return Ok(result);
    }

    // ── Categories ────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/blog/categories — all categories with total post counts</summary>
    [HttpGet("categories")]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
    {
        var result = await _blog.AdminGetCategoriesAsync(ct);
        return Ok(result);
    }

    /// <summary>GET /api/admin/blog/categories/{id}</summary>
    [HttpGet("categories/{id:guid}")]
    public async Task<IActionResult> GetCategory(Guid id, CancellationToken ct)
    {
        var result = await _blog.AdminGetCategoryByIdAsync(id, ct);
        return Ok(result);
    }

    /// <summary>POST /api/admin/blog/categories</summary>
    [HttpPost("categories")]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateBlogCategoryRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminCreateCategoryAsync(request, ct);
        return Created($"/api/admin/blog/categories/{result.Id}", result);
    }

    /// <summary>PUT /api/admin/blog/categories/{id}</summary>
    [HttpPut("categories/{id:guid}")]
    public async Task<IActionResult> UpdateCategory(
        Guid id, [FromBody] UpdateBlogCategoryRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminUpdateCategoryAsync(id, request, ct);
        return Ok(result);
    }

    /// <summary>DELETE /api/admin/blog/categories/{id} — blocked if published posts exist</summary>
    [HttpDelete("categories/{id:guid}")]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        await _blog.AdminDeleteCategoryAsync(id, ct);
        return NoContent();
    }
}
