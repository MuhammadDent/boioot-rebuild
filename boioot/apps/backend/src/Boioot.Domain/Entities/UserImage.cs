namespace Boioot.Domain.Entities;

/// <summary>
/// Tracks every image uploaded by a user via POST /api/upload/image.
/// Stores both the public CDN URL (for display) and the internal file key
/// (for deletion from R2/local storage).
///
/// Images processed via ImageProcessingService also get a compressed WebP
/// main version and a 480 px thumbnail, each with their own R2 key.
/// </summary>
public class UserImage : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>Public URL served to clients (e.g. R2 CDN URL or /uploads/... path).</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Internal storage key returned by IFileStorageService.UploadAsync.
    /// Used for deletion from R2 or local filesystem.
    /// Example: "uploads/3f7a1c2d-….webp"
    /// </summary>
    public string FileKey { get; set; } = string.Empty;

    /// <summary>
    /// Public URL of the 480 px WebP thumbnail.
    /// Null for legacy images (uploaded before optimization was introduced) or SVG/GIF.
    /// </summary>
    public string? ThumbnailUrl { get; set; }

    /// <summary>
    /// R2 key of the 480 px thumbnail file.
    /// Null when ThumbnailUrl is null. Must be deleted together with FileKey.
    /// </summary>
    public string? ThumbnailFileKey { get; set; }

    /// <summary>Original filename as provided by the uploader (sanitised, for display only).</summary>
    public string? OriginalFileName { get; set; }

    /// <summary>MIME type of the stored file (always "image/webp" for processed images).</summary>
    public string? MimeType { get; set; }

    /// <summary>File size in bytes of the main image at the time of upload.</summary>
    public long? SizeBytes { get; set; }

    public User User { get; set; } = null!;

    public ICollection<PropertyImage> PropertyImages { get; set; } = [];
    public ICollection<ProjectImage>  ProjectImages  { get; set; } = [];
}
