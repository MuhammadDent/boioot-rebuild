namespace Boioot.Application.Features.Projects.DTOs;

public class ProjectImageResponse
{
    public Guid Id { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; }
    public int Order { get; set; }
}
