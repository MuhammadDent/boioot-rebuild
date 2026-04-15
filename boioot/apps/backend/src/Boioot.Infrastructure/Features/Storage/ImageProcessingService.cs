using Boioot.Application.Features.Storage;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Formats.Webp;
using SixLabors.ImageSharp.Processing;

namespace Boioot.Infrastructure.Features.Storage;

/// <summary>
/// Compresses uploaded images to WebP and generates thumbnails using ImageSharp.
///
/// Main image:  max 1600 × 1600 px — WebP quality 82 (~60-70% size reduction vs JPEG).
/// Thumbnail:   max  480 ×  480 px — WebP quality 75 (~90% size reduction vs original).
///
/// Formats supported: JPEG, PNG, WebP, BMP.
/// Unsupported (SVG, GIF): CanProcess() returns false → caller uploads as-is.
/// </summary>
public sealed class ImageProcessingService : IImageProcessingService
{
    private const int MainMaxPx    = 1600;
    private const int ThumbMaxPx   = 480;
    private const int MainQuality  = 82;
    private const int ThumbQuality = 75;

    private static readonly HashSet<string> ProcessableMimes =
    [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/bmp",
    ];

    public bool CanProcess(string mimeType) =>
        ProcessableMimes.Contains(mimeType.ToLowerInvariant());

    public async Task<ImageProcessingResult> ProcessAsync(
        Stream            input,
        CancellationToken ct = default)
    {
        // ── Load original image ───────────────────────────────────────────────
        using var image = await Image.LoadAsync(input, ct);

        // ── Main: compress + resize if larger than threshold ─────────────────
        using var mainClone = image.Clone(ctx => ResizeIfNeeded(ctx, MainMaxPx));
        var mainStream = new MemoryStream();
        await mainClone.SaveAsWebpAsync(
            mainStream,
            new WebpEncoder { Quality = MainQuality },
            ct);
        mainStream.Position = 0;

        // ── Thumbnail: always resize to thumbnail dimensions ─────────────────
        using var thumbClone = image.Clone(ctx => ResizeToFit(ctx, ThumbMaxPx));
        var thumbStream = new MemoryStream();
        await thumbClone.SaveAsWebpAsync(
            thumbStream,
            new WebpEncoder { Quality = ThumbQuality },
            ct);
        thumbStream.Position = 0;

        return new ImageProcessingResult(mainStream, thumbStream, "image/webp");
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Shrinks the image so neither dimension exceeds <paramref name="maxPx"/>.
    /// Does nothing if the image already fits within the bounding box.
    /// </summary>
    private static void ResizeIfNeeded(IImageProcessingContext ctx, int maxPx)
    {
        var current = ctx.GetCurrentSize();
        if (current.Width > maxPx || current.Height > maxPx)
            ApplyMaxResize(ctx, maxPx);
    }

    /// <summary>
    /// Always resizes so neither dimension exceeds <paramref name="maxPx"/>.
    /// If the image is already smaller, it is still scaled down to the thumbnail size.
    /// </summary>
    private static void ResizeToFit(IImageProcessingContext ctx, int maxPx) =>
        ApplyMaxResize(ctx, maxPx);

    private static void ApplyMaxResize(IImageProcessingContext ctx, int maxPx) =>
        ctx.Resize(new ResizeOptions
        {
            Size = new Size(maxPx, maxPx),
            Mode = ResizeMode.Max,
        });
}
