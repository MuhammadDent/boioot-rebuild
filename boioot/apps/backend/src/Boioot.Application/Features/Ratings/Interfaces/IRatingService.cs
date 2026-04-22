using Boioot.Application.Features.Ratings.DTOs;

namespace Boioot.Application.Features.Ratings.Interfaces;

public interface IRatingService
{
    Task<RatingResponse> CreateAsync(Guid userId, CreateRatingRequest request, CancellationToken ct = default);
    Task<PagedRatingsResponse> GetListingRatingsAsync(Guid listingId, int page, int pageSize, string sort, CancellationToken ct = default);
    Task<RatingSummaryResponse> GetSummaryAsync(Guid listingId, CancellationToken ct = default);
    Task<CanRateResponse> CanUserRateAsync(Guid userId, Guid listingId, CancellationToken ct = default);
}
