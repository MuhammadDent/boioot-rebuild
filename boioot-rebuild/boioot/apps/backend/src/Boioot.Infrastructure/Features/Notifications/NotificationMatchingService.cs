using System.Text.RegularExpressions;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Notifications;

public class NotificationMatchingService
{
    private static readonly Regex CapacityRegex = new(
        @"(?<value>[0-9٠-٩]+)\s*(?:غرف|غرفة|أشخاص|اشخاص|أفراد|افراد|نفر)",
        RegexOptions.IgnoreCase | RegexOptions.Compiled);

    private readonly BoiootDbContext _context;
    private readonly IUserNotificationService _notifications;
    private readonly ILogger<NotificationMatchingService> _logger;

    public NotificationMatchingService(
        BoiootDbContext context,
        IUserNotificationService notifications,
        ILogger<NotificationMatchingService> logger)
    {
        _context = context;
        _notifications = notifications;
        _logger = logger;
    }

    public async Task NotifyMatchedUsersForBuyerRequestAsync(
        Guid buyerRequestId,
        Guid actorUserId,
        CancellationToken ct = default)
    {
        var request = await _context.BuyerRequests
            .AsNoTracking()
            .Where(r => r.Id == buyerRequestId && r.IsPublished && r.Status == "Open")
            .Select(r => new
            {
                r.Id,
                r.Title,
                r.Description,
                r.PropertyType,
                r.City
            })
            .FirstOrDefaultAsync(ct);

        if (request is null) return;

        var city = NormalizeMatchText(request.City);
        var propertyType = ResolvePropertyType(request.PropertyType);
        var capacity = ExtractCapacity(request.Title, request.Description);

        var query = _context.Properties
            .AsNoTracking()
            .Where(p => p.Status == PropertyStatus.Available
                     && p.ModerationStatus == ModerationStatus.Active
                     && !p.IsDeleted);

        if (!string.IsNullOrWhiteSpace(city))
            query = query.Where(p => p.City.ToLower() == city);

        if (propertyType.HasValue)
            query = query.Where(p => p.Type == propertyType.Value);

        if (capacity.HasValue)
            query = query.Where(p => p.Bedrooms.HasValue && p.Bedrooms.Value >= capacity.Value);

        var candidates = await query
            .OrderByDescending(p => p.CreatedAt)
            .Take(100)
            .Select(p => new
            {
                p.OwnerId,
                p.CreatedByUserId,
                p.AccountId,
                AgentUserId = p.Agent != null ? (Guid?)p.Agent.UserId : null
            })
            .ToListAsync(ct);

        if (candidates.Count == 0) return;

        var recipientIds = new HashSet<Guid>();
        foreach (var candidate in candidates)
        {
            AddParsedGuid(recipientIds, candidate.OwnerId);
            AddParsedGuid(recipientIds, candidate.CreatedByUserId);
            if (candidate.AgentUserId.HasValue)
                recipientIds.Add(candidate.AgentUserId.Value);
        }

        var accountIds = candidates
            .Where(c => c.AccountId.HasValue)
            .Select(c => c.AccountId!.Value)
            .Distinct()
            .ToList();

        if (accountIds.Count > 0)
        {
            var accountUserIds = await _context.AccountUsers
                .AsNoTracking()
                .Where(au => accountIds.Contains(au.AccountId) && au.IsActive)
                .Select(au => au.UserId)
                .ToListAsync(ct);

            foreach (var id in accountUserIds)
                recipientIds.Add(id);

            var accountOwnerIds = await _context.Accounts
                .AsNoTracking()
                .Where(a => accountIds.Contains(a.Id) && a.IsActive)
                .Select(a => new { a.CreatedByUserId, a.PrimaryAdminUserId })
                .ToListAsync(ct);

            foreach (var owner in accountOwnerIds)
            {
                recipientIds.Add(owner.CreatedByUserId);
                if (owner.PrimaryAdminUserId.HasValue)
                    recipientIds.Add(owner.PrimaryAdminUserId.Value);
            }
        }

        recipientIds.Remove(actorUserId);
        if (recipientIds.Count == 0) return;

        var activeRecipientIds = await _context.Users
            .AsNoTracking()
            .Where(u => recipientIds.Contains(u.Id) && u.IsActive && !u.IsDeleted)
            .Select(u => u.Id)
            .ToListAsync(ct);

        if (activeRecipientIds.Count == 0) return;

        var actorName = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == actorUserId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct) ?? "مستخدم";

        var notifications = activeRecipientIds.Select(uid => new NotificationRequest(
            UserId: uid,
            Type: "buyer_request_matched",
            Title: "طلب عقاري جديد مطابق",
            Body: $"نشر {actorName} طلباً جديداً قد يناسب عقاراتك: {request.Title}",
            RelatedEntityId: request.Id.ToString(),
            RelatedEntityType: "BuyerRequest"))
            .ToList();

        await _notifications.CreateBatchAsync(notifications, ct);

        _logger.LogInformation(
            "[Notifications] Sent {Count} buyer request match notification(s) for requestId={RequestId}",
            notifications.Count, request.Id);
    }

    private static string? NormalizeMatchText(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim().ToLowerInvariant();

    private static PropertyType? ResolvePropertyType(string? value)
    {
        if (string.IsNullOrWhiteSpace(value)) return null;
        return Enum.TryParse<PropertyType>(value.Trim(), ignoreCase: true, out var parsed)
            ? parsed
            : null;
    }

    private static int? ExtractCapacity(params string?[] values)
    {
        foreach (var value in values)
        {
            if (string.IsNullOrWhiteSpace(value)) continue;

            var match = CapacityRegex.Match(value);
            if (!match.Success) continue;

            var digits = NormalizeDigits(match.Groups["value"].Value);
            if (int.TryParse(digits, out var capacity) && capacity > 0)
                return capacity;
        }

        return null;
    }

    private static string NormalizeDigits(string value)
    {
        return value
            .Replace('٠', '0')
            .Replace('١', '1')
            .Replace('٢', '2')
            .Replace('٣', '3')
            .Replace('٤', '4')
            .Replace('٥', '5')
            .Replace('٦', '6')
            .Replace('٧', '7')
            .Replace('٨', '8')
            .Replace('٩', '9');
    }

    private static void AddParsedGuid(HashSet<Guid> target, string? value)
    {
        if (Guid.TryParse(value, out var id))
            target.Add(id);
    }
}