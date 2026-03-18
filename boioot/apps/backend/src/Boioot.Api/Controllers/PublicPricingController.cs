using Boioot.Application.Features.Pricing.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace Boioot.Api.Controllers;

/// <summary>
/// Public pricing endpoint. No authentication required.
/// Returns only active plans with active + public pricing entries.
/// </summary>
[Route("api/public/pricing")]
[AllowAnonymous]
public class PublicPricingController : BaseController
{
    private readonly IPublicPricingService _service;

    public PublicPricingController(IPublicPricingService service)
    {
        _service = service;
    }

    /// <summary>
    /// GET /api/public/pricing
    /// Returns all active plans with their public pricing, limits, and features.
    /// No authentication required.
    /// </summary>
    [HttpGet]
    public async Task<IActionResult> GetPublicPricing(CancellationToken ct)
    {
        var result = await _service.GetPublicPricingAsync(ct);
        return Ok(result);
    }
}
