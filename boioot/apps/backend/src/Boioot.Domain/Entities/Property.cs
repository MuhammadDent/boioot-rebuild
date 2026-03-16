using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Property : BaseEntity, ISoftDeletable
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public PropertyType Type { get; set; }
    public string ListingType { get; set; } = string.Empty;
    public PropertyStatus Status { get; set; } = PropertyStatus.Available;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "SYP";
    public decimal Area { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public string? Province { get; set; }
    public string? Neighborhood { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsDeleted { get; set; } = false;

    public Guid CompanyId { get; set; }
    public Guid? AgentId { get; set; }

    // Personal listing (User-posted) — null means it belongs to a company
    public string? OwnerId { get; set; }

    public Company Company { get; set; } = null!;
    public Agent? Agent { get; set; }
    public ICollection<PropertyImage> Images { get; set; } = [];
    public ICollection<Request> Requests { get; set; } = [];
}
