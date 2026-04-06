using Boioot.Application.Features.Notifications.DTOs;

namespace Boioot.Application.Features.Notifications.Interfaces;

/// <summary>Represents a single notification to be created in a batch.</summary>
public record NotificationRequest(
    Guid    UserId,
    string  Type,
    string  Title,
    string  Body,
    string? RelatedEntityId   = null,
    string? RelatedEntityType = null);

public interface IUserNotificationService
{
    /// <summary>Create a single notification.</summary>
    Task CreateAsync(
        Guid userId,
        string type,
        string title,
        string body,
        string? relatedEntityId = null,
        string? relatedEntityType = null,
        CancellationToken ct = default);

    /// <summary>
    /// Create multiple notifications in a single DB round-trip.
    /// Callers should already have deduplicated the recipient list.
    /// </summary>
    Task CreateBatchAsync(
        IEnumerable<NotificationRequest> items,
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
