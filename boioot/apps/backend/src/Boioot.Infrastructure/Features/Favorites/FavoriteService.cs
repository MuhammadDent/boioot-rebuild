using Boioot.Application.Features.Favorites.DTOs;
using Boioot.Application.Features.Favorites.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Favorites;

public class FavoriteService : IFavoriteService
{
    private readonly BoiootDbContext _context;

    public FavoriteService(BoiootDbContext context)
    {
        _context = context;
    }

    public async Task<List<FavoriteResponse>> GetFavoritesAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.Favorites
            .Where(f => f.UserId == userId)
            .Include(f => f.Property)
                .ThenInclude(p => p.Images)
            .OrderByDescending(f => f.CreatedAt)
            .Select(f => new FavoriteResponse
            {
                FavoriteId   = f.Id,
                PropertyId   = f.PropertyId,
                Title        = f.Property.Title,
                Price        = f.Property.Price,
                Currency     = f.Property.Currency,
                City         = f.Property.City,
                Province     = f.Property.Province,
                Neighborhood = f.Property.Neighborhood,
                ListingType  = f.Property.ListingType,
                Type         = f.Property.Type.ToString(),
                ThumbnailUrl = f.Property.Images
                    .OrderBy(i => i.Order)
                    .Select(i => i.ImageUrl)
                    .FirstOrDefault(),
                Bedrooms = f.Property.Bedrooms,
                Area     = f.Property.Area,
                AddedAt  = f.CreatedAt,
            })
            .ToListAsync(ct);
    }

    public async Task<List<Guid>> GetFavoriteIdsAsync(Guid userId, CancellationToken ct = default)
    {
        return await _context.Favorites
            .Where(f => f.UserId == userId)
            .Select(f => f.PropertyId)
            .ToListAsync(ct);
    }

    public async Task<bool> ToggleAsync(Guid userId, Guid propertyId, CancellationToken ct = default)
    {
        var existing = await _context.Favorites
            .FirstOrDefaultAsync(f => f.UserId == userId && f.PropertyId == propertyId, ct);

        if (existing is not null)
        {
            _context.Favorites.Remove(existing);
            await _context.SaveChangesAsync(ct);
            return false;
        }

        _context.Favorites.Add(new Favorite { UserId = userId, PropertyId = propertyId });
        await _context.SaveChangesAsync(ct);
        return true;
    }
}
