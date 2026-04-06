namespace Boioot.Domain.Entities;

/// <summary>
/// Junction table linking roles to permissions.
/// Maps to the "RolePermissions" table (composite PK: RoleId + PermissionId).
///
/// Phase 1 — Infrastructure only.
/// </summary>
public class RbacRolePermission
{
    public Guid RoleId       { get; set; }
    public Guid PermissionId { get; set; }

    // Navigation
    public RbacRole       Role       { get; set; } = null!;
    public RbacPermission Permission { get; set; } = null!;
}
