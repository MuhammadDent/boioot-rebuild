namespace Boioot.Application.Features.Storage;

/// <summary>
/// Returned by IFileStorageService after a successful upload.
/// </summary>
/// <param name="FileKey">
///   The provider-specific key used to reference this file later
///   (e.g. "images/abc123.jpg" for R2, or "/uploads/abc123.jpg" for Local).
/// </param>
/// <param name="PublicUrl">
///   The fully-qualified URL or relative path the frontend can use to render the file.
/// </param>
public sealed record FileUploadResult(string FileKey, string PublicUrl);
