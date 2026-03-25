using Boioot.Application.Features.Auth.DTOs;

namespace Boioot.Application.Features.Auth.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, string? ipAddress = null, string? userAgent = null, CancellationToken ct = default);
    Task<UserProfileResponse> GetProfileAsync(Guid userId, CancellationToken ct = default);
    Task<UserProfileResponse> UpdateProfileAsync(Guid userId, UpdateProfileRequest request, CancellationToken ct = default);
    Task<UserProfileResponse> ChangeEmailAsync(Guid userId, ChangeEmailRequest request, CancellationToken ct = default);

    // ── Phase 1A: Refresh token operations ───────────────────────────────────
    Task<AuthResponse> RefreshAsync(string refreshToken, string? ipAddress = null, string? userAgent = null, CancellationToken ct = default);
    Task RevokeRefreshTokenAsync(string refreshToken, string? ipAddress = null, CancellationToken ct = default);
    Task RevokeAllRefreshTokensAsync(Guid userId, string? ipAddress = null, CancellationToken ct = default);
}
