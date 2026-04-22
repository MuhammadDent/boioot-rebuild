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

        // 1. Verify listing exists
        bool listingExists = await _db.Properties
            .AnyAsync(p => p.Id == request.ListingId, ct);

        if (!listingExists)
            throw new BoiootException("العقار غير موجود", 404);

        // 2. Verify completed booking
        bool hasCompletedBooking = await HasCompletedBookingAsync(userId, request.ListingId, ct);
        if (!hasCompletedBooking)
            throw new BoiootException("لا يمكنك تقييم العقار إلا بعد إكمال حجز", 403);

        // 3. Prevent duplicate ratings (also enforced by DB unique constraint)
        bool alreadyRated = await _db.Reviews
            .IgnoreQueryFilters()
            .AnyAsync(r => r.ReviewerId == userId
                        && r.TargetType == ReviewTargetType.Property
                        && r.TargetId   == request.ListingId, ct);

        if (alreadyRated)
            throw new BoiootException("لقد قمت بتقييم هذا العقار مسبقاً", 409);

        // 4. Persist
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

        // Invalidate summary cache
        InvalidateSummaryCache(request.ListingId);

        // Load reviewer name
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
    // Read — paginated list
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

        var query = _db.Reviews
            .Include(r => r.Reviewer)
            .Where(r => r.TargetType == ReviewTargetType.Property
                     && r.TargetId   == listingId);

        query = sort switch
        {
            "highest" => query.OrderByDescending(r => r.Rating).ThenByDescending(r => r.CreatedAt),
            "lowest"  => query.OrderBy(r => r.Rating).ThenByDescending(r => r.CreatedAt),
            _         => query.OrderByDescending(r => r.CreatedAt),        // newest (default)
        };

        int total = await query.CountAsync(ct);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new RatingResponse(
                r.Id,
                r.Reviewer.FullName,
                r.Rating,
                r.Comment,
                r.CreatedAt))
            .ToListAsync(ct);

        return new PagedRatingsResponse(items, total, page, pageSize);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Read — summary (cached)
    // ─────────────────────────────────────────────────────────────────────────

    public async Task<RatingSummaryResponse> GetSummaryAsync(
        Guid listingId,
        CancellationToken ct = default)
    {
        string cacheKey = SummaryCacheKey(listingId);

        if (_cache.TryGetValue(cacheKey, out RatingSummaryResponse? cached) && cached is not null)
            return cached;

        var result = await _db.Reviews
            .Where(r => r.TargetType == ReviewTargetType.Property
                     && r.TargetId   == listingId)
            .GroupBy(_ => 1)
            .Select(g => new
            {
                Average = (decimal?)g.Average(r => r.Rating) ?? 0m,
                Count   = g.Count(),
            })
            .FirstOrDefaultAsync(ct);

        var summary = result is null
            ? new RatingSummaryResponse(0m, 0)
            : new RatingSummaryResponse(Math.Round(result.Average, 1), result.Count);

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
                        && r.TargetId   == listingId, ct);

        return new CanRateResponse(
            CanRate:             hasCompletedBooking && !alreadyRated,
            AlreadyRated:        alreadyRated,
            HasCompletedBooking: hasCompletedBooking);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────────────

    private async Task<bool> HasCompletedBookingAsync(
        Guid userId,
        Guid listingId,
        CancellationToken ct)
    {
        var now = DateTime.UtcNow;

        return await _db.Bookings.AnyAsync(b =>
            b.RequestedByUserId == userId
         && b.PropertyId        == listingId
         && b.EndDate           <= now
         && (b.Status == "Approved" || b.Status == "Confirmed" || b.Status == "Completed"),
            ct);
    }

    private static string SummaryCacheKey(Guid listingId) =>
        $"rating-summary:{listingId:N}";

    private void InvalidateSummaryCache(Guid listingId) =>
        _cache.Remove(SummaryCacheKey(listingId));
}
