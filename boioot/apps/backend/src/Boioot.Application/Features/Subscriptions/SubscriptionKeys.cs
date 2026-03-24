namespace Boioot.Application.Features.Subscriptions;

/// <summary>
/// Canonical string keys for plan features and limits.
/// Must match exactly what is seeded in FeatureDefinitions and LimitDefinitions tables.
/// </summary>
public static class SubscriptionKeys
{
    // ── Limit keys ────────────────────────────────────────────────────────
    public const string MaxActiveListings    = "max_active_listings";
    public const string MaxAgents            = "max_agents";
    public const string MaxProjects          = "max_projects";
    public const string MaxProjectUnits      = "max_project_units";
    public const string MaxImagesPerListing  = "max_images_per_listing";
    public const string MaxVideosPerListing  = "max_videos_per_listing";
    public const string MaxFeaturedSlots     = "max_featured_slots";

    // ── Feature keys ──────────────────────────────────────────────────────
    public const string AnalyticsDashboard   = "analytics_dashboard";
    public const string FeaturedListings     = "featured_listings";
    public const string ProjectManagement    = "project_management";
    public const string VideoUpload          = "video_upload";
    public const string MultiplePhotos       = "multiple_photos";
    public const string WhatsappContact      = "whatsapp_contact";
    public const string VerifiedBadge        = "verified_badge";
    public const string HomepageExposure     = "homepage_exposure";
    public const string PrioritySupport      = "priority_support";
    public const string InternalChat         = "internal_chat";
}
