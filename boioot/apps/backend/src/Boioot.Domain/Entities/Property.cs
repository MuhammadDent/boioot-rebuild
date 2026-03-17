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
    public int? HallsCount { get; set; }
    public string? Province { get; set; }
    public string? Neighborhood { get; set; }
    public string? Address { get; set; }
    public string City { get; set; } = string.Empty;
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public bool IsDeleted { get; set; } = false;

    // Payment details
    public string PaymentType { get; set; } = "OneTime"; // OneTime | Installments
    public int? InstallmentsCount { get; set; }
    public bool HasCommission { get; set; } = false;
    public string? CommissionType { get; set; } // Percentage | Fixed
    public decimal? CommissionValue { get; set; }

    // Property characteristics
    public string? OwnershipType { get; set; }
    public string? Floor { get; set; }
    public int? PropertyAge { get; set; }
    public string? Features { get; set; } // JSON TEXT array

    // Media
    public string? VideoUrl { get; set; }

    public Guid CompanyId { get; set; }
    public Guid? AgentId { get; set; }

    // Personal listing (User-posted) — null means it belongs to a company
    public string? OwnerId { get; set; }

    // Phase A: future ownership source — will replace CompanyId in Phase C
    public Guid? AccountId { get; set; }

    // Analytics
    public int ViewCount { get; set; } = 0;

    public Company Company { get; set; } = null!;
    public Agent? Agent { get; set; }
    public ICollection<PropertyImage> Images { get; set; } = [];
    public ICollection<Request> Requests { get; set; } = [];
}
