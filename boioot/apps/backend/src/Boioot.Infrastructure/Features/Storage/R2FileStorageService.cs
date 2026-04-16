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
///
/// Direct upload notes:
///   • GeneratePresignedUploadUrlAsync() creates a time-limited PUT URL that the
///     browser can use to upload directly to R2, bypassing the API server.
///   • The R2 bucket MUST have CORS configured to allow PUT from browser origins.
///     Example CORS rule: AllowedOrigins=["*"], AllowedMethods=["PUT"]
///   • Finalize your direct upload via POST /api/images/finalize-direct-upload
///     which downloads, processes, and registers the UserImage.
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
            ServiceURL     = $"https://{_r2.AccountId}.r2.cloudflarestorage.com",
            ForcePathStyle = true,   // Required for R2
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

        // Long-lived caching: UUID-named files are content-addressed and never mutated.
        // Browsers + CDN will cache for 1 year; immutable tells them never to revalidate.
        request.Headers["Cache-Control"] = "public, max-age=31536000, immutable";

        await _s3.PutObjectAsync(request, ct);

        var publicUrl = GetPublicUrl(fileKey);

        _logger.LogInformation(
            "[R2Storage] Uploaded → Bucket={Bucket} Key={Key} ContentType={ContentType}",
            _r2.BucketName, fileKey, contentType);

        return new FileUploadResult(fileKey, publicUrl);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    /// <summary>
    /// Deletes the object at <paramref name="fileKey"/> from R2.
    /// Silently succeeds if the key does not exist (404) — nothing to delete.
    /// Any other error (network, auth, etc.) is re-thrown so callers can handle it explicitly.
    /// </summary>
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
            // File already gone — treat as success
            _logger.LogInformation("[R2Storage] Key not found (already deleted): {Key}", fileKey);
        }
        // All other exceptions propagate to the caller so they can return a proper error response.
    }

    // ── GetPublicUrl ──────────────────────────────────────────────────────────

    public string GetPublicUrl(string fileKey)
    {
        var baseUrl = _r2.PublicBaseUrl.TrimEnd('/');
        var key     = fileKey.TrimStart('/');
        return $"{baseUrl}/{key}";
    }

    // ── GeneratePresignedUploadUrlAsync ───────────────────────────────────────

    /// <summary>
    /// Creates a time-limited PUT presigned URL for direct browser upload to R2.
    ///
    /// Content-Type is intentionally NOT included in the signed headers.
    /// Including it causes SignatureDoesNotMatch (401) when the browser sends a
    /// slightly different MIME type string (e.g. "image/jpeg" vs "image/jpg").
    /// The browser PUT request can send any Content-Type header it wants; R2 will
    /// store whatever it receives.  We validate the content type separately in the
    /// finalize step by inspecting the downloaded file.
    ///
    /// CORS note: the bucket CORS is configured at startup via EnsureBucketCorsAsync().
    /// </summary>
    public Task<string?> GeneratePresignedUploadUrlAsync(
        string            fileKey,
        string            contentType,
        int               expiresInSeconds,
        CancellationToken ct = default)
    {
        var request = new GetPreSignedUrlRequest
        {
            BucketName = _r2.BucketName,
            Key        = fileKey,
            Verb       = HttpVerb.PUT,
            Expires    = DateTime.UtcNow.AddSeconds(expiresInSeconds),
            // ⚠ Do NOT set ContentType here — it becomes a signed header and
            //   causes 401 SignatureDoesNotMatch if the browser sends a different
            //   (but equivalent) MIME type string.
        };

        // GetPreSignedURL is synchronous in the AWS SDK for .NET
        var url = _s3.GetPreSignedURL(request);

        _logger.LogInformation(
            "[R2Storage] Presigned PUT URL generated: key={Key} contentType={CT} expiresIn={Exp}s",
            fileKey, contentType, expiresInSeconds);

        return Task.FromResult<string?>(url);
    }

    // ── EnsureBucketCorsAsync ─────────────────────────────────────────────────

    /// <summary>
    /// Applies CORS rules to the R2 bucket so that browsers can PUT files
    /// directly from production origins.
    ///
    /// Safe to call on every startup — PutBucketCors is idempotent (overwrites).
    /// Errors are logged but do NOT prevent the application from starting.
    /// </summary>
    public async Task EnsureBucketCorsAsync(CancellationToken ct = default)
    {
        try
        {
            var corsConfig = new CORSConfiguration
            {
                Rules =
                [
                    new CORSRule
                    {
                        // Allow PUT from all known production and development origins.
                        // "*" is included as a safe fallback for Vercel preview URLs.
                        AllowedOrigins = ["https://boioot.net", "https://www.boioot.net", "*"],
                        AllowedMethods = ["GET", "PUT", "POST", "HEAD"],
                        AllowedHeaders = ["*"],
                        ExposeHeaders  = ["ETag"],
                        MaxAgeSeconds  = 3000,
                    }
                ]
            };

            await _s3.PutCORSConfigurationAsync(new PutCORSConfigurationRequest
            {
                BucketName    = _r2.BucketName,
                Configuration = corsConfig,
            }, ct);

            _logger.LogInformation(
                "[R2Storage] CORS configured on bucket '{Bucket}': " +
                "AllowedOrigins=[boioot.net, www.boioot.net, *] Methods=[GET,PUT,POST,HEAD]",
                _r2.BucketName);
        }
        catch (Exception ex)
        {
            // Log but do not crash — missing CORS is caught during upload attempts.
            _logger.LogWarning(ex,
                "[R2Storage] Failed to configure bucket CORS (bucket='{Bucket}'). " +
                "Direct uploads from browsers may fail with CORS errors. " +
                "Configure CORS manually in the Cloudflare dashboard if this persists.",
                _r2.BucketName);
        }
    }

    // ── ObjectExistsAsync ─────────────────────────────────────────────────────

    /// <summary>
    /// Checks whether the object exists at <paramref name="fileKey"/> in R2.
    /// Used by the finalize endpoint to confirm the browser PUT completed.
    /// </summary>
    public async Task<bool> ObjectExistsAsync(string fileKey, CancellationToken ct = default)
    {
        try
        {
            await _s3.GetObjectMetadataAsync(_r2.BucketName, fileKey, ct);
            return true;
        }
        catch (AmazonS3Exception ex) when (ex.StatusCode == System.Net.HttpStatusCode.NotFound)
        {
            return false;
        }
    }

    // ── GetObjectStreamAsync ──────────────────────────────────────────────────

    /// <summary>
    /// Downloads the object at <paramref name="fileKey"/> from R2 and returns its
    /// content as a seekable <see cref="MemoryStream"/>.
    ///
    /// Note: the original S3 response stream is not seekable, so the content is
    /// buffered into a MemoryStream. This is acceptable for image files (≤ 10 MB).
    /// The caller is responsible for disposing the returned stream.
    /// </summary>
    public async Task<Stream> GetObjectStreamAsync(string fileKey, CancellationToken ct = default)
    {
        var response = await _s3.GetObjectAsync(_r2.BucketName, fileKey, ct);

        // Buffer into MemoryStream so it is seekable (required by ImageSharp)
        var ms = new MemoryStream();
        await response.ResponseStream.CopyToAsync(ms, ct);
        ms.Position = 0;

        _logger.LogInformation("[R2Storage] Downloaded {Key} ({Bytes} bytes) for processing",
            fileKey, ms.Length);

        return ms;
    }

    // ── Dispose ───────────────────────────────────────────────────────────────

    public ValueTask DisposeAsync()
    {
        _s3.Dispose();
        return ValueTask.CompletedTask;
    }
}
