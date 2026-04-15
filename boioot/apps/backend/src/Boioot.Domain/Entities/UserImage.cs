namespace Boioot.Domain.Entities;

/// <summary>
/// Tracks every image uploaded by a user via POST /api/upload/image.
/// Stores both the public CDN URL (for display) and the internal file key
/// (for deletion from R2/local storage).
/// </summary>
public class UserImage : BaseEntity
{
    public Guid UserId { get; set; }

    /// <summary>Public URL served to clients (e.g. R2 CDN URL or /uploads/... path).</summary>
    public string Url { get; set; } = string.Empty;

    /// <summary>
    /// Internal storage key returned by IFileStorageService.UploadAsync.
    /// Used for deletion from R2 or local filesystem.
    /// Example: "uploads/3f7a1c2d-….jpg"
    /// </summary>
    public string FileKey { get; set; } = string.Empty;

    /// <summary>Original filename as provided by the uploader (sanitised, for display only).</summary>
    public string? OriginalFileName { get; set; }

    /// <summary>MIME type e.g. "image/jpeg". Derived from the uploaded Content-Type header.</summary>
    public string? MimeType { get; set; }

    /// <summary>File size in bytes at the time of upload.</summary>
    public long? SizeBytes { get; set; }

    public User User { get; set; } = null!;

    public ICollection<PropertyImage> PropertyImages { get; set; } = [];
    public ICollection<ProjectImage>  ProjectImages  { get; set; } = [];
}
