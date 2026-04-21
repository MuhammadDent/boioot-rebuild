using Boioot.Application.Features.Notifications.DTOs;
using Boioot.Application.Features.Notifications.Interfaces;
using Microsoft.AspNetCore.SignalR;

namespace Boioot.Api.Hubs;

public class SignalRNotificationRealtimePublisher : INotificationRealtimePublisher
{
    private readonly IHubContext<NotificationsHub> _hubContext;

    public SignalRNotificationRealtimePublisher(IHubContext<NotificationsHub> hubContext)
    {
        _hubContext = hubContext;
    }

    public Task PublishCreatedAsync(Guid userId, NotificationDto notification, CancellationToken ct = default)
    {
        return _hubContext.Clients
            .User(userId.ToString())
            .SendAsync("NotificationCreated", notification, ct);
    }
}