using Boioot.Application.Features.Content.Interfaces;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>Public (no-auth) endpoint for frontend CMS content.</summary>
[Route("api/content")]
public class ContentController : BaseController
{
    private readonly ISiteContentService _content;

    public ContentController(ISiteContentService content)
    {
        _content = content;
    }

    /// <summary>Returns all active site content as a flat key→value dictionary.</summary>
    [HttpGet("public")]
    public async Task<IActionResult> GetPublic(CancellationToken ct)
    {
        var dict = await _content.GetPublicDictionaryAsync(ct);
        return Ok(dict);
    }
}
