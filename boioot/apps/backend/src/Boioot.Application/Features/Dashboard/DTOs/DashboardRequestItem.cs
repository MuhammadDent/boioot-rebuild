using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Dashboard.DTOs;

public class DashboardRequestItem
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public RequestStatus Status { get; set; }
    public string? PropertyTitle { get; set; }
    public string? ProjectTitle { get; set; }
    public DateTime CreatedAt { get; set; }
}
