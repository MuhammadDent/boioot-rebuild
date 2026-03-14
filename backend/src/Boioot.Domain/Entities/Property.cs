using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Property : SoftDeletableEntity
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public PropertyType Type { get; set; }
    public ListingType ListingType { get; set; }
    public PublishStatus Status { get; set; } = PublishStatus.Draft;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "SAR";
    public decimal? Area { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? Floor { get; set; }
    public int? TotalFloors { get; set; }
    public int? YearBuilt { get; set; }
    public bool IsFurnished { get; set; } = false;
    public bool IsNegotiable { get; set; } = false;
    public bool IsFeatured { get; set; } = false;
    public int ViewsCount { get; set; } = 0;
    public int FavoritesCount { get; set; } = 0;
    public string? VideoUrl { get; set; }
    public string? VirtualTourUrl { get; set; }

    public string CityAr { get; set; } = string.Empty;
    public string CityEn { get; set; } = string.Empty;
    public string? DistrictAr { get; set; }
    public string? DistrictEn { get; set; }
    public string? AddressAr { get; set; }
    public string? AddressEn { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }

    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public Guid? AgentId { get; set; }
    public Agent? Agent { get; set; }

    public Guid? CompanyId { get; set; }
    public Company? Company { get; set; }

    public Guid? ProjectId { get; set; }
    public Project? Project { get; set; }

    public ICollection<PropertyImage> Images { get; set; } = [];
    public ICollection<PropertyFeature> Features { get; set; } = [];
    public ICollection<Favorite> Favorites { get; set; } = [];
}
