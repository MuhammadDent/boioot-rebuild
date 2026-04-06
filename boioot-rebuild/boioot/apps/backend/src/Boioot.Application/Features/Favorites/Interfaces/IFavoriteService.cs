using Boioot.Application.Features.Favorites.DTOs;

namespace Boioot.Application.Features.Favorites.Interfaces;

public interface IFavoriteService
{
    Task<List<FavoriteResponse>> GetFavoritesAsync(Guid userId, CancellationToken ct = default);
    Task<List<Guid>> GetFavoriteIdsAsync(Guid userId, CancellationToken ct = default);
    Task<bool> ToggleAsync(Guid userId, Guid propertyId, CancellationToken ct = default);
}
