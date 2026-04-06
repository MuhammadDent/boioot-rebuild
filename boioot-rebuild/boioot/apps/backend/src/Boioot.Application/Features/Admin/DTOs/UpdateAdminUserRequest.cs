namespace Boioot.Application.Features.Admin.DTOs;

public class UpdateAdminUserRequest
{
    public string? FullName { get; set; }

    /// <summary>
    /// New email address. Must be non-empty when provided and must not already
    /// belong to another account.  Admin-only — does NOT invalidate existing
    /// sessions (session tokens are keyed by UserId, not email).
    /// </summary>
    public string? Email { get; set; }

    public string? Phone { get; set; }
}
