using Microsoft.AspNetCore.Authorization;

namespace Boioot.Api.Authorization;

/// <summary>
/// Declarative permission-based authorization attribute.
///
/// Usage:
///   [RequirePermission(Permissions.UsersView)]
///   [RequirePermission("users.view")]
///
/// Can be stacked (all must be satisfied):
///   [RequirePermission("users.view")]
///   [RequirePermission("staff.view")]
///
/// Returns 403 Forbidden if the user lacks the permission.
/// Returns 401 Unauthorized if the user is not authenticated.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class, AllowMultiple = true)]
public sealed class RequirePermissionAttribute : AuthorizeAttribute
{
    public RequirePermissionAttribute(string permission)
        : base($"{PermissionPolicyProvider.PolicyPrefix}{permission}")
    {
        Permission = permission;
    }

    /// <summary>The permission string this attribute enforces.</summary>
    public string Permission { get; }
}
