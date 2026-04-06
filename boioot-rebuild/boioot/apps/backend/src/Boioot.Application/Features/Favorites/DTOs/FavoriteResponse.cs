namespace Boioot.Application.Features.Favorites.DTOs;

public class FavoriteResponse
{
    public Guid FavoriteId { get; set; }
    public Guid PropertyId { get; set; }
    public string Title { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "SYP";
    public string City { get; set; } = string.Empty;
    public string? Province { get; set; }
    public string? Neighborhood { get; set; }
    public string ListingType { get; set; } = string.Empty;
    public string Type { get; set; } = string.Empty;
    public string? ThumbnailUrl { get; set; }
    public int? Bedrooms { get; set; }
    public decimal Area { get; set; }
    public DateTime AddedAt { get; set; }
}
