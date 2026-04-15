namespace Boioot.Application.Features.Projects.DTOs;

/// <summary>
/// Represents a single image attached to a project.
/// Supports both the legacy URL-based system and the new UserImage upload system.
/// </summary>
public class ProjectImageResponse
{
    public Guid   Id          { get; set; }

    /// <summary>
    /// Resolved display URL. For new images this is UserImage.Url (live R2 CDN URL).
    /// For legacy images this is ProjectImage.ImageUrl (base64 or external URL).
    /// </summary>
    public string ImageUrl    { get; set; } = string.Empty;

    /// <summary>True when this is the canonical cover image for the project.</summary>
    public bool   IsCover     { get; set; }

    /// <summary>Backward-compatibility alias for IsCover.</summary>
    public bool   IsPrimary   { get; set; }

    public int    Order       { get; set; }

    /// <summary>Non-null when image was uploaded via /api/upload/image. Null for legacy URL-based images.</summary>
    public Guid?  UserImageId { get; set; }

    /// <summary>
    /// "user_upload" when the image was uploaded via the new R2 pipeline (/api/upload/image → /api/images/attach).
    /// "legacy" when the image was stored directly as a URL or base64 string.
    /// Additive field — safe for clients that ignore unknown fields.
    /// </summary>
    public string ImageSource { get; set; } = "legacy";
}
