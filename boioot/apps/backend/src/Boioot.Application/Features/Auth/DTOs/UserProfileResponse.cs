namespace Boioot.Application.Features.Auth.DTOs;

public class UserProfileResponse
{
    public Guid Id { get; set; }
    public string UserCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string Role { get; set; } = string.Empty;
    public string? ProfileImageUrl { get; set; }
    public DateTime CreatedAt { get; set; }

    /// <summary>
    /// Permissions granted to this user based on their role.
    /// Populated by the backend from StaffRolePermissions map.
    /// Frontend uses this list as the source of truth for UI visibility.
    /// </summary>
    public IReadOnlyList<string> Permissions { get; set; } = Array.Empty<string>();
}
