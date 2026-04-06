using System.Security.Claims;
using Boioot.Application.Features.Favorites.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/favorites")]
[Authorize]
public class FavoritesController : ControllerBase
{
    private readonly IFavoriteService _favorites;

    public FavoritesController(IFavoriteService favorites)
    {
        _favorites = favorites;
    }

    private Guid GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : Guid.Empty;
    }

    [HttpGet]
    public async Task<IActionResult> GetFavorites(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var result = await _favorites.GetFavoritesAsync(userId, ct);
        return Ok(result);
    }

    [HttpGet("ids")]
    public async Task<IActionResult> GetFavoriteIds(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var ids = await _favorites.GetFavoriteIdsAsync(userId, ct);
        return Ok(ids);
    }

    [HttpPost("{propertyId:guid}")]
    public async Task<IActionResult> Toggle(Guid propertyId, CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId == Guid.Empty) return Unauthorized();
        var added = await _favorites.ToggleAsync(userId, propertyId, ct);
        return Ok(new { added });
    }
}
