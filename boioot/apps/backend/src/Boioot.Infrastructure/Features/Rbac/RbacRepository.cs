using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.Rbac;

/// <summary>
/// Read-only helper for querying permissions from the dynamic RBAC tables.
///
/// Phase 1 — Infrastructure only.
/// This repository is NOT wired into the authentication or authorization flow.
/// The current system embeds permissions as JWT claims via
/// <c>AuthService.GenerateToken → StaffRolePermissions.GetPermissions</c>.
///
/// Phase 2 will replace (or complement) that with a DB lookup here.
/// </summary>
public class RbacRepository
{
    private readonly BoiootDbContext _db;

    public RbacRepository(BoiootDbContext db)
    {
        _db = db;
    }

    // ── User permissions ──────────────────────────────────────────────────────

    /// <summary>
    /// Returns all permission keys assigned to the given user through the
    /// dynamic RBAC tables (UserRoles → RolePermissions → Permissions).
    ///
    /// NOT used in the auth flow yet. Exposed for future Phase 2 integration
    /// and for ad-hoc inspection/auditing.
    /// </summary>
    public async Task<IReadOnlyList<string>> GetUserPermissionsAsync(
        Guid userId,
        CancellationToken ct = default)
    {
        var permissions = await _db.RbacUserRoles
            .Where(ur => ur.UserId == userId)
            .SelectMany(ur => ur.Role.RolePermissions)
            .Select(rp => rp.Permission.Key)
            .Distinct()
            .OrderBy(k => k)
            .ToListAsync(ct);

        return permissions.AsReadOnly();
    }

    // ── Role queries ──────────────────────────────────────────────────────────

    /// <summary>
    /// Returns all permission keys associated with the named role.
    /// </summary>
    public async Task<IReadOnlyList<string>> GetRolePermissionsAsync(
        string roleName,
        CancellationToken ct = default)
    {
        var permissions = await _db.RbacRoles
            .Where(r => r.Name == roleName)
            .SelectMany(r => r.RolePermissions)
            .Select(rp => rp.Permission.Key)
            .Distinct()
            .OrderBy(k => k)
            .ToListAsync(ct);

        return permissions.AsReadOnly();
    }

    /// <summary>
    /// Returns true if the named role has the given permission key.
    /// </summary>
    public async Task<bool> RoleHasPermissionAsync(
        string roleName,
        string permissionKey,
        CancellationToken ct = default)
    {
        return await _db.RbacRoles
            .Where(r => r.Name == roleName)
            .SelectMany(r => r.RolePermissions)
            .AnyAsync(rp => rp.Permission.Key == permissionKey, ct);
    }

    // ── Snapshot for diagnostics ──────────────────────────────────────────────

    /// <summary>
    /// Returns a snapshot of the full role → permissions matrix.
    /// Useful for admin diagnostics and future role-editor UI.
    /// </summary>
    public async Task<Dictionary<string, List<string>>> GetRolePermissionsMatrixAsync(
        CancellationToken ct = default)
    {
        var rows = await _db.RbacRoles
            .Select(r => new
            {
                RoleName = r.Name,
                Permissions = r.RolePermissions
                    .Select(rp => rp.Permission.Key)
                    .OrderBy(k => k)
                    .ToList()
            })
            .OrderBy(r => r.RoleName)
            .ToListAsync(ct);

        return rows.ToDictionary(r => r.RoleName, r => r.Permissions);
    }
}
