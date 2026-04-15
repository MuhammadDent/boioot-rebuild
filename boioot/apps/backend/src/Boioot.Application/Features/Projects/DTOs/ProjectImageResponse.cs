namespace Boioot.Application.Features.Projects.DTOs;

public class ProjectImageResponse
{
    public Guid   Id          { get; set; }
    public string ImageUrl    { get; set; } = string.Empty;
    /// <summary>True when this is the canonical cover image for the project.</summary>
    public bool   IsCover     { get; set; }
    /// <summary>Backward-compatibility alias for IsCover.</summary>
    public bool   IsPrimary   { get; set; }
    public int    Order       { get; set; }
    /// <summary>Non-null when image was uploaded via /api/upload/image. Null for legacy URL-based images.</summary>
    public Guid?  UserImageId { get; set; }
}
