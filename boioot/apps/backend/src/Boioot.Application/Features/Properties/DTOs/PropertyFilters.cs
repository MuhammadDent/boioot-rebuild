using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Properties.DTOs;

public class PropertyFilters
{
    public string? City { get; set; }
    public PropertyType? Type { get; set; }
    public ListingType? ListingType { get; set; }
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}
