namespace Boioot.Application.Features.Subscriptions;

/// <summary>
/// Canonical string keys for plan features and limits.
/// Must match exactly what is seeded in FeatureDefinitions and LimitDefinitions tables.
/// </summary>
public static class SubscriptionKeys
{
    // ── Limit keys ────────────────────────────────────────────────────────
    public const string MaxActiveListings  = "max_active_listings";
    public const string MaxAgents          = "max_agents";
    public const string MaxProjects        = "max_projects";
    public const string MaxProjectUnits    = "max_project_units";

    // ── Feature keys ──────────────────────────────────────────────────────
    public const string AnalyticsDashboard  = "analytics_dashboard";
    public const string FeaturedListings    = "featured_listings";
    public const string ProjectManagement   = "project_management";
}
