namespace Boioot.Domain.Entities;

public class ProjectImage
{
    public Guid Id { get; set; }
    public Guid ProjectId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int Order { get; set; } = 0;
    public DateTime CreatedAt { get; set; }

    public Project Project { get; set; } = null!;
}
