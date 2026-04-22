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
    DateTime CreatedAt);

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
