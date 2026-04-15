namespace Boioot.Application.Features.Properties.DTOs;

public class PropertyImageResponse
{
    public Guid   Id          { get; set; }
    public string ImageUrl    { get; set; } = string.Empty;
    /// <summary>True when this is the canonical cover image for the listing.</summary>
    public bool   IsCover     { get; set; }
    /// <summary>Backward-compatibility alias for IsCover.</summary>
    public bool   IsPrimary   { get; set; }
    public int    Order       { get; set; }
    /// <summary>Non-null when image was uploaded via /api/upload/image. Null for legacy URL-based images.</summary>
    public Guid?  UserImageId { get; set; }
}
