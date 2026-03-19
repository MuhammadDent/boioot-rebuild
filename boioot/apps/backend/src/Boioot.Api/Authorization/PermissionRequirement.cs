using Microsoft.AspNetCore.Authorization;

namespace Boioot.Api.Authorization;

/// <summary>
/// Represents the requirement to hold a specific permission claim.
/// </summary>
public sealed class PermissionRequirement : IAuthorizationRequirement
{
    public PermissionRequirement(string permission)
    {
        Permission = permission;
    }

    public string Permission { get; }
}
