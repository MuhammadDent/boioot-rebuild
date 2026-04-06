namespace Boioot.Domain.Constants;

/// <summary>
/// Maps each staff role to its allowed permissions.
/// This is the backend source of truth — mirrored in the frontend lib/rbac.ts.
/// Backend handler uses this to enforce permissions from JWT role claim.
/// </summary>
public static class StaffRolePermissions
{
    private static readonly IReadOnlyDictionary<string, IReadOnlyList<string>> _map =
        new Dictionary<string, IReadOnlyList<string>>
        {
            [RoleNames.Admin] = Permissions.All,

            ["AdminManager"] = new[]
            {
                Permissions.UsersView, Permissions.UsersEdit, Permissions.UsersDisable,
                Permissions.StaffView, Permissions.StaffCreate, Permissions.StaffEdit,
                Permissions.RolesView,
                Permissions.PropertiesView, Permissions.PropertiesEdit,
                Permissions.ProjectsView, Permissions.ProjectsEdit,
                Permissions.RequestsView, Permissions.RequestsAssign, Permissions.RequestsEdit,
                Permissions.CompaniesView, Permissions.CompaniesEdit,
                Permissions.BlogView, Permissions.BlogCreate, Permissions.BlogEdit, Permissions.BlogPublish,
                Permissions.BlogSeoManage, Permissions.SeoSettingsManage,
                Permissions.SettingsView, Permissions.SettingsManage,
                Permissions.BillingView,
            },

            ["CustomerSupport"] = new[]
            {
                Permissions.UsersView,
                Permissions.PropertiesView,
                Permissions.ProjectsView,
                Permissions.RequestsView, Permissions.RequestsAssign, Permissions.RequestsEdit,
                Permissions.CompaniesView,
                Permissions.BlogView,
            },

            ["TechnicalSupport"] = new[]
            {
                Permissions.UsersView, Permissions.UsersEdit,
                Permissions.PropertiesView, Permissions.PropertiesEdit,
                Permissions.ProjectsView,
                Permissions.RequestsView,
                Permissions.CompaniesView,
                Permissions.SettingsView,
            },

            ["ContentEditor"] = new[]
            {
                Permissions.BlogView, Permissions.BlogCreate, Permissions.BlogEdit,
            },

            ["SeoSpecialist"] = new[]
            {
                Permissions.BlogView, Permissions.BlogEdit,
                Permissions.BlogSeoManage, Permissions.SeoSettingsManage,
            },

            ["MarketingStaff"] = new[]
            {
                Permissions.MarketingView, Permissions.MarketingManage,
                Permissions.BlogView,
            },
        };

    /// <summary>Returns the permission list for a given role string.</summary>
    public static IReadOnlyList<string> GetPermissions(string role) =>
        _map.TryGetValue(role, out var perms) ? perms : Array.Empty<string>();

    /// <summary>Returns true if the role has the specified permission.</summary>
    public static bool HasPermission(string role, string permission)
    {
        // SuperAdmin always passes
        if (role == RoleNames.Admin) return true;

        return _map.TryGetValue(role, out var perms)
            && perms.Contains(permission);
    }

    /// <summary>Returns true if the role is a known internal staff role.</summary>
    public static bool IsStaffRole(string role) => _map.ContainsKey(role);
}
