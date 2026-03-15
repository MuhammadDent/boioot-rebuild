using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Dashboard.DTOs;

public class DashboardPropertyItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public PropertyStatus Status { get; set; }
    public PropertyType Type { get; set; }
    public string ListingType { get; set; } = string.Empty;
    public decimal Price { get; set; }
    public string Currency { get; set; } = "SYP";
    public string City { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
}
