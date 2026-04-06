namespace Boioot.Application.Features.Locations.Interfaces;

/// <summary>
/// Strict master-data service for cities and neighborhoods.
/// All creation/lookup logic flows through here — never directly from controllers.
/// </summary>
public interface ILocationMasterService
{
    // ── Cities ────────────────────────────────────────────────────────────────

    /// <summary>
    /// Add a city under a province, with full duplicate + similarity checking.
    /// Returns one of: created / exists / similar
    /// </summary>
    Task<LocationMasterResult> AddCityAsync(
        string name,
        string province,
        bool   forceCreate,
        CancellationToken ct = default);

    // ── Neighborhoods ─────────────────────────────────────────────────────────

    /// <summary>
    /// Add a neighborhood under a city, with full duplicate + similarity checking.
    /// Returns one of: created / exists / similar
    /// </summary>
    Task<LocationMasterResult> AddNeighborhoodAsync(
        string name,
        string city,
        bool   forceCreate,
        CancellationToken ct = default);

    // ── Cleanup ───────────────────────────────────────────────────────────────

    /// <summary>
    /// Detects duplicate city groups (same province + NormalizedName).
    /// Returns a summary report — does NOT modify any data.
    /// </summary>
    Task<IReadOnlyList<DuplicateGroup>> DetectDuplicateCitiesAsync(CancellationToken ct = default);

    /// <summary>
    /// Detects duplicate neighborhood groups (same city + NormalizedName).
    /// Returns a summary report — does NOT modify any data.
    /// </summary>
    Task<IReadOnlyList<DuplicateGroup>> DetectDuplicateNeighborhoodsAsync(CancellationToken ct = default);
}

// ── Result types ──────────────────────────────────────────────────────────────

/// <summary>Result of an AddCity / AddNeighborhood call.</summary>
public record LocationMasterResult(
    /// <summary>"created" | "exists" | "similar"</summary>
    string Status,

    /// <summary>The created or existing item. Null when status = "similar".</summary>
    LocationItemDto? Item,

    /// <summary>Similar candidates. Non-empty only when status = "similar".</summary>
    IReadOnlyList<LocationItemDto> Suggestions
);

/// <summary>A city or neighborhood in API responses.</summary>
public record LocationItemDto(
    Guid   Id,
    string Name,
    string ParentName   // Province for cities; City for neighborhoods
);

/// <summary>A group of duplicate entries sharing the same normalized name under the same parent.</summary>
public record DuplicateGroup(
    string ParentName,
    string NormalizedName,
    IReadOnlyList<DuplicateEntry> Entries
);

public record DuplicateEntry(Guid Id, string Name, bool IsActive);
