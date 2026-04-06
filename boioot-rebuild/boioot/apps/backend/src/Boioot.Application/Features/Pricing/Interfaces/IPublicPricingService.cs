using Boioot.Application.Features.Pricing.DTOs;

namespace Boioot.Application.Features.Pricing.Interfaces;

/// <summary>
/// Public read-only pricing service.
/// No authentication required. Returns only active + public data.
/// </summary>
public interface IPublicPricingService
{
    /// <summary>
    /// Returns all active plans that have at least one active public pricing entry,
    /// together with their limits and features.
    /// </summary>
    Task<List<PublicPricingItem>> GetPublicPricingAsync(CancellationToken ct = default);
}
