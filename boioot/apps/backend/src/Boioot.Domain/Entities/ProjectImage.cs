namespace Boioot.Domain.Entities;

public class ProjectImage : BaseEntity
{
    public Guid ProjectId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int Order { get; set; } = 0;

    /// <summary>
    /// Optional FK to the UserImage that was uploaded via the upload API.
    /// Null for images added via URL (legacy) or admin tools.
    /// </summary>
    public Guid? UserImageId { get; set; }

    public Project Project { get; set; } = null!;
    public UserImage? UserImage { get; set; }
}
