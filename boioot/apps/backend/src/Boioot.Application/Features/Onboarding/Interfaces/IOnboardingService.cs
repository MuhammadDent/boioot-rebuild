using Boioot.Application.Features.Onboarding.DTOs;

namespace Boioot.Application.Features.Onboarding.Interfaces;

public interface IOnboardingService
{
    Task<BusinessProfileResponse> GetBusinessProfileAsync(Guid userId, CancellationToken ct = default);
    Task<BusinessProfileResponse> UpdateBusinessProfileAsync(Guid userId, UpdateBusinessProfileRequest request, CancellationToken ct = default);
}
