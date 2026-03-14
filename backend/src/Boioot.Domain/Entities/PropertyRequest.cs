using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class PropertyRequest : SoftDeletableEntity
{
    public string TitleAr { get; set; } = string.Empty;
    public string TitleEn { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public PropertyType? PropertyType { get; set; }
    public ListingType ListingType { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Active;
    public decimal? MinPrice { get; set; }
    public decimal? MaxPrice { get; set; }
    public string Currency { get; set; } = "SAR";
    public decimal? MinArea { get; set; }
    public decimal? MaxArea { get; set; }
    public int? MinBedrooms { get; set; }
    public int? MaxBedrooms { get; set; }
    public int? MinBathrooms { get; set; }
    public string? CityAr { get; set; }
    public string? CityEn { get; set; }
    public string? DistrictAr { get; set; }
    public string? DistrictEn { get; set; }
    public DateTime? ExpiresAt { get; set; }
    public int ResponsesCount { get; set; } = 0;
    public int ViewsCount { get; set; } = 0;
    public bool IsPublic { get; set; } = true;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public ICollection<RequestResponse> Responses { get; set; } = [];
}
