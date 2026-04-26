using Boioot.Application.Exceptions;
using Boioot.Application.Features.Ratings.DTOs;
using Boioot.Application.Features.Ratings.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Ratings;

public sealed class RatingService : IRatingService
{
    private static readonly TimeSpan SummaryCacheDuration = TimeSpan.FromMinutes(5);

    private readonly BoiootDbContext        _db;
    private readonly IMemoryCache           _cache;
    private readonly ILogger<RatingService> _log;

    public RatingService(BoiootDbContext db, IMemoryCache cache, ILogger<RatingService> log)
    {
        _db    = db;
        _cache = cache;
        _log   = log;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Create
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<RatingResponse> CreateAsync(
        Guid userId,
        CreateRatingRequest request,
        CancellationToken ct = default)
    {
        if (request.Score < 1 || request.Score > 5)
            throw new BoiootException("يجب أن يكون التقييم بين 1 و 5", 400);

        bool listingExists = await _db.Properties
            .AnyAsync(p => p.Id == request.ListingId, ct);

        if (!listingExists)
            throw new BoiootException("العقار غير موجود", 404);

        bool hasCompletedBooking = await HasCompletedBookingAsync(userId, request.ListingId, ct);
        if (!hasCompletedBooking)
            throw new BoiootException("لا يمكنك تقييم العقار إلا بعد إكمال حجز", 403);

        bool alreadyRated = await _db.Reviews
            .IgnoreQueryFilters()
            .AnyAsync(r => r.ReviewerId == userId
                        && r.TargetType == ReviewTargetType.Property
                        && r.TargetId   == request.ListingId, ct)
            || await HasBookingReviewForPropertyAsync(userId, request.ListingId, ct);

        if (alreadyRated)
            throw new BoiootException("لقد قمت بتقييم هذا العقار مسبقاً", 409);

        var review = new Review
        {
            ReviewerId = userId,
            TargetType = ReviewTargetType.Property,
            TargetId   = request.ListingId,
            Rating     = request.Score,
            Comment    = request.Comment?.Trim(),
        };

        _db.Reviews.Add(review);
        await _db.SaveChangesAsync(ct);

        InvalidateSummaryCache(request.ListingId);

        var reviewer = await _db.Users
            .Select(u => new { u.Id, u.FullName })
            .FirstOrDefaultAsync(u => u.Id == userId, ct);

        _log.LogInformation(
            "[RatingService] User {UserId} rated listing {ListingId} — score {Score}",
            userId, request.ListingId, request.Score);

        return new RatingResponse(
            review.Id,
            reviewer?.FullName ?? "مستخدم",
            review.Rating,
            review.Comment,
            review.CreatedAt);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read — paginated list (merges Reviews + BookingReviews)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<PagedRatingsResponse> GetListingRatingsAsync(
        Guid listingId,
        int page,
        int pageSize,
        string sort,
        CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        // Old Reviews table (EF Core)
        // Legacy Reviews table — no sub-ratings; project to anonymous type first,
        // then construct RatingResponse in memory (avoids CS0854 expression-tree limitation
        // with optional record constructor parameters).
        var efRaw = await _db.Reviews
            .Include(r => r.Reviewer)
            .Where(r => r.TargetType == ReviewTargetType.Property
                     && r.TargetId   == listingId)
            .Select(r => new
            {
                r.Id,
                ReviewerName = r.Reviewer.FullName,
                Score        = r.Rating,
                r.Comment,
                r.CreatedAt,
            })
            .ToListAsync(ct);

        var efItems = efRaw
            .Select(r => new RatingResponse(
                r.Id,
                r.ReviewerName,
                r.Score,
                r.Comment,
                r.CreatedAt))
            .ToList();

        // BookingReviews table (raw SQL — TenantToProperty reviews for this property)
        var bookingItems = await GetBookingReviewItemsForPropertyAsync(listingId, ct);

        _log.LogInformation(
            "[RatingService.GetListingRatings] propertyId={PropertyId} oldReviews={OldCount} bookingReviews={NewCount}",
            listingId, efItems.Count, bookingItems.Count);

        // Merge: prefer BookingReviews entries (newer system); deduplicate by reviewer+score proximity is not needed
        // since they are stored separately. Simply union both lists.
        var all = efItems.Concat(bookingItems).ToList();

        // Sort
        all = sort switch
        {
            "highest" => all.OrderByDescending(r => r.Score).ThenByDescending(r => r.CreatedAt).ToList(),
            "lowest"  => all.OrderBy(r => r.Score).ThenByDescending(r => r.CreatedAt).ToList(),
            _         => all.OrderByDescending(r => r.CreatedAt).ToList(),
        };

        int total = all.Count;
        var items = all.Skip((page - 1) * pageSize).Take(pageSize).ToList();

        return new PagedRatingsResponse(items, total, page, pageSize);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read — summary (cached, includes BookingReviews)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<RatingSummaryResponse> GetSummaryAsync(
        Guid listingId,
        CancellationToken ct = default)
    {
        string cacheKey = SummaryCacheKey(listingId);

        if (_cache.TryGetValue(cacheKey, out RatingSummaryResponse? cached) && cached is not null)
            return cached;

        // Old Reviews
        var efResult = await _db.Reviews
            .Where(r => r.TargetType == ReviewTargetType.Property
                     && r.TargetId   == listingId)
            .GroupBy(_ => 1)
            .Select(g => new { Sum = (decimal)g.Sum(r => r.Rating), Count = g.Count() })
            .FirstOrDefaultAsync(ct);

        decimal efSum   = efResult?.Sum   ?? 0m;
        int     efCount = efResult?.Count ?? 0;

        // BookingReviews aggregate
        var (brSum, brCount) = await GetBookingReviewSummaryForPropertyAsync(listingId, ct);

        decimal totalSum   = efSum + brSum;
        int     totalCount = efCount + brCount;

        var summary = totalCount == 0
            ? new RatingSummaryResponse(0m, 0)
            : new RatingSummaryResponse(Math.Round(totalSum / totalCount, 1), totalCount);

        _cache.Set(cacheKey, summary, new MemoryCacheEntryOptions
        {
            SlidingExpiration = SummaryCacheDuration,
        });

        return summary;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read — eligibility check
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<CanRateResponse> CanUserRateAsync(
        Guid userId,
        Guid listingId,
        CancellationToken ct = default)
    {
        bool hasCompletedBooking = await HasCompletedBookingAsync(userId, listingId, ct);

        bool alreadyRated = await _db.Reviews
            .IgnoreQueryFilters()
            .AnyAsync(r => r.ReviewerId == userId
                        && r.TargetType == ReviewTargetType.Property
                        && r.TargetId   == listingId, ct)
            || await HasBookingReviewForPropertyAsync(userId, listingId, ct);

        _log.LogInformation(
            "[RatingService.CanRate] userId={UserId} propertyId={PropertyId} hasCompletedBooking={HasCompleted} alreadyRated={AlreadyRated} → canRate={CanRate}",
            userId, listingId, hasCompletedBooking, alreadyRated, hasCompletedBooking && !alreadyRated);

        return new CanRateResponse(
            CanRate:             hasCompletedBooking && !alreadyRated,
            AlreadyRated:        alreadyRated,
            HasCompletedBooking: hasCompletedBooking);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    /// <summary>
    /// FIX: Removed b.EndDate &lt;= now — a Confirmed booking is sufficient
    /// to allow rating regardless of whether the stay has ended.
    /// </summary>
    private async Task<bool> HasCompletedBookingAsync(
        Guid userId,
        Guid listingId,
        CancellationToken ct)
    {
        bool result = await _db.Bookings.AnyAsync(b =>
            b.RequestedByUserId == userId
         && b.PropertyId        == listingId
         && (b.Status == "Approved" || b.Status == "Confirmed" || b.Status == "Completed"),
            ct);

        _log.LogInformation(
            "[RatingService.HasCompletedBooking] userId={UserId} propertyId={PropertyId} result={Result}",
            userId, listingId, result);

        return result;
    }

    /// <summary>
    /// Checks if user has already submitted a TenantToProperty review
    /// in the BookingReviews table (new booking-linked review system).
    /// Returns false gracefully if the table does not exist yet.
    /// </summary>
    private async Task<bool> HasBookingReviewForPropertyAsync(
        Guid userId,
        Guid propertyId,
        CancellationToken ct)
    {
        if (!_db.Database.IsNpgsql()) return false;
        try
        {
            await _db.Database.OpenConnectionAsync(ct);
            var conn = _db.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT COUNT(1) FROM "BookingReviews"
                WHERE "ReviewerUserId" = @uid
                  AND "PropertyId"     = @pid
                  AND "ReviewType"     = 'TenantToProperty'
                """;
            var p1 = cmd.CreateParameter(); p1.ParameterName = "uid"; p1.Value = userId;     cmd.Parameters.Add(p1);
            var p2 = cmd.CreateParameter(); p2.ParameterName = "pid"; p2.Value = propertyId; cmd.Parameters.Add(p2);
            var count = Convert.ToInt64(await cmd.ExecuteScalarAsync(ct) ?? 0L);
            return count > 0;
        }
        catch (Exception ex)
        {
            _log.LogWarning("[RatingService.HasBookingReview] fallback false — {Msg}", ex.Message);
            return false;
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    /// <summary>
    /// Reads TenantToProperty BookingReviews for a property, converted to RatingResponse.
    /// Returns empty list gracefully if the table does not exist.
    /// </summary>
    private async Task<List<RatingResponse>> GetBookingReviewItemsForPropertyAsync(
        Guid propertyId,
        CancellationToken ct)
    {
        if (!_db.Database.IsNpgsql()) return [];
        try
        {
            await _db.Database.OpenConnectionAsync(ct);
            var conn = _db.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT br."Id",
                       COALESCE(u."FullName", 'مستخدم') AS "ReviewerName",
                       CAST(ROUND(br."OverallRating") AS int)  AS "Score",
                       br."Comment",
                       br."CreatedAt",
                       br."Cleanliness",
                       br."Accuracy",
                       br."Facilities",
                       br."Communication",
                       br."ContractCommitment",
                       br."ValueForMoney"
                FROM "BookingReviews" br
                LEFT JOIN "Users" u ON u."Id" = br."ReviewerUserId"::text
                WHERE br."PropertyId" = @pid AND br."ReviewType" = 'TenantToProperty'
                ORDER BY br."CreatedAt" DESC
                """;
            var p = cmd.CreateParameter(); p.ParameterName = "pid"; p.Value = propertyId; cmd.Parameters.Add(p);

            var items = new List<RatingResponse>();
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            while (await reader.ReadAsync(ct))
            {
                items.Add(new RatingResponse(
                    reader.GetGuid(0),
                    reader.GetString(1),
                    reader.GetInt32(2),
                    reader.IsDBNull(3)  ? null : reader.GetString(3),
                    reader.GetDateTime(4),
                    CleanlinessRating:   reader.IsDBNull(5)  ? null : reader.GetInt32(5),
                    AccuracyRating:      reader.IsDBNull(6)  ? null : reader.GetInt32(6),
                    FacilitiesRating:    reader.IsDBNull(7)  ? null : reader.GetInt32(7),
                    CommunicationRating: reader.IsDBNull(8)  ? null : reader.GetInt32(8),
                    CommitmentRating:    reader.IsDBNull(9)  ? null : reader.GetInt32(9),
                    ValueRating:         reader.IsDBNull(10) ? null : reader.GetInt32(10)));
            }
            return items;
        }
        catch (Exception ex)
        {
            _log.LogWarning("[RatingService.GetBookingReviewItems] fallback empty — {Msg}", ex.Message);
            return [];
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    /// <summary>
    /// Returns (sum of OverallRating, count) from BookingReviews for summary calculation.
    /// Returns (0, 0) gracefully if the table does not exist.
    /// </summary>
    private async Task<(decimal Sum, int Count)> GetBookingReviewSummaryForPropertyAsync(
        Guid propertyId,
        CancellationToken ct)
    {
        if (!_db.Database.IsNpgsql()) return (0m, 0);
        try
        {
            await _db.Database.OpenConnectionAsync(ct);
            var conn = _db.Database.GetDbConnection();
            await using var cmd = conn.CreateCommand();
            cmd.CommandText = """
                SELECT COALESCE(SUM("OverallRating"), 0), COUNT(1)
                FROM "BookingReviews"
                WHERE "PropertyId" = @pid AND "ReviewType" = 'TenantToProperty'
                """;
            var p = cmd.CreateParameter(); p.ParameterName = "pid"; p.Value = propertyId; cmd.Parameters.Add(p);
            await using var reader = await cmd.ExecuteReaderAsync(ct);
            if (await reader.ReadAsync(ct))
                return (reader.GetDecimal(0), (int)reader.GetInt64(1));
            return (0m, 0);
        }
        catch (Exception ex)
        {
            _log.LogWarning("[RatingService.GetBookingReviewSummary] fallback (0,0) — {Msg}", ex.Message);
            return (0m, 0);
        }
        finally
        {
            await _db.Database.CloseConnectionAsync();
        }
    }

    private static string SummaryCacheKey(Guid listingId) =>
        $"rating-summary:{listingId:N}";

    private void InvalidateSummaryCache(Guid listingId) =>
        _cache.Remove(SummaryCacheKey(listingId));
}
