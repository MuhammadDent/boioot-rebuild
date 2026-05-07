using Boioot.Application.Features.Matching.Interfaces;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Coverage;

/// <summary>
/// Sends notifications to coverage-matched professionals when a new BuyerRequest is created.
///
/// Phase 1 — Free for all professionals:
///   All matched users with professional accounts receive instant notifications.
///   No delay or subscription check is needed.
///
/// Future — Priority differentiation (optional premium):
///   When premium tiers are introduced, non-priority accounts may receive a short delay
///   while priority accounts are notified immediately.
///   This is controlled via InstantNotifications flag in MatchingUserFeaturesDto.
///
/// Called in a background fire-and-forget task via INotificationEventDispatcher.
/// </summary>
public class CoverageMatchNotificationService
{
    private readonly BoiootDbContext            _db;
    private readonly IRequestMatchingService    _matching;
    private readonly IMatchingPlanAccessService _planAccess;
    private readonly IUserNotificationService   _notifications;
    private readonly ILogger<CoverageMatchNotificationService> _logger;

    public CoverageMatchNotificationService(
        BoiootDbContext            db,
        IRequestMatchingService    matching,
        IMatchingPlanAccessService planAccess,
        IUserNotificationService   notifications,
        ILogger<CoverageMatchNotificationService> logger)
    {
        _db            = db;
        _matching      = matching;
        _planAccess    = planAccess;
        _notifications = notifications;
        _logger        = logger;
    }

    public async Task NotifyAsync(
        Guid buyerRequestId,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        try
        {
            var matches = await _matching.GetMatchesAsync(buyerRequestId, ct);
            if (matches.Count == 0) return;

            // Load request title for notification body
            var title = await _db.BuyerRequests
                .AsNoTracking()
                .Where(r => r.Id == buyerRequestId)
                .Select(r => r.Title)
                .FirstOrDefaultAsync(ct) ?? "";

            var instant = new List<NotificationRequest>();
            var delayed = new List<NotificationRequest>();

            foreach (var match in matches)
            {
                var features = await _planAccess.GetFeaturesAsync(match.UserId, ct);

                var notif = new NotificationRequest(
                    UserId:           match.UserId,
                    Type:             "new_request_match",
                    Title:            "طلب جديد في منطقتك",
                    Body:             $"طلب جديد: {title} — {match.MatchReason}",
                    RelatedEntityId:  buyerRequestId.ToString(),
                    RelatedEntityType: "BuyerRequest");

                // Phase 1: all professional accounts get instant notifications.
                // Future: non-priority accounts may go into the delayed bucket.
                if (features.InstantNotifications || features.HasProfessionalAccess)
                    instant.Add(notif);
                else
                    delayed.Add(notif);
            }

            // ── Send instant notifications ────────────────────────────────────
            if (instant.Count > 0)
                await _notifications.CreateBatchAsync(instant, ct);

            // ── Send delayed notifications (reserved for future priority tiers) ─
            if (delayed.Count > 0)
            {
                var delaySec = Random.Shared.Next(10, 31);
                await Task.Delay(TimeSpan.FromSeconds(delaySec), ct);
                await _notifications.CreateBatchAsync(delayed, ct);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex,
                "[CoverageMatch] Notification dispatch failed for requestId={RequestId}",
                buyerRequestId);
        }
    }
}
