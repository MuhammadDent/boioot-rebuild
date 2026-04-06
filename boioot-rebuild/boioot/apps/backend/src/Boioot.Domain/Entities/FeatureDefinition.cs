namespace Boioot.Domain.Entities;

/// <summary>
/// Master catalog of all possible subscription features.
/// Keys are stable identifiers — never change them after seeding.
/// e.g. "featured_listings", "video_upload", "analytics_dashboard"
/// </summary>
public class FeatureDefinition : BaseEntity
{
    /// <summary>Stable internal identifier. Unique. Never rename after creation.</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Human-readable display name (Arabic or English).</summary>
    public string Name { get; set; } = string.Empty;

    /// <summary>Optional explanation of what this feature provides.</summary>
    public string? Description { get; set; }

    /// <summary>
    /// Logical group for UI grouping and filtering.
    /// e.g. "listing", "analytics", "support", "media", "team"
    /// </summary>
    public string? FeatureGroup { get; set; }

    /// <summary>
    /// Emoji or icon identifier shown in admin UI and pricing pages.
    /// e.g. "📊", "⭐", "🎥"
    /// </summary>
    public string? Icon { get; set; }

    public bool IsActive { get; set; } = true;

    // ── Production-grade structural fields ──────────────────────────────────

    /// <summary>
    /// Data type of the feature value.
    /// "boolean" = on/off flag, "limit" = numeric cap, "text" = string config, "json" = arbitrary object.
    /// Immutable once the feature is referenced by PlanFeatures.
    /// </summary>
    public string Type { get; set; } = "boolean";

    /// <summary>
    /// Functional domain this feature belongs to.
    /// "listing" | "user" | "system" | "messaging" | "analytics"
    /// Immutable once the feature is referenced by PlanFeatures.
    /// </summary>
    public string Scope { get; set; } = "system";

    /// <summary>
    /// True when this feature was seeded by the system and cannot be deleted or have its Key/Type/Scope changed.
    /// </summary>
    public bool IsSystem { get; set; } = false;

    /// <summary>Display order in admin catalog and pricing pages. Lower = first.</summary>
    public int SortOrder { get; set; } = 0;

    /// <summary>
    /// Access policy for this feature. Controls how it can be activated.
    /// "open"         = activates automatically with the subscription plan (default).
    /// "admin_only"   = can only be granted by an admin — not self-serviceable.
    /// "self_service" = user can toggle this themselves (within plan limits).
    /// Null defaults to "open".
    /// </summary>
    public string? AccessPolicy { get; set; }
}
