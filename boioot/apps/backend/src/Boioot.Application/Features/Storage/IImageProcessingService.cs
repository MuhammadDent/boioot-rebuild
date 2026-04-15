namespace Boioot.Application.Features.Storage;

/// <summary>
/// Result of processing an uploaded image.
/// Both streams are positioned at offset 0 and ready to read.
/// Callers are responsible for disposing them after use.
/// </summary>
public sealed class ImageProcessingResult : IDisposable
{
    public MemoryStream MainStream      { get; }
    public MemoryStream ThumbnailStream { get; }

    /// <summary>Always "image/webp" for processed images.</summary>
    public string ContentType { get; }

    public ImageProcessingResult(MemoryStream main, MemoryStream thumbnail, string contentType)
    {
        MainStream      = main;
        ThumbnailStream = thumbnail;
        ContentType     = contentType;
    }

    public void Dispose()
    {
        MainStream.Dispose();
        ThumbnailStream.Dispose();
    }
}

/// <summary>
/// Compresses and resizes images before storage.
/// - Main:      max 1600 × 1600 px, WebP 82% quality
/// - Thumbnail: max 480  × 480  px, WebP 75% quality
/// Unsupported formats (SVG, GIF, PDF) return <c>false</c> from <see cref="CanProcess"/>.
/// </summary>
public interface IImageProcessingService
{
    /// <summary>Returns true when the MIME type can be processed into WebP.</summary>
    bool CanProcess(string mimeType);

    /// <summary>
    /// Processes the input stream and returns compressed main + thumbnail streams.
    /// The caller must dispose the returned <see cref="ImageProcessingResult"/>.
    /// </summary>
    Task<ImageProcessingResult> ProcessAsync(Stream input, CancellationToken ct = default);
}
