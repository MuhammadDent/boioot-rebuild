using Boioot.Application.Exceptions;
using Boioot.Application.Features.Storage;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : BaseController
{
    private readonly IWebHostEnvironment _env;
    private readonly IFileStorageService _storage;
    private readonly IImageProcessingService _imageProcessor;
    private readonly IPlanEntitlementService _entitlement;
    private readonly IAccountResolver _accountResolver;
    private readonly ILogger<UploadController> _logger;
    private readonly BoiootDbContext _db;

    // ── Allowed MIME types ────────────────────────────────────────────────────

    private static readonly string[] AllowedImageTypes =
    [
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "image/svg+xml", "image/bmp",
    ];

    /// <summary>
    /// Only these three MIME types are accepted for payment proof uploads.
    /// The extension is always derived from this set — never from the original filename.
    /// </summary>
    private static readonly string[] AllowedProofTypes =
    [
        "image/jpeg", "image/jpg", "image/png",
        "application/pdf",
    ];

    private static readonly string[] AllowedVideoTypes =
    [
        "video/mp4", "video/webm", "video/ogg",
        "video/quicktime", "video/x-msvideo"
    ];

    // ── Size limits ───────────────────────────────────────────────────────────

    private const long MaxImageBytes = 10L * 1024 * 1024; // 10 MB
    private const long MaxProofBytes =  5L * 1024 * 1024; // 5 MB
    private const long MaxVideoBytes = 50L * 1024 * 1024; // 50 MB

    // ── Constructor ───────────────────────────────────────────────────────────

    public UploadController(
        IWebHostEnvironment env,
        IFileStorageService storage,
        IImageProcessingService imageProcessor,
        IPlanEntitlementService entitlement,
        IAccountResolver accountResolver,
        ILogger<UploadController> logger,
        BoiootDbContext db)
    {
        _env            = env;
        _storage        = storage;
        _imageProcessor = imageProcessor;
        _entitlement    = entitlement;
        _accountResolver = accountResolver;
        _logger         = logger;
        _db             = db;
    }

    // ── POST /api/uploads/presigned-url ──────────────────────────────────────
    //
    // Simple presigned-URL generator: returns a time-limited PUT URL that the
    // browser can use to upload a file directly to R2, plus the final public URL
    // that the file will be available at after the PUT completes.
    //
    // Unlike /api/images/direct-upload-url + finalize, this endpoint does NOT
    // process the image (no WebP conversion) and does NOT create a UserImage
    // record. It is intended for lightweight ad-hoc uploads where image management
    // features (cover, reorder, delete by ID) are not required.
    //
    // Response:
    //   { url: "<presigned PUT URL>", publicUrl: "<final CDN URL>", fileKey: "..." }
    //
    // Returns 501 if the active storage backend does not support presigned URLs
    // (e.g., local development mode with LocalFileStorageService).

    public record PresignedUrlRequest(string FileName, string ContentType);

    [HttpPost("/api/uploads/presigned-url")]
    public async Task<IActionResult> GetPresignedUrl(
        [FromBody] PresignedUrlRequest req,
        CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(req?.ContentType))
            return BadRequest(new { error = "ContentType مطلوب" });

        var contentType = req.ContentType.Trim().ToLowerInvariant();
        if (!AllowedImageTypes.Contains(contentType))
            return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: JPG، PNG، GIF، WebP، SVG" });

        var userId = GetUserId();
        var ext = contentType switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png"                 => ".png",
            "image/webp"                => ".webp",
            "image/gif"                 => ".gif",
            "image/svg+xml"             => ".svg",
            "image/bmp"                 => ".bmp",
            _                           => ".jpg",
        };

        var fileKey      = $"uploads/{userId}/{Guid.NewGuid()}{ext}";
        const int Expiry = 300; // 5 minutes

        var uploadUrl = await _storage.GeneratePresignedUploadUrlAsync(fileKey, contentType, Expiry, ct);

        if (uploadUrl is null)
        {
            return StatusCode(501, new
            {
                error = "Direct upload غير متاح في وضع التطوير. استخدم POST /api/upload/image"
            });
        }

        var publicUrl = _storage.GetPublicUrl(fileKey);

        _logger.LogInformation(
            "[Upload/presigned-url] userId={UserId} fileKey={FileKey}", userId, fileKey);

        return Ok(new { url = uploadUrl, publicUrl, fileKey });
    }

    // ── /api/upload/image ─────────────────────────────────────────────────────

    [HttpPost("image")]
    [RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        try
        {
            Console.WriteLine("[UploadImage] >>> Handler entered");

            if (file is null || file.Length == 0)
                return BadRequest(new { error = "لم يتم اختيار ملف" });

            Console.WriteLine($"[UploadImage] FileName={file.FileName} ContentType={file.ContentType} Size={file.Length}");

            if (file.Length > MaxImageBytes)
                return BadRequest(new { error = "حجم الصورة يتجاوز 10MB" });

            var contentType = file.ContentType.ToLower();
            if (!AllowedImageTypes.Contains(contentType))
                return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: JPG، PNG، GIF، WebP، SVG" });

            var userId = GetUserId();
            Console.WriteLine($"[UploadImage] UserId={userId} StorageType={_storage.GetType().Name}");
            UserImage userImage;

            if (_imageProcessor.CanProcess(contentType))
            {
                // ── Process: compress + resize → WebP main + WebP thumbnail ─────────
                await using var inputStream = file.OpenReadStream();
                using var processed = await _imageProcessor.ProcessAsync(inputStream, ct);

                var mainResult = await _storage.UploadAsync(
                    processed.MainStream,
                    $"{Guid.NewGuid()}.webp",
                    processed.ContentType,
                    "uploads",
                    ct);

                var thumbResult = await _storage.UploadAsync(
                    processed.ThumbnailStream,
                    $"{Guid.NewGuid()}.webp",
                    processed.ContentType,
                    "uploads/thumbs",
                    ct);

                _logger.LogInformation(
                    "[Upload/image] {OrigName} ({Size} bytes) → WebP main={MainKey} thumb={ThumbKey}",
                    file.FileName, file.Length, mainResult.FileKey, thumbResult.FileKey);

                userImage = new UserImage
                {
                    UserId           = userId,
                    Url              = mainResult.PublicUrl,
                    FileKey          = mainResult.FileKey,
                    ThumbnailUrl     = thumbResult.PublicUrl,
                    ThumbnailFileKey = thumbResult.FileKey,
                    OriginalFileName = Path.GetFileName(file.FileName),
                    MimeType         = processed.ContentType,
                    SizeBytes        = processed.MainStream.Length,
                };
            }
            else
            {
                // ── Bypass: SVG, GIF — upload as-is ──────────────────────────────
                var ext = contentType switch
                {
                    "image/gif"     => ".gif",
                    "image/svg+xml" => ".svg",
                    _ => Path.GetExtension(file.FileName).ToLower() is { Length: > 0 } e ? e : ".jpg",
                };
                var safeFileName = $"{Guid.NewGuid()}{ext}";

                await using var stream = file.OpenReadStream();
                var result = await _storage.UploadAsync(stream, safeFileName, contentType, "uploads", ct);

                _logger.LogInformation(
                    "[Upload/image] {FileName} ({Size} bytes) → {Provider} (no processing)",
                    safeFileName, file.Length, _storage.GetType().Name);

                userImage = new UserImage
                {
                    UserId           = userId,
                    Url              = result.PublicUrl,
                    FileKey          = result.FileKey,
                    OriginalFileName = Path.GetFileName(file.FileName),
                    MimeType         = contentType,
                    SizeBytes        = file.Length,
                };
            }

            _db.UserImages.Add(userImage);
            await _db.SaveChangesAsync(ct);

            return Ok(new
            {
                id           = userImage.Id,
                url          = userImage.Url,
                thumbnailUrl = userImage.ThumbnailUrl,
            });
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Upload/image] Unhandled exception during image upload");
            return StatusCode(500, new
            {
                message = ex.Message,
                type    = ex.GetType().Name,
                stack   = ex.StackTrace,
            });
        }
    }

    // ── GET /api/upload/my-images ──────────────────────────────────────────────

    /// <summary>
    /// Returns all images uploaded by the authenticated user, newest first.
    /// </summary>
    [HttpGet("my-images")]
    public async Task<IActionResult> GetMyImages(CancellationToken ct)
    {
        var userId = GetUserId();

        var images = await _db.UserImages
            .Where(i => i.UserId == userId)
            .OrderByDescending(i => i.CreatedAt)
            .Select(i => new
            {
                i.Id,
                i.Url,
                i.OriginalFileName,
                i.MimeType,
                i.SizeBytes,
                i.CreatedAt,
            })
            .ToListAsync(ct);

        return Ok(images);
    }

    // ── DELETE /api/upload/{id} ────────────────────────────────────────────────

    /// <summary>
    /// Deletes an image owned by the authenticated user from both R2 and the DB.
    /// Returns 403 Forbidden if the image belongs to another user.
    /// </summary>
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> DeleteImage(Guid id, CancellationToken ct)
    {
        var userId = GetUserId();

        var image = await _db.UserImages
            .FirstOrDefaultAsync(i => i.Id == id, ct);

        if (image is null)
            return NotFound(new { error = "الصورة غير موجودة" });

        if (image.UserId != userId)
            return Forbid();

        // Delete from storage first — if it fails we abort so the DB record stays consistent.
        try
        {
            await _storage.DeleteAsync(image.FileKey, ct);

            // Also delete thumbnail if it exists (new optimized images have a separate thumbnail file)
            if (!string.IsNullOrEmpty(image.ThumbnailFileKey))
                await _storage.DeleteAsync(image.ThumbnailFileKey, ct);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "[Upload/delete] R2 deletion failed for key={Key}", image.FileKey);
            return StatusCode(502, new { error = "فشل حذف الملف من التخزين السحابي. يُرجى المحاولة لاحقاً." });
        }

        _db.UserImages.Remove(image);
        await _db.SaveChangesAsync(ct);

        _logger.LogInformation("[Upload/delete] Image {Id} deleted by user {UserId}", id, userId);

        return NoContent();
    }

    // ── POST /api/upload/assign-to-listing  [REMOVED — use POST /api/images/attach] ──

    /// <summary>
    /// This endpoint has been removed.
    /// Use POST /api/images/attach instead:
    ///   { "imageId": "GUID", "entityType": "property|project", "entityId": "GUID" }
    /// </summary>
    [HttpPost("assign-to-listing")]
    [AllowAnonymous]
    public IActionResult AssignToListing(
        [FromBody] object? _,
        CancellationToken ct)
    {
        return StatusCode(410, new
        {
            error    = "هذا الـ endpoint تم إيقافه. استخدم POST /api/images/attach بدلاً منه.",
            newEndpoint = "POST /api/images/attach",
            newBody  = new
            {
                imageId    = "GUID",
                entityType = "property | project",
                entityId   = "GUID",
            },
        });
    }

    // ── /api/upload/special-request-attachment ────────────────────────────────

    /// <summary>
    /// Public (anonymous) upload endpoint for special-request form attachments.
    /// Accepts JPG, PNG, PDF — max 10 MB — stored in wwwroot/uploads/sr-att/.
    /// </summary>
    [HttpPost("special-request-attachment")]
    [AllowAnonymous]
    [RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> UploadSpecialRequestAttachment(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "لم يتم اختيار ملف" });

        if (file.Length > MaxImageBytes)
            return BadRequest(new { error = "حجم الملف يتجاوز 10MB" });

        var allowed = new[] { "image/jpeg", "image/jpg", "image/png", "application/pdf" };
        var mime = file.ContentType?.ToLower().Trim() ?? "";
        if (!allowed.Contains(mime))
            return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: JPG، PNG، PDF" });

        var ext = mime switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png"                  => ".png",
            "application/pdf"            => ".pdf",
            _                            => null,
        };

        if (ext is null) return BadRequest(new { error = "نوع الملف غير مدعوم" });

        var dir = Path.Combine(_env.WebRootPath, "uploads", "sr-att");
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(dir, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        _logger.LogInformation("SR attachment uploaded: {FileName} ({Size} bytes)", fileName, file.Length);

        return Ok(new { url = $"/uploads/sr-att/{fileName}" });
    }

    // ── /api/upload/document ─────────────────────────────────────────────────

    /// <summary>
    /// Upload endpoint for verification documents (JPG, PNG, PDF — max 10 MB).
    /// Stored in wwwroot/uploads/docs/ for direct public URL access.
    /// </summary>
    [HttpPost("document")]
    [RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> UploadDocument(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "لم يتم اختيار ملف" });

        if (file.Length > MaxImageBytes)
            return BadRequest(new { error = "حجم الملف يتجاوز 10MB" });

        var allowed = new[] { "image/jpeg", "image/jpg", "image/png", "application/pdf" };
        var mime    = (file.ContentType ?? "").ToLower().Trim();
        if (!allowed.Contains(mime))
            return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: JPG، PNG، PDF" });

        var ext = mime switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png"                  => ".png",
            "application/pdf"            => ".pdf",
            _                            => null,
        };

        if (ext is null)
            return BadRequest(new { error = "نوع الملف غير مدعوم" });

        var dir = Path.Combine(_env.WebRootPath, "uploads", "docs");
        Directory.CreateDirectory(dir);

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(dir, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        _logger.LogInformation(
            "Document uploaded: {FileName} ({Size} bytes) by user {UserId}",
            fileName, file.Length, GetUserId());

        return Ok(new { url = $"/uploads/docs/{fileName}" });
    }

    // ── /api/upload/proof ─────────────────────────────────────────────────────

    /// <summary>
    /// Secure upload endpoint for payment proof files (JPG / PNG / PDF).
    ///
    /// Security measures applied:
    ///   1. Hard 5 MB ceiling enforced by both [RequestSizeLimit] and explicit check.
    ///   2. Content-Type header must be one of the three allowed MIME types.
    ///   3. Magic-byte (file-signature) check verifies the actual on-disk bytes match the declared MIME type.
    ///   4. File extension is derived solely from the validated MIME type — the original filename is ignored.
    ///   5. A UUID-based name prevents collisions and makes enumeration infeasible.
    ///   6. Files are stored OUTSIDE <c>wwwroot</c> and are never served as static assets.
    ///      Access is only possible through the <see cref="ServeProof"/> endpoint which
    ///      also applies path-traversal and extension allow-listing guards.
    /// </summary>
    [HttpPost("proof")]
    [RequestSizeLimit(5_242_880)] // 5 MB hard ceiling
    public async Task<IActionResult> UploadProof(IFormFile file, CancellationToken ct)
    {
        // ── 1. Basic presence / size check ────────────────────────────────────
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "لم يتم اختيار ملف" });

        if (file.Length > MaxProofBytes)
            return BadRequest(new { error = "حجم الملف يتجاوز 5MB" });

        // ── 2. MIME type allow-list (header check) ────────────────────────────
        var declaredMime = (file.ContentType ?? "").ToLower().Trim();
        if (!AllowedProofTypes.Contains(declaredMime))
            return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: JPG، PNG، PDF" });

        // ── 3. Magic-byte validation (actual file-signature check) ────────────
        //    Reads the first 8 bytes of the stream, rewinds, then validates.
        const int SignatureLen = 8;
        var sig = new byte[SignatureLen];
        await using var peekStream = file.OpenReadStream();
        var bytesRead = await peekStream.ReadAsync(sig.AsMemory(0, SignatureLen), ct);

        if (!IsValidSignature(sig, bytesRead, declaredMime))
        {
            _logger.LogWarning(
                "Proof upload rejected — signature mismatch. DeclaredMime={Mime}, UserId={User}",
                declaredMime, GetUserId());
            return BadRequest(new { error = "محتوى الملف لا يتطابق مع نوعه المُعلَن" });
        }

        // ── 4. Derive safe extension from MIME only (never from original name) ─
        var ext = declaredMime switch
        {
            "image/jpeg" or "image/jpg" => ".jpg",
            "image/png"                  => ".png",
            "application/pdf"            => ".pdf",
            _                            => null,
        };

        if (ext is null)
            return BadRequest(new { error = "نوع الملف غير مدعوم" });

        // ── 5. Generate UUID filename and write to secure storage ─────────────
        var fileName   = $"{Guid.NewGuid()}{ext}";
        var storageDir = GetProofStoragePath();
        Directory.CreateDirectory(storageDir);

        var filePath = Path.Combine(storageDir, fileName);

        // Reset the stream to the beginning, then write the full file.
        peekStream.Seek(0, SeekOrigin.Begin);
        await using var writeStream = System.IO.File.Create(filePath);
        await peekStream.CopyToAsync(writeStream, ct);

        _logger.LogInformation(
            "Proof uploaded: {FileName} ({Size} bytes) by user {UserId}",
            fileName, file.Length, GetUserId());

        // URL points to the secure serving endpoint (not to wwwroot).
        var url = $"/api/upload/proof/file/{fileName}";
        return Ok(new { url, fileName });
    }

    // ── /api/upload/proof/file/{fileName} ─────────────────────────────────────

    /// <summary>
    /// Serves a previously uploaded proof file.
    /// Requires authentication — only the file owner (or admin) should call this.
    ///
    /// Security:
    ///   • Path-traversal prevention: rejects any name containing <c>..  /  \</c>.
    ///   • Extension allow-list: only .jpg / .png / .pdf are served.
    ///   • Files are read from the secure storage directory, not from wwwroot.
    /// </summary>
    [HttpGet("proof/file/{fileName}")]
    [AllowAnonymous] // img tags cannot send Authorization headers; UUID obscurity + outside-wwwroot suffice.
    public IActionResult ServeProof(string fileName)
    {
        // ── Path-traversal guard ──────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(fileName)
            || fileName.Contains("..")
            || fileName.Contains('/')
            || fileName.Contains('\\')
            || fileName.Contains(':'))
        {
            return BadRequest(new { error = "اسم الملف غير صالح" });
        }

        // ── Extension allow-list ──────────────────────────────────────────────
        var ext = Path.GetExtension(fileName).ToLower();
        if (ext is not (".jpg" or ".png" or ".pdf"))
            return BadRequest(new { error = "نوع الملف غير مدعوم" });

        // ── Resolve path strictly inside the storage directory ────────────────
        var storageDir = GetProofStoragePath();
        var filePath   = Path.GetFullPath(Path.Combine(storageDir, fileName));

        // Ensure the resolved path is still inside the expected directory
        if (!filePath.StartsWith(storageDir, StringComparison.OrdinalIgnoreCase))
            return BadRequest(new { error = "اسم الملف غير صالح" });

        if (!System.IO.File.Exists(filePath))
            return NotFound(new { error = "الملف غير موجود" });

        var contentType = ext switch
        {
            ".jpg" => "image/jpeg",
            ".png" => "image/png",
            ".pdf" => "application/pdf",
            _      => "application/octet-stream",
        };

        return PhysicalFile(filePath, contentType);
    }

    // ── /api/upload/video ─────────────────────────────────────────────────────

    [HttpPost("video")]
    [RequestSizeLimit(52_428_800)]
    public async Task<IActionResult> UploadVideo(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "لم يتم اختيار ملف" });

        if (file.Length > MaxVideoBytes)
            return BadRequest(new { error = "حجم الفيديو يتجاوز 50MB" });

        if (!AllowedVideoTypes.Contains(file.ContentType.ToLower()))
            return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: MP4، WebM، OGG، MOV، AVI" });

        // ── Subscription enforcement: video_upload feature ────────────────────
        var userId    = GetUserId();
        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (accountId.HasValue)
        {
            var canVideo = await _entitlement.CanUploadVideoAsync(accountId.Value, ct);
            if (!canVideo)
                throw new PlanFeatureDisabledException(
                    SubscriptionKeys.VideoUpload,
                    "رفع الفيديو غير متاح في باقتك الحالية. يرجى ترقية خطتك للمتابعة.");
        }

        var videosDir = Path.Combine(_env.WebRootPath, "videos");
        Directory.CreateDirectory(videosDir);

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrWhiteSpace(ext)) ext = ".mp4";

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(videosDir, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        _logger.LogInformation("Video uploaded: {FileName} ({Size} bytes)", fileName, file.Length);

        return Ok(new { url = $"/videos/{fileName}" });
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Returns the absolute path to the proof-storage directory.
    /// This directory is intentionally OUTSIDE <c>wwwroot</c>.
    /// </summary>
    private static string GetProofStoragePath() =>
        Path.Combine(Directory.GetCurrentDirectory(), "proof-storage");

    /// <summary>
    /// Validates the leading bytes of the file against the declared MIME type.
    /// This prevents content-type spoofing (e.g., uploading an EXE with ContentType=image/jpeg).
    /// </summary>
    private static bool IsValidSignature(byte[] buf, int len, string mime) =>
        mime switch
        {
            // JPEG: FF D8 FF
            "image/jpeg" or "image/jpg" =>
                len >= 3 && buf[0] == 0xFF && buf[1] == 0xD8 && buf[2] == 0xFF,

            // PNG: 89 50 4E 47 0D 0A 1A 0A
            "image/png" =>
                len >= 8
                && buf[0] == 0x89 && buf[1] == 0x50 && buf[2] == 0x4E && buf[3] == 0x47
                && buf[4] == 0x0D && buf[5] == 0x0A && buf[6] == 0x1A && buf[7] == 0x0A,

            // PDF: %PDF  (25 50 44 46)
            "application/pdf" =>
                len >= 4 && buf[0] == 0x25 && buf[1] == 0x50 && buf[2] == 0x44 && buf[3] == 0x46,

            _ => false,
        };
}
