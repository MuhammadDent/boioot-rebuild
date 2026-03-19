namespace Boioot.Domain.Entities;

/// <summary>
/// Junction table linking users to roles.
/// Maps to the "UserRoles" table (composite PK: UserId + RoleId).
///
/// Phase 1 — Infrastructure only.
/// In Phase 2 this will replace (or complement) the User.Role enum column.
/// </summary>
public class RbacUserRole
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }

    // Navigation
    public User     User { get; set; } = null!;
    public RbacRole Role { get; set; } = null!;
}
