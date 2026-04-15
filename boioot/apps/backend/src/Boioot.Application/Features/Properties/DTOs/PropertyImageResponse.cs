namespace Boioot.Application.Features.Properties.DTOs;

/// <summary>
/// Represents a single image attached to a property listing.
/// Supports both the legacy URL-based system and the new UserImage upload system.
/// </summary>
public class PropertyImageResponse
{
    public Guid   Id          { get; set; }

    /// <summary>
    /// Full-size display URL (max 1600 px, WebP for new uploads).
    /// For legacy images this is PropertyImage.ImageUrl (base64 or external URL).
    /// Use for detail pages where full resolution is needed.
    /// </summary>
    public string ImageUrl    { get; set; } = string.Empty;

    /// <summary>
    /// 480 px WebP thumbnail URL. Null for legacy images (uploaded before optimization).
    /// Use for cards and lists — significantly smaller file, same visual quality at card size.
    /// Fall back to ImageUrl when null.
    /// </summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>True when this is the canonical cover image for the listing.</summary>
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
