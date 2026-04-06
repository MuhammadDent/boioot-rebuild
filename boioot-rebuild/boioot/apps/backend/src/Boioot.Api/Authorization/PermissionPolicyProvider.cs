using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace Boioot.Api.Authorization;

/// <summary>
/// Dynamically creates an <see cref="AuthorizationPolicy"/> for any policy name
/// that starts with the "Permission:" prefix.
///
/// This avoids registering 30+ policies up-front in Program.cs.
/// Usage:  [RequirePermission("users.view")]
///         → policy name = "Permission:users.view"
///         → built into a policy with PermissionRequirement("users.view")
/// </summary>
public sealed class PermissionPolicyProvider : DefaultAuthorizationPolicyProvider
{
    internal const string PolicyPrefix = "Permission:";

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
        : base(options) { }

    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        if (policyName.StartsWith(PolicyPrefix, StringComparison.OrdinalIgnoreCase))
        {
            var permission = policyName[PolicyPrefix.Length..];
            var policy = new AuthorizationPolicyBuilder();
            policy.RequireAuthenticatedUser();
            policy.AddRequirements(new PermissionRequirement(permission));
            return policy.Build();
        }

        return await base.GetPolicyAsync(policyName);
    }
}
