using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Property : BaseEntity, ISoftDeletable
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PropertyType Type { get; set; }
    public ListingType ListingType { get; set; }
    public PropertyStatus Status { get; set; } = PropertyStatus.Active;
    public decimal Price { get; set; }
    public decimal Area { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsDeleted { get; set; } = false;

    public Guid CompanyId { get; set; }
    public Guid? AgentId { get; set; }

    public Company Company { get; set; } = null!;
    public Agent? Agent { get; set; }
    public ICollection<PropertyImage> Images { get; set; } = [];
    public ICollection<Request> Requests { get; set; } = [];
}
