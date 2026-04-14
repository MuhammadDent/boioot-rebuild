using Amazon.Runtime;
using Amazon.S3;
using Amazon.S3.Model;
using Boioot.Application.Features.Storage;
using Boioot.Application.Features.Storage.Settings;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Boioot.Infrastructure.Features.Storage;

/// <summary>
/// Cloudflare R2 implementation of IFileStorageService.
///
/// Cloudflare R2 is S3-compatible, so we use the AWS SDK with a custom
/// ServiceURL pointing to: https://{AccountId}.r2.cloudflarestorage.com
///
/// Required Fly.io secrets (set via `fly secrets set`):
///   Storage__R2__AccountId        = your-account-id
///   Storage__R2__BucketName       = your-bucket-name
///   Storage__R2__AccessKeyId      = your-r2-access-key-id
///   Storage__R2__SecretAccessKey  = your-r2-secret-access-key
///   Storage__R2__PublicBaseUrl    = https://assets.boioot.net
///
/// This class is only registered when all required settings are present.
/// If any are missing, DI falls back to LocalFileStorageService automatically.
/// </summary>
public sealed class R2FileStorageService : IFileStorageService, IAsyncDisposable
{
    private readonly AmazonS3Client _s3;
    private readonly R2Options      _r2;
    private readonly ILogger<R2FileStorageService> _logger;

    public R2FileStorageService(
        IOptions<StorageOptions>     options,
        ILogger<R2FileStorageService> logger)
    {
        _r2    = options.Value.R2;
        _logger = logger;

        // Cloudflare R2 uses path-style addressing with a custom endpoint
        var config = new AmazonS3Config
        {
            ServiceURL      = $"https://{_r2.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle  = true,   // Required for R2
            RequestTimeout  = TimeSpan.FromSeconds(30),
            ReadWriteTimeout = TimeSpan.FromSeconds(30),
        };

        var credentials = new BasicAWSCredentials(_r2.AccessKeyId, _r2.SecretAccessKey);
        _s3 = new AmazonS3Client(credentials, config);
    }

    // ── UploadAsync ───────────────────────────────────────────────────────────

    public async Task<FileUploadResult> UploadAsync(
        Stream            content,
        string            fileName,
        string            contentType,
        string            folder = "uploads",
        CancellationToken ct     = default)
    {
        var ext      = Path.GetExtension(fileName).ToLowerInvariant();
        var safeName = $"{Guid.NewGuid()}{ext}";

        // Build the R2 object key: folder/uuid.ext
        var safeFolder = folder.Trim('/').Replace("..", string.Empty);
        if (string.IsNullOrWhiteSpace(safeFolder)) safeFolder = "uploads";
        var fileKey = $"{safeFolder}/{safeName}";

        var request = new PutObjectRequest
        {
            BucketName  = _r2.BucketName,
            Key         = fileKey,
            InputStream = content,
            ContentType = contentType,
            // Do NOT set CannedACL — R2 ignores ACLs; access is controlled by bucket policy.
            DisablePayloadSigning = true, // Required for R2 compatibility
        };

        await _s3.PutObjectAsync(request, ct);

        var publicUrl = GetPublicUrl(fileKey);

        _logger.LogInformation(
            "[R2Storage] Uploaded → Bucket={Bucket} Key={Key} ContentType={ContentType}",
            _r2.BucketName, fileKey, contentType);

        return new FileUploadResult(fileKey, publicUrl);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    public async Task DeleteAsync(string fileKey, CancellationToken ct = default)
    {
        try
        {
            var request = new DeleteObjectRequest
            {
                BucketName = _r2.BucketName,
                Key        = fileKey,
            };
            await _s3.DeleteObjectAsync(request, ct);
            _logger.LogInformation("[R2Storage] Deleted key={Key}", fileKey);
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            // Silently succeed — file already gone
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "[R2Storage] Failed to delete key={Key}", fileKey);
        }
    }

    // ── GetPublicUrl ──────────────────────────────────────────────────────────

    public string GetPublicUrl(string fileKey)
    {
        var baseUrl = _r2.PublicBaseUrl.TrimEnd('/');
        var key     = fileKey.TrimStart('/');
        return $"{baseUrl}/{key}";
    }

    // ── Dispose ───────────────────────────────────────────────────────────────

    public ValueTask DisposeAsync()
    {
        _s3.Dispose();
        return ValueTask.CompletedTask;
    }
}
