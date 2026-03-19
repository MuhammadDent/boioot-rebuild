using Boioot.Api.Authorization;
using Boioot.Domain.Constants;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Api.Controllers;

[Route("api/admin/rbac")]
[Authorize]
public class AdminRbacController : BaseController
{
    private readonly BoiootDbContext _db;

    // Roles that cannot be deleted (system roles)
    private static readonly HashSet<string> SystemRoles = new(StringComparer.OrdinalIgnoreCase)
    {
        "Admin", "AdminManager", "CustomerSupport", "TechnicalSupport",
        "ContentEditor", "SeoSpecialist", "MarketingStaff",
        "CompanyOwner", "Broker", "Agent", "Owner", "User"
    };

    public AdminRbacController(BoiootDbContext db)
    {
        _db = db;
    }

    // ── Roles ─────────────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/rbac/roles — list all roles with counts.</summary>
    [HttpGet("roles")]
    [RequirePermission(Permissions.RolesView)]
    public async Task<IActionResult> GetRoles(CancellationToken ct)
    {
        var roles = await _db.RbacRoles
            .Select(r => new
            {
                r.Id,
                r.Name,
                PermissionCount = r.RolePermissions.Count,
                UserCount       = r.UserRoles.Count,
                IsSystem        = SystemRoles.Contains(r.Name),
            })
            .OrderBy(r => r.Name)
            .ToListAsync(ct);

        return Ok(roles);
    }

    /// <summary>POST /api/admin/rbac/roles — create a new role.</summary>
    [HttpPost("roles")]
    [RequirePermission(Permissions.RolesManage)]
    public async Task<IActionResult> CreateRole([FromBody] RoleNameRequest req, CancellationToken ct)
    {
        var name = req.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { error = "اسم الدور مطلوب" });

        var exists = await _db.RbacRoles.AnyAsync(r => r.Name == name, ct);
        if (exists)
            return BadRequest(new { error = "هذا الدور موجود مسبقاً" });

        var role = new RbacRole { Name = name };
        _db.RbacRoles.Add(role);
        await _db.SaveChangesAsync(ct);

