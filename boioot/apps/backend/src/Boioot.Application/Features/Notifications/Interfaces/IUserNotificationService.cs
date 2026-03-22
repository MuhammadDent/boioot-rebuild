using Boioot.Application.Features.Notifications.DTOs;

namespace Boioot.Application.Features.Notifications.Interfaces;

public interface IUserNotificationService
{
    Task CreateAsync(
        Guid userId,
        string type,
        string title,
        string body,
        string? relatedEntityId = null,
        string? relatedEntityType = null,
        CancellationToken ct = default);

    Task<NotificationListResult> GetForUserAsync(
        Guid userId,
        int page,
        int pageSize,
        CancellationToken ct = default);

    Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default);

    Task MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default);

    Task MarkAllReadAsync(Guid userId, CancellationToken ct = default);
}
