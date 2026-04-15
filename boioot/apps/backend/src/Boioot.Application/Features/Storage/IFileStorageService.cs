namespace Boioot.Application.Features.Storage;

/// <summary>
/// Abstracts file upload/delete/URL operations behind a single interface.
/// Implementations: LocalFileStorageService (default), R2FileStorageService (Cloudflare R2).
/// </summary>
public interface IFileStorageService
{
    // ── Core upload / delete ──────────────────────────────────────────────────

    /// <summary>
    /// Uploads a file stream and returns the resulting key + public URL.
    /// </summary>
    Task<FileUploadResult> UploadAsync(
        Stream      content,
        string      fileName,
        string      contentType,
        string      folder = "uploads",
        CancellationToken ct = default);

    /// <summary>
    /// Deletes a previously uploaded file by its key (as returned by UploadAsync).
    /// Silently succeeds if the file does not exist.
    /// </summary>
    Task DeleteAsync(string fileKey, CancellationToken ct = default);

    /// <summary>
    /// Resolves a public URL for an existing file key without making a network call.
    /// </summary>
    string GetPublicUrl(string fileKey);

    // ── Direct upload (presigned URLs — R2 only) ──────────────────────────────

    /// <summary>
    /// Generates a time-limited presigned URL that allows a browser to PUT a file
    /// directly to R2 storage without routing through the API server.
    ///
    /// Returns <c>null</c> when not supported (e.g., LocalFileStorageService in dev mode).
    /// Callers should check for null and fall back to POST /api/upload/image.
    ///
    /// The generated URL is valid for <paramref name="expiresInSeconds"/> seconds.
    /// The client MUST set the matching Content-Type header on the PUT request.
    /// </summary>
    Task<string?> GeneratePresignedUploadUrlAsync(
        string            fileKey,
        string            contentType,
        int               expiresInSeconds,
        CancellationToken ct = default);

    /// <summary>
    /// Returns true if the object at <paramref name="fileKey"/> currently exists in storage.
    /// Used by the finalize endpoint to verify a direct upload completed successfully.
    /// </summary>
    Task<bool> ObjectExistsAsync(string fileKey, CancellationToken ct = default);

    /// <summary>
    /// Downloads and returns the content of the object at <paramref name="fileKey"/> as a stream.
    /// The returned stream is owned by the caller — it must be disposed after use.
    /// Throws if the key does not exist.
    /// </summary>
    Task<Stream> GetObjectStreamAsync(string fileKey, CancellationToken ct = default);
}
