using Boioot.Application.Features.Notifications.DTOs;

namespace Boioot.Application.Features.Notifications.Interfaces;

public interface INotificationRealtimePublisher
{
    Task PublishCreatedAsync(Guid userId, NotificationDto notification, CancellationToken ct = default);
}