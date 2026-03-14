using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Project : SoftDeletableEntity
{
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.ComingSoon;
    public PublishStatus PublishStatus { get; set; } = PublishStatus.Draft;
    public bool IsFeatured { get; set; } = false;
    public decimal? StartingPrice { get; set; }
    public decimal? EndingPrice { get; set; }
    public string Currency { get; set; } = "SAR";
    public decimal? TotalAreaSqm { get; set; }
    public int? TotalUnits { get; set; }
    public int? FloorsCount { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public string? MasterPlanImageUrl { get; set; }
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
    public int ViewsCount { get; set; } = 0;

    public Guid CompanyId { get; set; }
    public Company Company { get; set; } = null!;

    public ICollection<ProjectImage> Images { get; set; } = [];
    public ICollection<Property> Units { get; set; } = [];
}
