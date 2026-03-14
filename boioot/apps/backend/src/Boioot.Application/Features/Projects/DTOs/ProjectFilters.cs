using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Projects.DTOs;

public class ProjectFilters
{
    public string? City { get; set; }
    public ProjectStatus? Status { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 12;
}
