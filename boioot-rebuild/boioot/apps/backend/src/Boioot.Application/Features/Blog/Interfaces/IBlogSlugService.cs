namespace Boioot.Application.Features.Blog.Interfaces;

public interface IBlogSlugService
{
    /// <summary>Normalize a raw string into a slug (lowercase, hyphens, no specials).</summary>
    string Normalize(string input);

    /// <summary>
    /// Return a slug for a BlogPost that is guaranteed unique in the DB.
    /// If the base slug is taken, appends -1, -2, … until a free slot is found.
    /// Pass excludeId when updating so the current post's own slug is not treated as a collision.
    /// </summary>
    Task<string> UniquePostSlugAsync(string input, Guid? excludeId = null, CancellationToken ct = default);

    /// <summary>Same logic but scoped to the BlogCategories table.</summary>
    Task<string> UniqueCategorySlugAsync(string input, Guid? excludeId = null, CancellationToken ct = default);
}
