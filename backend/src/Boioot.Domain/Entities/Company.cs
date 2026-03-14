using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Company : SoftDeletableEntity
{
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string Slug { get; set; } = string.Empty;
    public string? DescriptionAr { get; set; }
    public string? DescriptionEn { get; set; }
    public string? LogoUrl { get; set; }
    public string? CoverImageUrl { get; set; }
    public string? Email { get; set; }
    public string? PhoneNumber { get; set; }
    public string? WhatsAppNumber { get; set; }
    public string? Website { get; set; }
    public string? AddressAr { get; set; }
    public string? AddressEn { get; set; }
    public string? CityAr { get; set; }
    public string? CityEn { get; set; }
    public string? CountryCode { get; set; } = "SA";
    public CompanyType Type { get; set; }
    public bool IsVerified { get; set; } = false;
    public bool IsActive { get; set; } = true;
    public double AverageRating { get; set; } = 0;
    public int ReviewCount { get; set; } = 0;

    public Guid OwnerId { get; set; }
    public User Owner { get; set; } = null!;

    public ICollection<Agent> Agents { get; set; } = [];
    public ICollection<Property> Properties { get; set; } = [];
    public ICollection<Project> Projects { get; set; } = [];
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<CompanySubscription> Subscriptions { get; set; } = [];
}
