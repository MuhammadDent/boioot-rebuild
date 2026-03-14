using Boioot.Application.Features.Auth.DTOs;

namespace Boioot.Application.Features.Auth.Interfaces;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request);
    Task<AuthResponse> LoginAsync(LoginRequest request);
    Task<UserProfileResponse> GetProfileAsync(Guid userId);
}
