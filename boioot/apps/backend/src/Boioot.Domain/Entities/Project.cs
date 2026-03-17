using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Project : BaseEntity, ISoftDeletable
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public ProjectStatus Status { get; set; } = ProjectStatus.Upcoming;
    public string City { get; set; } = string.Empty;
    public string? Province { get; set; }
    public string? Address { get; set; }
    public double? Latitude { get; set; }
    public double? Longitude { get; set; }
    public decimal? StartingPrice { get; set; }
    public DateTime? DeliveryDate { get; set; }
    public bool IsPublished { get; set; } = false;
    public bool IsDeleted { get; set; } = false;

    public Guid CompanyId { get; set; }

    public Company Company { get; set; } = null!;
    public ICollection<ProjectImage> Images { get; set; } = [];
    public ICollection<Request> Requests { get; set; } = [];
}
