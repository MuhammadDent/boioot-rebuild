using Boioot.Api.Authorization;
using Boioot.Application.Features.Blog.DTOs;
using Boioot.Application.Features.Blog.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Enums;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[Route("api/admin/blog")]
[Authorize]   // base: authenticated; per-method [RequirePermission] enforces RBAC
public class AdminBlogController : BaseController
{
    private readonly IBlogService _blog;

    public AdminBlogController(IBlogService blog)
    {
        _blog = blog;
    }

    // ── Posts: Read ───────────────────────────────────────────────────────────

    [HttpGet("posts")]
    [RequirePermission(Permissions.BlogView)]
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

    [HttpGet("posts/{id:guid}")]
    [RequirePermission(Permissions.BlogView)]
    public async Task<IActionResult> GetPost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminGetPostByIdAsync(id, ct));

    // ── Posts: Write ──────────────────────────────────────────────────────────

    [HttpPost("posts")]
    [RequirePermission(Permissions.BlogCreate)]
    public async Task<IActionResult> CreatePost(
        [FromBody] CreateBlogPostRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminCreatePostAsync(GetUserId(), request, ct);
        return Created($"/api/admin/blog/posts/{result.Id}", result);
    }

    [HttpPut("posts/{id:guid}")]
    [RequirePermission(Permissions.BlogEdit)]
    public async Task<IActionResult> UpdatePost(
        Guid id, [FromBody] UpdateBlogPostRequest request, CancellationToken ct)
        => Ok(await _blog.AdminUpdatePostAsync(id, GetUserId(), request, ct));

    [HttpDelete("posts/{id:guid}")]
    [RequirePermission(Permissions.BlogDelete)]
    public async Task<IActionResult> DeletePost(Guid id, CancellationToken ct)
    {
        await _blog.AdminDeletePostAsync(id, ct);
        return NoContent();
    }

    // ── Posts: Publish workflow ───────────────────────────────────────────────

    [HttpPost("posts/{id:guid}/publish")]
    [RequirePermission(Permissions.BlogPublish)]
    public async Task<IActionResult> PublishPost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminPublishPostAsync(id, GetUserId(), ct));

    [HttpPost("posts/{id:guid}/unpublish")]
    [RequirePermission(Permissions.BlogPublish)]
    public async Task<IActionResult> UnpublishPost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminUnpublishPostAsync(id, ct));

    [HttpPost("posts/{id:guid}/archive")]
    [RequirePermission(Permissions.BlogPublish)]
    public async Task<IActionResult> ArchivePost(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminArchivePostAsync(id, ct));

    // ── SEO Settings ──────────────────────────────────────────────────────────

    [HttpGet("seo-settings")]
    [RequirePermission(Permissions.SeoSettingsManage)]
    public async Task<IActionResult> GetSeoSettings(CancellationToken ct)
        => Ok(await _blog.GetBlogSeoSettingsAsync(ct));

    [HttpPut("seo-settings")]
    [RequirePermission(Permissions.SeoSettingsManage)]
    public async Task<IActionResult> UpdateSeoSettings(
        [FromBody] UpdateBlogSeoSettingsRequest request, CancellationToken ct)
        => Ok(await _blog.UpdateBlogSeoSettingsAsync(request, ct));

    // ── Categories ────────────────────────────────────────────────────────────

    [HttpGet("categories")]
    [RequirePermission(Permissions.BlogView)]
    public async Task<IActionResult> GetCategories(CancellationToken ct)
        => Ok(await _blog.AdminGetCategoriesAsync(ct));

    [HttpGet("categories/{id:guid}")]
    [RequirePermission(Permissions.BlogView)]
    public async Task<IActionResult> GetCategory(Guid id, CancellationToken ct)
        => Ok(await _blog.AdminGetCategoryByIdAsync(id, ct));

    [HttpPost("categories")]
    [RequirePermission(Permissions.BlogEdit)]
    public async Task<IActionResult> CreateCategory(
        [FromBody] CreateBlogCategoryRequest request, CancellationToken ct)
    {
        var result = await _blog.AdminCreateCategoryAsync(request, ct);
        return Created($"/api/admin/blog/categories/{result.Id}", result);
    }

    [HttpPut("categories/{id:guid}")]
    [RequirePermission(Permissions.BlogEdit)]
    public async Task<IActionResult> UpdateCategory(
        Guid id, [FromBody] UpdateBlogCategoryRequest request, CancellationToken ct)
        => Ok(await _blog.AdminUpdateCategoryAsync(id, request, ct));

    [HttpDelete("categories/{id:guid}")]
    [RequirePermission(Permissions.BlogEdit)]
    public async Task<IActionResult> DeleteCategory(Guid id, CancellationToken ct)
    {
        await _blog.AdminDeleteCategoryAsync(id, ct);
        return NoContent();
    }
}
