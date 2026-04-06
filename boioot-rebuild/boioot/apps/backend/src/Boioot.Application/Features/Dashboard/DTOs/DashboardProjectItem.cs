using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Dashboard.DTOs;

public class DashboardProjectItem
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public ProjectStatus Status { get; set; }
    public string City { get; set; } = string.Empty;
    public decimal? StartingPrice { get; set; }
    public bool IsPublished { get; set; }
    public DateTime CreatedAt { get; set; }
}
