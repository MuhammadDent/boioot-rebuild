namespace Boioot.Application.Features.Storage.Settings;

/// <summary>
/// Cloudflare R2 connection settings bound from appsettings.json → "Storage:R2".
///
/// All secret values (AccessKeyId, SecretAccessKey) must come from
/// environment variables / Fly.io secrets — never hardcode in appsettings.
///
/// Fly.io secret names (recommended):
///   R2_ACCOUNT_ID
///   R2_BUCKET_NAME
///   R2_ACCESS_KEY_ID
///   R2_SECRET_ACCESS_KEY
///   R2_PUBLIC_BASE_URL
///
/// These map via standard .NET env-var configuration:
///   Storage__R2__AccountId       → Storage:R2:AccountId
///   Storage__R2__AccessKeyId     → Storage:R2:AccessKeyId
///   etc.
/// </summary>
public sealed class R2Options
{
    /// <summary>Cloudflare Account ID (visible in R2 dashboard).</summary>
    public string AccountId { get; set; } = string.Empty;

    /// <summary>R2 Bucket name.</summary>
    public string BucketName { get; set; } = string.Empty;

    /// <summary>R2 API Token — Access Key ID (S3-compatible credentials).</summary>
    public string AccessKeyId { get; set; } = string.Empty;

    /// <summary>R2 API Token — Secret Access Key.</summary>
    public string SecretAccessKey { get; set; } = string.Empty;

    /// <summary>
    /// Public base URL for the bucket.
    /// Use the Cloudflare R2 public URL or a custom domain.
    /// Example: "https://assets.boioot.net"
    /// Trailing slash is NOT required — the service adds it.
    /// </summary>
    public string PublicBaseUrl { get; set; } = string.Empty;

    /// <summary>
    /// Returns true when all required fields are populated.
    /// Used by DI registration to decide whether R2 is usable.
    /// </summary>
    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(AccountId)      &&
        !string.IsNullOrWhiteSpace(BucketName)     &&
        !string.IsNullOrWhiteSpace(AccessKeyId)    &&
        !string.IsNullOrWhiteSpace(SecretAccessKey)&&
        !string.IsNullOrWhiteSpace(PublicBaseUrl);
}
