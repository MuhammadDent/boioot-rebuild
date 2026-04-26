namespace Boioot.Application.Features.Ratings.DTOs;

public record CreateRatingRequest(
    Guid ListingId,
    int Score,
    string? Comment);

public record RatingResponse(
    Guid Id,
    string ReviewerName,
    int Score,
    string? Comment,
    DateTime CreatedAt,
    int? CleanlinessRating   = null,
    int? AccuracyRating      = null,
    int? FacilitiesRating    = null,
    int? CommunicationRating = null,
    int? CommitmentRating    = null,
    int? ValueRating         = null);

public record RatingSummaryResponse(
    decimal Average,
    int Count);

public record PagedRatingsResponse(
    List<RatingResponse> Items,
    int Total,
    int Page,
    int PageSize);

public record CanRateResponse(
    bool CanRate,
    bool AlreadyRated,
    bool HasCompletedBooking);
