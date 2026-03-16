namespace Boioot.Application.Features.Properties.DTOs;

public class PropertyResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal Price { get; set; }
    public string Currency { get; set; } = "SYP";
    public decimal Area { get; set; }
    public string Type { get; set; } = string.Empty;
    public string ListingType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public string? Province { get; set; }
    public string City { get; set; } = string.Empty;
    public string? Neighborhood { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public int? Bedrooms { get; set; }
    public int? Bathrooms { get; set; }
    public int? HallsCount { get; set; }
    public Guid CompanyId { get; set; }
    public string CompanyName { get; set; } = string.Empty;
    public Guid? AgentId { get; set; }
    public string? OwnerId { get; set; }
    public bool IsPersonalListing { get; set; }

    // Payment
    public string PaymentType { get; set; } = "OneTime";
    public int? InstallmentsCount { get; set; }
    public bool HasCommission { get; set; }
    public string? CommissionType { get; set; }
    public decimal? CommissionValue { get; set; }

    // Property characteristics
    public string? OwnershipType { get; set; }
    public string? Floor { get; set; }
    public int? PropertyAge { get; set; }
    public List<string> Features { get; set; } = [];

    // Media
    public string? VideoUrl { get; set; }

    public IReadOnlyList<PropertyImageResponse> Images { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    // Advertiser info (filled only on public detail view)
    public string? OwnerName { get; set; }
    public string? OwnerPhone { get; set; }

    // Analytics
    public int ViewCount { get; set; }
}
