using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

[ApiController]
[Route("api/upload")]
[Authorize]
public class UploadController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ILogger<UploadController> _logger;

    private static readonly string[] AllowedImageTypes =
    [
        "image/jpeg", "image/jpg", "image/png", "image/gif",
        "image/webp", "image/svg+xml", "image/bmp",
    ];

    private const long MaxImageBytes = 10L * 1024 * 1024; // 10 MB

    private static readonly string[] AllowedVideoTypes =
    [
        "video/mp4", "video/webm", "video/ogg",
        "video/quicktime", "video/x-msvideo"
    ];

    private const long MaxVideoBytes = 50L * 1024 * 1024; // 50 MB

    public UploadController(IWebHostEnvironment env, ILogger<UploadController> logger)
    {
        _env = env;
        _logger = logger;
    }

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
}
