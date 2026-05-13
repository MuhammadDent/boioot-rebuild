using Boioot.Application.Features.Pages.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public static-pages endpoints — no authentication required.
/// </summary>
[Route("api/public/pages")]
[AllowAnonymous]
public class PublicPagesController : BaseController
{
    private readonly IStaticPageService _service;

    public PublicPagesController(IStaticPageService service) => _service = service;

    /// <summary>
    /// GET /api/public/pages/footer-links
    /// Returns all active pages that should appear in the footer.
    /// </summary>
    [HttpGet("footer-links")]
    public async Task<IActionResult> GetFooterLinks(CancellationToken ct)
    {
        var links = await _service.GetFooterLinksAsync(ct);
        return Ok(links);
    }

    /// <summary>
    /// GET /api/public/pages/{slug}
    /// Returns a single active page by slug.
    /// Returns 404 if not found or inactive.
    /// </summary>
    [HttpGet("{slug}")]
    public async Task<IActionResult> GetBySlug(string slug, CancellationToken ct)
    {
        var page = await _service.GetBySlugAsync(slug, ct);
        if (page is null) return NotFound(new { message = "الصفحة غير موجودة." });
        return Ok(page);
    }
}
