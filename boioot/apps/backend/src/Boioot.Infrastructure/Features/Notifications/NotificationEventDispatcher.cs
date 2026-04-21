using Boioot.Application.Features.Notifications.Interfaces;
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
    }
}