using System.Security.Claims;
using Boioot.Application.Features.Onboarding.DTOs;
using Boioot.Application.Features.Onboarding.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Business profile onboarding — for Broker and CompanyOwner accounts.
/// GET  /api/onboarding/business-profile   — read current profile
/// PUT  /api/onboarding/business-profile   — save profile (marks IsProfileComplete = true)
/// </summary>
[ApiController]
[Route("api/onboarding")]
[Authorize]
public class OnboardingController : ControllerBase
{
    private readonly IOnboardingService _onboarding;

    public OnboardingController(IOnboardingService onboarding)
    {
        _onboarding = onboarding;
    }

    [HttpGet("business-profile")]
    public async Task<IActionResult> GetBusinessProfile(CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var profile = await _onboarding.GetBusinessProfileAsync(userId.Value, ct);
        return Ok(profile);
    }

    [HttpPut("business-profile")]
    public async Task<IActionResult> UpdateBusinessProfile(
        [FromBody] UpdateBusinessProfileRequest request,
        CancellationToken ct)
    {
        var userId = GetUserId();
        if (userId is null) return Unauthorized();

        var profile = await _onboarding.UpdateBusinessProfileAsync(userId.Value, request, ct);
        return Ok(profile);
    }

    private Guid? GetUserId()
    {
        var claim = User.FindFirstValue(ClaimTypes.NameIdentifier);
        return Guid.TryParse(claim, out var id) ? id : null;
    }
}
