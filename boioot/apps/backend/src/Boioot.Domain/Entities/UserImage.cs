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

    public User User { get; set; } = null!;
}
