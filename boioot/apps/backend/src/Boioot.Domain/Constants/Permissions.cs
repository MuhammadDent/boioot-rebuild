namespace Boioot.Domain.Constants;

/// <summary>
/// Centralised permission string constants.
/// Single source of truth — mirrored on the frontend in lib/rbac.ts.
/// Format: "domain.action"
/// </summary>
public static class Permissions
{
    // ── Users ─────────────────────────────────────────────────────────────────
    public const string UsersView    = "users.view";
    public const string UsersEdit    = "users.edit";
    public const string UsersDisable = "users.disable";

    // ── Staff ─────────────────────────────────────────────────────────────────
    public const string StaffView    = "staff.view";
    public const string StaffCreate  = "staff.create";
    public const string StaffEdit    = "staff.edit";
    public const string StaffDisable = "staff.disable";

    // ── Roles ─────────────────────────────────────────────────────────────────
    public const string RolesView   = "roles.view";
    public const string RolesManage = "roles.manage";

    // ── Properties ───────────────────────────────────────────────────────────
    public const string PropertiesView   = "properties.view";
    public const string PropertiesEdit   = "properties.edit";
    public const string PropertiesDelete = "properties.delete";

    // ── Projects ──────────────────────────────────────────────────────────────
    public const string ProjectsView = "projects.view";
    public const string ProjectsEdit = "projects.edit";

    // ── Requests ──────────────────────────────────────────────────────────────
    public const string RequestsView   = "requests.view";
    public const string RequestsAssign = "requests.assign";
    public const string RequestsEdit   = "requests.edit";

    // ── Companies ─────────────────────────────────────────────────────────────
    public const string CompaniesView = "companies.view";
    public const string CompaniesEdit = "companies.edit";

    // ── Blog ──────────────────────────────────────────────────────────────────
    public const string BlogView    = "blog.view";
    public const string BlogCreate  = "blog.create";
    public const string BlogEdit    = "blog.edit";
    public const string BlogPublish = "blog.publish";
    public const string BlogDelete  = "blog.delete";

    // ── SEO ───────────────────────────────────────────────────────────────────
    public const string BlogSeoManage      = "blog.seo.manage";
    public const string SeoSettingsManage  = "seo.settings.manage";

    // ── Marketing ─────────────────────────────────────────────────────────────
    public const string MarketingView   = "marketing.view";
    public const string MarketingManage = "marketing.manage";

    // ── Settings ──────────────────────────────────────────────────────────────
    public const string SettingsView   = "settings.view";
    public const string SettingsManage = "settings.manage";

    // ── Billing ───────────────────────────────────────────────────────────────
    public const string BillingView   = "billing.view";
    public const string BillingManage = "billing.manage";

    /// <summary>All permissions — assigned to SuperAdmin.</summary>
    public static readonly IReadOnlyList<string> All = new[]
    {
        UsersView, UsersEdit, UsersDisable,
        StaffView, StaffCreate, StaffEdit, StaffDisable,
        RolesView, RolesManage,
        PropertiesView, PropertiesEdit, PropertiesDelete,
        ProjectsView, ProjectsEdit,
        RequestsView, RequestsAssign, RequestsEdit,
        CompaniesView, CompaniesEdit,
        BlogView, BlogCreate, BlogEdit, BlogPublish, BlogDelete,
        BlogSeoManage, SeoSettingsManage,
        MarketingView, MarketingManage,
        SettingsView, SettingsManage,
        BillingView, BillingManage,
    };
}
