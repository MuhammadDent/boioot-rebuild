using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace Boioot.Api.Authorization;

/// <summary>
/// Evaluates <see cref="PermissionRequirement"/> against the current user's JWT claims.
///
/// Single normalized authorization path for all users, including Admin:
///   1. Verify the principal is authenticated.
///   2. Look for a "permission" claim whose value matches the required permission.
///   3. Succeed if found; fail otherwise.
///
/// Admin retains full access because AuthService.GenerateToken embeds all
/// permissions (Permissions.All) as individual "permission" claims in the Admin
/// JWT — not through a role-based shortcut in this handler.
///
/// See: AuthService.GenerateToken and StaffRolePermissions.GetPermissions("Admin").
/// </summary>
public sealed class PermissionAuthorizationHandler
    : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(
        AuthorizationHandlerContext context,
        PermissionRequirement requirement)
    {
        // Must be authenticated
        if (!context.User.Identity?.IsAuthenticated ?? true)
        {
            context.Fail();
            return Task.CompletedTask;
        }

        // Check individual "permission" claims embedded in the JWT.
        // This path applies to all users — Admin, staff roles, and future roles alike.
        var hasPermission = context.User
            .FindAll("permission")
            .Any(c => c.Value == requirement.Permission);

        if (hasPermission)
            context.Succeed(requirement);
        else
            context.Fail(new AuthorizationFailureReason(
                this, $"Missing permission: {requirement.Permission}"));

        return Task.CompletedTask;
    }
}
