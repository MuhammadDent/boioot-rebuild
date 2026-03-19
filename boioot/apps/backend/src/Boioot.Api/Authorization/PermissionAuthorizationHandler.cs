using System.Security.Claims;
using Boioot.Domain.Constants;
using Microsoft.AspNetCore.Authorization;

namespace Boioot.Api.Authorization;

/// <summary>
/// Evaluates <see cref="PermissionRequirement"/> against the current user's JWT claims.
///
/// Strategy:
///   1. SuperAdmin (role == "Admin") always succeeds — no further checks needed.
///   2. For all other roles: check the "permission" claims embedded in the JWT.
///      The JWT is generated with individual permission claims per role.
///      See AuthService.GenerateToken().
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

        var role = context.User.FindFirstValue(ClaimTypes.Role) ?? string.Empty;

        // SuperAdmin always passes
        if (role == RoleNames.Admin)
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // Check individual "permission" claims embedded in the JWT
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
