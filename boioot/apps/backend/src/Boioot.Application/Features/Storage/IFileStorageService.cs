namespace Boioot.Application.Features.Storage;

/// <summary>
/// Abstracts file upload/delete/URL operations behind a single interface.
/// Implementations: LocalFileStorageService (default), R2FileStorageService (Cloudflare R2).
/// </summary>
public interface IFileStorageService
{
    /// <summary>
    /// Uploads a file stream and returns the resulting key + public URL.
    /// </summary>
    /// <param name="content">Seekable stream of the file bytes.</param>
    /// <param name="fileName">Desired file name (including extension). Implementations may rename.</param>
    /// <param name="contentType">MIME type, e.g. "image/jpeg".</param>
    /// <param name="folder">Optional sub-folder/prefix, e.g. "uploads/docs". Defaults to "uploads".</param>
    /// <param name="ct">Cancellation token.</param>
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
}
