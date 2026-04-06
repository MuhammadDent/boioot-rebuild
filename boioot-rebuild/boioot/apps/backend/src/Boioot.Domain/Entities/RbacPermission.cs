namespace Boioot.Domain.Entities;

/// <summary>
/// A single permission key in the dynamic RBAC system.
/// Maps to the "Permissions" table.
///
/// Phase 1 — Infrastructure only.
/// Not wired into the auth flow yet.
/// </summary>
public class RbacPermission : BaseEntity
{
    /// <summary>Unique permission key, e.g. "properties.create", "users.view".</summary>
    public string Key { get; set; } = string.Empty;

    // Navigation
    public ICollection<RbacRolePermission> RolePermissions { get; set; } = new List<RbacRolePermission>();
}
