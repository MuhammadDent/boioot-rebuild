namespace Boioot.Application.Features.Auth.DTOs;

public class AuthResponse
{
    /// <summary>Short-lived access token (JWT). Also aliased as Token for backward compatibility.</summary>
    public string Token { get; set; } = string.Empty;

    public string TokenType { get; set; } = "Bearer";

    /// <summary>Access token expiry UTC. Also aliased as ExpiresAt for backward compatibility.</summary>
    public DateTime ExpiresAt { get; set; }

    /// <summary>Opaque refresh token (raw — only returned once, never stored raw on backend).</summary>
    public string? RefreshToken { get; set; }

    /// <summary>Refresh token expiry UTC.</summary>
    public DateTime? RefreshTokenExpiresAt { get; set; }

    public UserProfileResponse User { get; set; } = null!;
}