        return Ok(new { role.Id, role.Name, PermissionCount = 0, UserCount = 0, IsSystem = false });
    }

    /// <summary>PUT /api/admin/rbac/roles/{id} — rename a role.</summary>
    [HttpPut("roles/{id:guid}")]
    [RequirePermission(Permissions.RolesManage)]
    public async Task<IActionResult> RenameRole(Guid id, [FromBody] RoleNameRequest req, CancellationToken ct)
    {
        var name = req.Name?.Trim();
        if (string.IsNullOrEmpty(name))
            return BadRequest(new { error = "اسم الدور مطلوب" });

        var role = await _db.RbacRoles.FirstOrDefaultAsync(r => r.Id == id, ct);
        if (role is null) return NotFound(new { error = "الدور غير موجود" });

        if (SystemRoles.Contains(role.Name))
            return BadRequest(new { error = "لا يمكن تعديل الأدوار الأساسية للنظام" });

        var exists = await _db.RbacRoles.AnyAsync(r => r.Name == name && r.Id != id, ct);
        if (exists) return BadRequest(new { error = "هذا الاسم مستخدم من قبل دور آخر" });

        role.Name = name;
        role.UpdatedAt = DateTime.UtcNow;
        await _db.SaveChangesAsync(ct);

        return Ok(new { role.Id, role.Name });
    }

    /// <summary>DELETE /api/admin/rbac/roles/{id} — delete a custom role.</summary>
    [HttpDelete("roles/{id:guid}")]
    [RequirePermission(Permissions.RolesManage)]
    public async Task<IActionResult> DeleteRole(Guid id, CancellationToken ct)
    {
        var role = await _db.RbacRoles
            .Include(r => r.UserRoles)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null) return NotFound(new { error = "الدور غير موجود" });
        if (SystemRoles.Contains(role.Name))
            return BadRequest(new { error = "لا يمكن حذف الأدوار الأساسية للنظام" });
        if (role.UserRoles.Count > 0)
            return BadRequest(new { error = $"الدور مرتبط بـ {role.UserRoles.Count} مستخدم — أزل التعيين أولاً" });

        _db.RbacRoles.Remove(role);
        await _db.SaveChangesAsync(ct);
        return Ok(new { deleted = true });
    }

    // ── Permissions ───────────────────────────────────────────────────────────

    /// <summary>GET /api/admin/rbac/permissions — all permissions.</summary>
    [HttpGet("permissions")]
    [RequirePermission(Permissions.RolesView)]
    public async Task<IActionResult> GetPermissions(CancellationToken ct)
    {
        var raw = await _db.RbacPermissions
            .Select(p => new { p.Id, p.Key })
            .OrderBy(p => p.Key)
            .ToListAsync(ct);

        var perms = raw.Select(p => new
        {
            p.Id,
            p.Key,
            Module = p.Key.Contains('.') ? p.Key[..p.Key.IndexOf('.')] : p.Key,
        });

        return Ok(perms);
    }

    /// <summary>GET /api/admin/rbac/roles/{id}/permissions — permissions for a specific role.</summary>
    [HttpGet("roles/{id:guid}/permissions")]
    [RequirePermission(Permissions.RolesView)]
    public async Task<IActionResult> GetRolePermissions(Guid id, CancellationToken ct)
    {
        var role = await _db.RbacRoles
            .Include(r => r.RolePermissions)
                .ThenInclude(rp => rp.Permission)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null) return NotFound(new { error = "الدور غير موجود" });

        var keys = role.RolePermissions.Select(rp => rp.Permission.Key).OrderBy(k => k).ToList();
        return Ok(new { roleId = role.Id, roleName = role.Name, permissions = keys });
    }

    /// <summary>POST /api/admin/rbac/roles/{id}/permissions — replace all permissions for a role.</summary>
    [HttpPost("roles/{id:guid}/permissions")]
    [RequirePermission(Permissions.RolesManage)]
    public async Task<IActionResult> SetRolePermissions(
        Guid id,
        [FromBody] SetPermissionsRequest req,
        CancellationToken ct)
    {
        var role = await _db.RbacRoles
            .Include(r => r.RolePermissions)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        if (role is null) return NotFound(new { error = "الدور غير موجود" });

        var keys = req.PermissionKeys ?? [];

        // Get permission IDs for the requested keys
        var perms = await _db.RbacPermissions
            .Where(p => keys.Contains(p.Key))
            .ToListAsync(ct);

        // Replace all existing role permissions
        _db.RbacRolePermissions.RemoveRange(role.RolePermissions);

        foreach (var perm in perms)
        {
            _db.RbacRolePermissions.Add(new RbacRolePermission
            {
                RoleId       = role.Id,
                PermissionId = perm.Id,
            });
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { roleId = role.Id, permissionCount = perms.Count });
    }

    // ── User → Role assignment ─────────────────────────────────────────────────

    /// <summary>POST /api/admin/rbac/users/{userId}/roles — assign a role to a user.</summary>
    [HttpPost("users/{userId:guid}/roles")]
    [RequirePermission(Permissions.RolesManage)]
    public async Task<IActionResult> AssignUserRole(
        Guid userId,
        [FromBody] AssignRoleRequest req,
        CancellationToken ct)
    {
        var user = await _db.Users.FirstOrDefaultAsync(u => u.Id == userId, ct);
        if (user is null) return NotFound(new { error = "المستخدم غير موجود" });

        var role = await _db.RbacRoles.FirstOrDefaultAsync(r => r.Id == req.RoleId, ct);
        if (role is null) return NotFound(new { error = "الدور غير موجود" });

        // Remove existing user roles and assign new one
        var existing = await _db.RbacUserRoles
            .Where(ur => ur.UserId == userId)
            .ToListAsync(ct);
        _db.RbacUserRoles.RemoveRange(existing);

        _db.RbacUserRoles.Add(new RbacUserRole { UserId = userId, RoleId = role.Id });

        // Also update User.Role column to match
        if (Enum.TryParse<Boioot.Domain.Enums.UserRole>(role.Name, out var parsedRole))
        {
            user.Role = parsedRole;
            user.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return Ok(new { userId, roleId = role.Id, roleName = role.Name });
    }

    /// <summary>DELETE /api/admin/rbac/users/{userId}/roles — remove all roles from a user.</summary>
    [HttpDelete("users/{userId:guid}/roles")]
    [RequirePermission(Permissions.RolesManage)]
    public async Task<IActionResult> RemoveUserRoles(Guid userId, CancellationToken ct)
    {
        var existing = await _db.RbacUserRoles
            .Where(ur => ur.UserId == userId)
            .ToListAsync(ct);
        _db.RbacUserRoles.RemoveRange(existing);
        await _db.SaveChangesAsync(ct);
        return Ok(new { userId, removed = existing.Count });
    }
}

// ── Request DTOs ───────────────────────────────────────────────────────────────

public sealed record RoleNameRequest(string? Name);
public sealed record SetPermissionsRequest(List<string>? PermissionKeys);
public sealed record AssignRoleRequest(Guid RoleId);
