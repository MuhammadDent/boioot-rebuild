namespace Boioot.Domain.Entities;

/// <summary>
/// A named role in the dynamic RBAC system.
/// Maps to the "Roles" table.
///
/// Phase 1 — Infrastructure only.
/// This entity is NOT wired into the auth flow yet.
/// The current auth system reads permissions from StaffRolePermissions (code-based).
/// </summary>
public class RbacRole : BaseEntity
{
    /// <summary>Unique role name, e.g. "Admin", "CompanyOwner", "Broker".</summary>
    public string Name { get; set; } = string.Empty;

    // Navigation
    public ICollection<RbacRolePermission> RolePermissions { get; set; } = new List<RbacRolePermission>();
    public ICollection<RbacUserRole>       UserRoles       { get; set; } = new List<RbacUserRole>();
}
