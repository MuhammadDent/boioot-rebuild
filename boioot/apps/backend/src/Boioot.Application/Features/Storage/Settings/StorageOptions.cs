namespace Boioot.Application.Features.Storage.Settings;

/// <summary>
/// Top-level storage configuration bound from appsettings.json → "Storage".
///
/// Usage in appsettings.json:
/// <code>
/// "Storage": {
///   "Provider": "Local",
///   "LocalPublicBasePath": "/uploads",
///   "R2": { ... }
/// }
/// </code>
/// </summary>
public sealed class StorageOptions
{
    public const string SectionName = "Storage";

    /// <summary>
    /// Active storage backend. Supported values: "Local" (default), "R2".
    /// Any unrecognized value falls back to "Local".
    /// </summary>
    public string Provider { get; set; } = "Local";

    /// <summary>
    /// Base URL prefix used by LocalFileStorageService to build public URLs.
    /// Example: "/uploads"  →  public URL = /uploads/docs/abc123.jpg
    /// </summary>
    public string LocalPublicBasePath { get; set; } = "/uploads";

    /// <summary>
    /// Cloudflare R2 specific settings. Only required when Provider = "R2".
    /// </summary>
    public R2Options R2 { get; set; } = new();
}
