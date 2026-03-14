namespace Boioot.Application.Features.Auth.DTOs;

public class AuthResponse
{
    public string Token { get; set; } = string.Empty;
    public string TokenType { get; set; } = "Bearer";
    public int ExpiresInMinutes { get; set; }
    public UserProfileResponse User { get; set; } = null!;
}
