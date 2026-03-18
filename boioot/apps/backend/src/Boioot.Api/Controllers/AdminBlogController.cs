using Boioot.Application.Features.Blog.DTOs;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/blog")]
[Authorize(Policy = "AdminOnly")]   // base-level: all admin-blog endpoints require auth + Admin role
public class AdminBlogController : BaseController
{
    private readonly IBlogService _blog;

    public AdminBlogController(IBlogService blog)
    {
        _blog = blog;
    }

    // ── Posts: Read ───────────────────────────────────────────────────────────

    /// <summary>
    /// GET /api/admin/blog/posts
    /// Paginated list — supports search (by title), status filter, categoryId filter,
    /// sortBy (createdAt|publishedAt) and sortDir (asc|desc).
    /// </summary>
    [HttpGet("posts")]
    [Authorize(Policy = BlogPermissions.EditPost)]
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
        return Ok(await _blog.AdminGetPostsAsync(query, ct));
    }

    /// <summary>GET /api/admin/blog/posts/{id} — full post including content + categories</summary>
    [HttpGet("posts/{id:guid}")]
    [Authorize(Policy = BlogPermissions.EditPost)]
    public async Task<IActionResult> GetPost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminGetPostByIdAsync(id, ct));

    // ── Posts: Write ──────────────────────────────────────────────────────────

    /// <summary>
    /// POST /api/admin/blog/posts — create draft.
    /// Slug is auto-generated from title if omitted; collisions resolved with -1, -2 suffix.
    /// </summary>
    [HttpPost("posts")]
    [Authorize(Policy = BlogPermissions.CreatePost)]
    public async Task<IActionResult> CreatePost(
        [FromBody] CreateBlogPostRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminCreatePostAsync(GetUserId(), request, ct);
        return Created($"/api/admin/blog/posts/{result.Id}", result);
    }

    /// <summary>
    /// PUT /api/admin/blog/posts/{id} — update post fields.
    /// Slug is locked once the post is Published.
    /// </summary>
    [HttpPut("posts/{id:guid}")]
    [Authorize(Policy = BlogPermissions.EditPost)]
    public async Task<IActionResult> UpdatePost(
        Guid id, [FromBody] UpdateBlogPostRequest request, CancellationToken ct)
        => Ok(await _blog.AdminUpdatePostAsync(id, GetUserId(), request, ct));

    /// <summary>DELETE /api/admin/blog/posts/{id} — soft delete (IsDeleted = true)</summary>
    [HttpDelete("posts/{id:guid}")]
    [Authorize(Policy = BlogPermissions.DeletePost)]
    public async Task<IActionResult> DeletePost(Guid id, CancellationToken ct)
    {
        await _blog.AdminDeletePostAsync(id, ct);
        return NoContent();
    }

    // ── Posts: Publish workflow ───────────────────────────────────────────────

    /// <summary>
    /// POST /api/admin/blog/posts/{id}/publish
    /// Requires: Title, Slug, Content non-empty; status must be Draft.
    /// Archived posts cannot be published directly (use unpublish → publish).
    /// Sets PublishedAt only on first publish.
    /// </summary>
    [HttpPost("posts/{id:guid}/publish")]
    [Authorize(Policy = BlogPermissions.PublishPost)]
    public async Task<IActionResult> PublishPost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminPublishPostAsync(id, GetUserId(), ct));

    /// <summary>POST /api/admin/blog/posts/{id}/unpublish — returns post to Draft</summary>
    [HttpPost("posts/{id:guid}/unpublish")]
    [Authorize(Policy = BlogPermissions.PublishPost)]
    public async Task<IActionResult> UnpublishPost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminUnpublishPostAsync(id, ct));

    /// <summary>POST /api/admin/blog/posts/{id}/archive — hides post from public</summary>
    [HttpPost("posts/{id:guid}/archive")]
    [Authorize(Policy = BlogPermissions.PublishPost)]
    public async Task<IActionResult> ArchivePost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminArchivePostAsync(id, ct));

    // ── Categories ────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/blog/categories — all categories with total post counts</summary>
    [HttpGet("categories")]
    [Authorize(Policy = BlogPermissions.ManageCategories)]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
        => Ok(await _blog.AdminGetCategoriesAsync(ct));

    /// <summary>GET /api/admin/blog/categories/{id}</summary>
    [HttpGet("categories/{id:guid}")]
    [Authorize(Policy = BlogPermissions.ManageCategories)]
    public async Task<IActionResult> GetCategory(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminGetCategoryByIdAsync(id, ct));

    /// <summary>POST /api/admin/blog/categories — slug auto-generated with collision handling</summary>
    [HttpPost("categories")]
    [Authorize(Policy = BlogPermissions.ManageCategories)]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateBlogCategoryRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminCreateCategoryAsync(request, ct);
        return Created($"/api/admin/blog/categories/{result.Id}", result);
    }

    /// <summary>PUT /api/admin/blog/categories/{id}</summary>
    [HttpPut("categories/{id:guid}")]
    [Authorize(Policy = BlogPermissions.ManageCategories)]
    public async Task<IActionResult> UpdateCategory(
        Guid id, [FromBody] UpdateBlogCategoryRequest request, CancellationToken ct)
        => Ok(await _blog.AdminUpdateCategoryAsync(id, request, ct));

    /// <summary>DELETE /api/admin/blog/categories/{id} — blocked if published posts exist</summary>
    [HttpDelete("categories/{id:guid}")]
    [Authorize(Policy = BlogPermissions.ManageCategories)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        await _blog.AdminDeleteCategoryAsync(id, ct);
        return NoContent();
    }
}
