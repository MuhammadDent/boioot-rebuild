using Boioot.Application.Features.Storage;
using Boioot.Application.Features.Storage.Settings;
using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace Boioot.Infrastructure.Features.Storage;

/// <summary>
/// Local filesystem implementation of IFileStorageService.
///
/// Files are written to: {WebRootPath}/{folder}/{uuid}{ext}
/// Public URL returned:  {LocalPublicBasePath}/{folder}/{uuid}{ext}
///
/// This is the default/fallback implementation used when:
///   - Storage:Provider is "Local" (explicit)
///   - Storage:Provider is "R2" but R2 credentials are not fully configured
///
/// IMPORTANT: On Fly.io the local filesystem is ephemeral — files are lost
/// on every deploy or container restart. This implementation is intentionally
/// a safe fallback for development and early production stages only.
///
/// Direct upload (presigned URLs) is NOT supported in local mode.
/// GeneratePresignedUploadUrlAsync returns null — callers should fall back
/// to POST /api/upload/image for traditional multipart upload.
/// </summary>
public sealed class LocalFileStorageService : IFileStorageService
{
    private readonly IWebHostEnvironment _env;
    private readonly StorageOptions      _options;
    private readonly ILogger<LocalFileStorageService> _logger;

    public LocalFileStorageService(
        IWebHostEnvironment            env,
        IOptions<StorageOptions>       options,
        ILogger<LocalFileStorageService> logger)
    {
        _env     = env;
        _options = options.Value;
        _logger  = logger;
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

        // Sanitize folder: strip leading slashes, no path traversal
        var safeFolder = folder.Trim('/').Replace("..", string.Empty);
        if (string.IsNullOrWhiteSpace(safeFolder)) safeFolder = "uploads";

        var dir      = Path.Combine(_env.WebRootPath, safeFolder);
        Directory.CreateDirectory(dir);

        var filePath = Path.Combine(dir, safeName);
        await using var fs = File.Create(filePath);
        await content.CopyToAsync(fs, ct);

        // fileKey doubles as the relative URL segment
        var fileKey   = $"{safeFolder}/{safeName}";
        var publicUrl = BuildPublicUrl(fileKey);

        _logger.LogInformation(
            "[LocalStorage] Uploaded {FileName} → {FilePath} ({ContentType})",
            safeName, filePath, contentType);

        return new FileUploadResult(fileKey, publicUrl);
    }

    // ── DeleteAsync ───────────────────────────────────────────────────────────

    public Task DeleteAsync(string fileKey, CancellationToken ct = default)
    {
        var safePath = Path.GetFullPath(
            Path.Combine(_env.WebRootPath, fileKey.TrimStart('/')));

        // Path-traversal guard: must remain inside WebRootPath
        if (!safePath.StartsWith(_env.WebRootPath, StringComparison.OrdinalIgnoreCase))
        {
            _logger.LogWarning("[LocalStorage] DeleteAsync rejected — path traversal attempt: {Key}", fileKey);
            return Task.CompletedTask;
        }

        if (File.Exists(safePath))
        {
            File.Delete(safePath);
            _logger.LogInformation("[LocalStorage] Deleted {Path}", safePath);
        }

        return Task.CompletedTask;
    }

    // ── GetPublicUrl ──────────────────────────────────────────────────────────

    public string GetPublicUrl(string fileKey) => BuildPublicUrl(fileKey);

    // ── GeneratePresignedUploadUrlAsync ───────────────────────────────────────

    /// <summary>
    /// Presigned URLs are not supported in local storage mode.
    /// Returns null — callers should fall back to POST /api/upload/image.
    /// </summary>
    public Task<string?> GeneratePresignedUploadUrlAsync(
        string            fileKey,
        string            contentType,
        int               expiresInSeconds,
        CancellationToken ct = default)
    {
        _logger.LogWarning(
            "[LocalStorage] GeneratePresignedUploadUrlAsync called but not supported. " +
            "Use POST /api/upload/image instead.");

        return Task.FromResult<string?>(null);
    }

    // ── ObjectExistsAsync ─────────────────────────────────────────────────────

    public Task<bool> ObjectExistsAsync(string fileKey, CancellationToken ct = default)
    {
        var safePath = Path.GetFullPath(Path.Combine(_env.WebRootPath, fileKey.TrimStart('/')));

        if (!safePath.StartsWith(_env.WebRootPath, StringComparison.OrdinalIgnoreCase))
            return Task.FromResult(false);

        return Task.FromResult(File.Exists(safePath));
    }

    // ── GetObjectStreamAsync ──────────────────────────────────────────────────

    public async Task<Stream> GetObjectStreamAsync(string fileKey, CancellationToken ct = default)
    {
        var safePath = Path.GetFullPath(Path.Combine(_env.WebRootPath, fileKey.TrimStart('/')));

        if (!safePath.StartsWith(_env.WebRootPath, StringComparison.OrdinalIgnoreCase))
            throw new UnauthorizedAccessException($"Path traversal attempt: {fileKey}");

        if (!File.Exists(safePath))
            throw new FileNotFoundException($"File not found: {fileKey}");

        var ms = new MemoryStream();
        await using var fs = File.OpenRead(safePath);
        await fs.CopyToAsync(ms, ct);
        ms.Position = 0;
        return ms;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private string BuildPublicUrl(string fileKey)
    {
        // If fileKey already starts with the base path, don't duplicate it
        var key = fileKey.TrimStart('/');
        return $"/{key}";
    }
}
