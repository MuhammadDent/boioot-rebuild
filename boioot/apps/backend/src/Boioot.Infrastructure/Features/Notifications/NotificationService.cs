using Boioot.Application.Features.Notifications.DTOs;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Notifications;

public class NotificationService : IUserNotificationService
{
    private readonly BoiootDbContext _db;
    private readonly INotificationRealtimePublisher _realtimePublisher;
    private readonly ILogger<NotificationService> _logger;

    public NotificationService(
        BoiootDbContext db,
        INotificationRealtimePublisher realtimePublisher,
        ILogger<NotificationService> logger)
    {
        _db = db;
        _realtimePublisher = realtimePublisher;
        _logger = logger;
    }

    public async Task CreateAsync(
        Guid userId,
        string type,
        string title,
        string body,
        string? relatedEntityId = null,
        string? relatedEntityType = null,
        CancellationToken ct = default)
    {
        var notification = new Notification
        {
            UserId            = userId,
            Type              = type,
            Title             = title,
            Body              = body,
            IsRead            = false,
            RelatedEntityId   = relatedEntityId,
            RelatedEntityType = relatedEntityType,
        };

        _db.Notifications.Add(notification);
        await _db.SaveChangesAsync(ct);
        await PublishCreatedSafelyAsync(notification, ct);
    }

    public async Task CreateBatchAsync(
        IEnumerable<NotificationRequest> items,
        CancellationToken ct = default)
    {
        var list = items
            .Select(i => new Notification
            {
                UserId            = i.UserId,
                Type              = i.Type,
                Title             = i.Title,
                Body              = i.Body,
                IsRead            = false,
                RelatedEntityId   = i.RelatedEntityId,
                RelatedEntityType = i.RelatedEntityType,
            })
            .ToList();

        if (list.Count == 0) return;

        _db.Notifications.AddRange(list);
        await _db.SaveChangesAsync(ct);
        foreach (var notification in list)
            await PublishCreatedSafelyAsync(notification, ct);
    }

    public async Task<NotificationListResult> GetForUserAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        var query = _db.Notifications
            .AsNoTracking()
            .Where(n => n.UserId == userId)
            .OrderByDescending(n => n.CreatedAt);

        // Two simple COUNT queries — avoids GroupBy(_ => 1) which fails on PostgreSQL with EF Core 8
        var total  = await _db.Notifications.CountAsync(n => n.UserId == userId, ct);
        var unread = await _db.Notifications.CountAsync(n => n.UserId == userId && !n.IsRead, ct);

        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(n => new NotificationDto
            {
                Id                = n.Id,
                Type              = n.Type,
                Title             = n.Title,
                Body              = n.Body,
                IsRead            = n.IsRead,
                RelatedEntityId   = n.RelatedEntityId,
                RelatedEntityType = n.RelatedEntityType,
                CreatedAt         = n.CreatedAt,
            })
            .ToListAsync(ct);

        return new NotificationListResult
        {
            Items  = items,
            Total  = total,
            Unread = unread,
        };
    }

    public async Task<int> GetUnreadCountAsync(Guid userId, CancellationToken ct = default)
    {
        return await _db.Notifications
            .CountAsync(n => n.UserId == userId && !n.IsRead, ct);
    }

    public async Task MarkReadAsync(Guid userId, Guid notificationId, CancellationToken ct = default)
    {
        var notification = await _db.Notifications
            .FirstOrDefaultAsync(n => n.Id == notificationId && n.UserId == userId, ct);

        if (notification is null) return;

        notification.IsRead = true;
        await _db.SaveChangesAsync(ct);
    }

    public async Task MarkAllReadAsync(Guid userId, CancellationToken ct = default)
    {
        await _db.Notifications
            .Where(n => n.UserId == userId && !n.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(n => n.IsRead, true), ct);
    }

    private async Task PublishCreatedSafelyAsync(Notification notification, CancellationToken ct)
    {
        try
        {
            await _realtimePublisher.PublishCreatedAsync(notification.UserId, ToDto(notification), ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Realtime notification delivery failed for notification {NotificationId}", notification.Id);
        }
    }

    private static NotificationDto ToDto(Notification notification)
    {
        return new NotificationDto
        {
            Id                = notification.Id,
            Type              = notification.Type,
            Title             = notification.Title,
            Body              = notification.Body,
            IsRead            = notification.IsRead,
            RelatedEntityId   = notification.RelatedEntityId,
            RelatedEntityType = notification.RelatedEntityType,
            CreatedAt         = notification.CreatedAt,
        };
    }
}
