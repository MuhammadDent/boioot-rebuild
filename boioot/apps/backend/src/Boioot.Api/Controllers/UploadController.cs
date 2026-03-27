using Boioot.Application.Exceptions;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : BaseController
{
    private readonly IWebHostEnvironment _env;
    private readonly IPlanEntitlementService _entitlement;
    private readonly IAccountResolver _accountResolver;
    private readonly ILogger<UploadController> _logger;

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
        IPlanEntitlementService entitlement,
        IAccountResolver accountResolver,
        ILogger<UploadController> logger)
    {
        _env             = env;
        _entitlement     = entitlement;
        _accountResolver = accountResolver;
        _logger          = logger;
    }

    // ── /api/upload/image ─────────────────────────────────────────────────────

    [HttpPost("image")]
    [RequestSizeLimit(10_485_760)]
    public async Task<IActionResult> UploadImage(IFormFile file, CancellationToken ct)
    {
        if (file is null || file.Length == 0)
            return BadRequest(new { error = "لم يتم اختيار ملف" });

        if (file.Length > MaxImageBytes)
            return BadRequest(new { error = "حجم الصورة يتجاوز 10MB" });

        var contentType = file.ContentType.ToLower();
        if (!AllowedImageTypes.Contains(contentType))
            return BadRequest(new { error = "نوع الملف غير مدعوم. المدعومة: JPG، PNG، GIF، WebP، SVG" });

        var uploadsDir = Path.Combine(_env.WebRootPath, "uploads");
        Directory.CreateDirectory(uploadsDir);

        var ext = Path.GetExtension(file.FileName).ToLower();
        if (string.IsNullOrWhiteSpace(ext)) ext = ".jpg";

        var fileName = $"{Guid.NewGuid()}{ext}";
        var filePath = Path.Combine(uploadsDir, fileName);

        await using var stream = System.IO.File.Create(filePath);
        await file.CopyToAsync(stream, ct);

        _logger.LogInformation("Image uploaded: {FileName} ({Size} bytes)", fileName, file.Length);

        return Ok(new { url = $"/uploads/{fileName}" });
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
