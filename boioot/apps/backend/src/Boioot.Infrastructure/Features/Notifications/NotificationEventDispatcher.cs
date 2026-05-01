using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Infrastructure.Features.Coverage;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Notifications;

public class NotificationEventDispatcher : INotificationEventDispatcher
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<NotificationEventDispatcher> _logger;

    public NotificationEventDispatcher(
        IServiceScopeFactory scopeFactory,
        ILogger<NotificationEventDispatcher> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    public void DispatchBuyerRequestCreated(Guid buyerRequestId, Guid actorUserId)
    {
        // ── Existing: property-based notification (notifies property owners) ──
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var matching = scope.ServiceProvider.GetRequiredService<NotificationMatchingService>();
                await matching.NotifyMatchedUsersForBuyerRequestAsync(
                    buyerRequestId,
                    actorUserId,
                    CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "[Notifications] Background buyer request match dispatch failed for requestId={RequestId}",
                    buyerRequestId);
            }
        });

        // ── Additive: coverage-based notification (notifies agents by area) ──
        _ = Task.Run(async () =>
        {
            try
            {
                using var scope = _scopeFactory.CreateScope();
                var coverage = scope.ServiceProvider.GetRequiredService<CoverageMatchNotificationService>();
                await coverage.NotifyAsync(buyerRequestId, actorUserId, CancellationToken.None);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex,
                    "[CoverageMatch] Background coverage match dispatch failed for requestId={RequestId}",
                    buyerRequestId);
            }
        });
    }
}