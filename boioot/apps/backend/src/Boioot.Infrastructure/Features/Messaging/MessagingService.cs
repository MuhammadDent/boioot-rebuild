using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Messaging.DTOs;
using Boioot.Application.Features.Messaging.Interfaces;
using Boioot.Application.Features.Subscriptions;
using Boioot.Application.Features.Subscriptions.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Messaging;

public class MessagingService : IMessagingService
{
    private readonly BoiootDbContext _context;
    private readonly IPlanEntitlementService _entitlement;
    private readonly IAccountResolver _accountResolver;
    private readonly ILogger<MessagingService> _logger;

    public MessagingService(
        BoiootDbContext context,
        IPlanEntitlementService entitlement,
        IAccountResolver accountResolver,
        ILogger<MessagingService> logger)
    {
        _context         = context;
        _entitlement     = entitlement;
        _accountResolver = accountResolver;
        _logger          = logger;
    }

    public async Task<IReadOnlyList<ConversationSummaryResponse>> GetConversationsAsync(
        Guid userId, CancellationToken ct = default)
    {
        var conversations = await _context.Conversations
            .Include(c => c.User1)
            .Include(c => c.User2)
            .Include(c => c.Property)
            .Include(c => c.Project)
            .Where(c => c.User1Id == userId || c.User2Id == userId)
            .OrderByDescending(c => c.LastMessageAt ?? c.CreatedAt)
            .ToListAsync(ct);

        if (conversations.Count == 0)
            return [];

        var conversationIds = conversations.Select(c => c.Id).ToList();

        var unreadCounts = await _context.Messages
            .Where(m => conversationIds.Contains(m.ConversationId)
                     && m.SenderId != userId
                     && !m.IsRead)
            .GroupBy(m => m.ConversationId)
            .Select(g => new { ConversationId = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.ConversationId, x => x.Count, ct);

        return conversations
            .Select(c => MapToSummary(
                c, userId,
                unreadCounts.GetValueOrDefault(c.Id, 0)))
            .ToList();
    }

    public async Task<ConversationSummaryResponse> GetOrCreateConversationAsync(
        Guid userId, CreateConversationRequest request, CancellationToken ct = default)
    {
        // ── Subscription enforcement: internal_chat feature ───────────────
        // Gate only on the initiator's plan. If no account → allow (open users).
        await EnforceChatFeatureAsync(userId, ct);

        // ── Subscription enforcement: max_conversations limit ─────────────
        // Only enforce when the user has an account. Unlinked/free users are open.
        var acctIdForLimit = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (acctIdForLimit.HasValue)
        {
            var limit = await _entitlement.GetLimitAsync(acctIdForLimit.Value, SubscriptionKeys.MaxConversations, ct);
            if (limit > 0) // 0 = not defined (skip), -1 = unlimited (skip)
            {
                var currentCount = await _context.Conversations
                    .CountAsync(c => c.User1Id == userId || c.User2Id == userId, ct);
                if (currentCount >= (int)limit)
                {
                    _logger.LogWarning(
                        "[Enforcement] LimitExceeded — max_conversations={Limit} reached for userId={UserId} (current={Count})",
                        limit, userId, currentCount);
                    var planCode = await _entitlement.GetActivePlanCodeAsync(acctIdForLimit.Value, ct);
                    throw new Boioot.Application.Exceptions.PlanLimitException(
                        SubscriptionKeys.MaxConversations,
                        $"لقد وصلت إلى الحد الأقصى من المحادثات ({limit}) في باقتك الحالية. يرجى ترقية باقتك للمزيد.",
                        currentValue:      currentCount,
                        planLimit:         (int)limit,
                        suggestedPlanCode: SubscriptionKeys.GetOfficeSuggestedUpgrade(planCode));
                }
            }
        }

        var recipientId = request.RecipientId!.Value;

        if (recipientId == userId)
            throw new BoiootException("لا يمكنك بدء محادثة مع نفسك", 400);

        if (request.PropertyId.HasValue && request.ProjectId.HasValue)
            throw new BoiootException("لا يمكن ربط المحادثة بعقار ومشروع في نفس الوقت", 400);

        var recipientExists = await _context.Users
            .AnyAsync(u => u.Id == recipientId && !u.IsDeleted, ct);

        if (!recipientExists)
            throw new BoiootException("المستخدم غير موجود", 404);

        var existing = await _context.Conversations
            .Include(c => c.User1)
            .Include(c => c.User2)
            .Include(c => c.Property)
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c =>
                ((c.User1Id == userId && c.User2Id == recipientId) ||
                 (c.User1Id == recipientId && c.User2Id == userId))
                && c.PropertyId == request.PropertyId
                && c.ProjectId == request.ProjectId, ct);

        if (existing is not null)
        {
            var existingUnread = await GetUnreadCountAsync(userId, existing.Id, ct);
            return MapToSummary(existing, userId, existingUnread);
        }

        var conversation = new Conversation
        {
            User1Id = userId,
            User2Id = recipientId,
            PropertyId = request.PropertyId,
            ProjectId = request.ProjectId
        };

        _context.Conversations.Add(conversation);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Conversation created: {ConversationId} between {UserId} and {RecipientId}",
            conversation.Id, userId, recipientId);

        return await LoadAndMapSummaryAsync(conversation.Id, userId, ct);
    }

    public async Task<ConversationDetailResponse> GetConversationAsync(
        Guid userId, Guid conversationId, int page, int pageSize, CancellationToken ct = default)
    {
        page = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var conversation = await _context.Conversations
            .Include(c => c.User1)
            .Include(c => c.User2)
            .Include(c => c.Property)
            .Include(c => c.Project)
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new BoiootException("المحادثة غير موجودة", 404);

        EnsureParticipant(userId, conversation);

        await _context.Messages
            .Where(m => m.ConversationId == conversationId
                     && m.SenderId != userId
                     && !m.IsRead)
            .ExecuteUpdateAsync(s => s.SetProperty(m => m.IsRead, true), ct);

        var messageQuery = _context.Messages
            .Include(m => m.Sender)
            .Where(m => m.ConversationId == conversationId)
            .OrderBy(m => m.CreatedAt);

        var total = await messageQuery.CountAsync(ct);

        var messages = await messageQuery
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var pagedMessages = new PagedResult<MessageResponse>(
            messages.Select(m => MapToMessage(m, userId)).ToList(),
            page, pageSize, total);

        return MapToDetail(conversation, userId, pagedMessages);
    }

    public async Task<MessageResponse> SendMessageAsync(
        Guid userId, Guid conversationId, SendMessageRequest request, CancellationToken ct = default)
    {
        // ── Subscription enforcement: internal_chat feature ───────────────
        await EnforceChatFeatureAsync(userId, ct);

        var conversation = await _context.Conversations
            .FirstOrDefaultAsync(c => c.Id == conversationId, ct)
            ?? throw new BoiootException("المحادثة غير موجودة", 404);

        EnsureParticipant(userId, conversation);

        var message = new Message
        {
            ConversationId = conversationId,
            SenderId = userId,
            Content = request.Content?.Trim() ?? string.Empty,
            AttachmentData = request.AttachmentData,
            AttachmentName = request.AttachmentName
        };

        conversation.LastMessageAt = DateTime.UtcNow;

        _context.Messages.Add(message);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Message {MessageId} sent in conversation {ConversationId} by {UserId}",
            message.Id, conversationId, userId);

        await _context.Entry(message).Reference(m => m.Sender).LoadAsync(ct);

        return MapToMessage(message, userId);
    }

    // ── Enforcement helper ───────────────────────────────────────────────
    /// <summary>
    /// Checks internal_chat feature for the given user.
    /// If the user has no account → allowed (no subscription = open access).
    /// If the user has an account with internal_chat disabled → blocked.
    /// </summary>
    private async Task EnforceChatFeatureAsync(Guid userId, CancellationToken ct)
    {
        var accountId = await _accountResolver.ResolveAccountIdAsync(userId, ct);
        if (!accountId.HasValue) return; // no subscription → allow

        var canChat = await _entitlement.CanUseChatAsync(accountId.Value, ct);
        if (!canChat)
            throw new PlanFeatureDisabledException(
                SubscriptionKeys.InternalChat,
                "المراسلة الداخلية غير متاحة في باقتك الحالية. يرجى ترقية خطتك للتواصل عبر المنصة.");
    }

    // ── Private helpers ─────────────────────────────────────────────────────

    private void EnsureParticipant(Guid userId, Conversation conversation)
    {
        if (conversation.User1Id != userId && conversation.User2Id != userId)
        {
            _logger.LogWarning(
                "User {UserId} attempted to access conversation {ConversationId} without being a participant",
                userId, conversation.Id);
            throw new BoiootException("غير مصرح لك بالوصول إلى هذه المحادثة", 403);
        }
    }

    public Task<int> GetTotalUnreadCountAsync(Guid userId, CancellationToken ct) =>
        _context.Messages.CountAsync(
            m => (m.Conversation.User1Id == userId || m.Conversation.User2Id == userId)
              && m.SenderId != userId
              && !m.IsRead, ct);

    private Task<int> GetUnreadCountAsync(Guid userId, Guid conversationId, CancellationToken ct) =>
        _context.Messages.CountAsync(
            m => m.ConversationId == conversationId
              && m.SenderId != userId
              && !m.IsRead, ct);

    private async Task<ConversationSummaryResponse> LoadAndMapSummaryAsync(
        Guid conversationId, Guid userId, CancellationToken ct)
    {
        var conversation = await _context.Conversations
            .Include(c => c.User1)
            .Include(c => c.User2)
            .Include(c => c.Property)
            .Include(c => c.Project)
            .FirstAsync(c => c.Id == conversationId, ct);

        var unread = await GetUnreadCountAsync(userId, conversationId, ct);
        return MapToSummary(conversation, userId, unread);
    }

    private static ConversationSummaryResponse MapToSummary(
        Conversation c, Guid userId, int unreadCount) => new()
    {
        Id = c.Id,
        OtherUserId = c.User1Id == userId ? c.User2Id : c.User1Id,
        OtherUserName = c.User1Id == userId ? c.User2.FullName : c.User1.FullName,
        LastMessageAt = c.LastMessageAt,
        UnreadCount = unreadCount,
        PropertyId = c.PropertyId,
        PropertyTitle = c.Property?.Title,
        ProjectId = c.ProjectId,
        ProjectTitle = c.Project?.Title,
        CreatedAt = c.CreatedAt
    };

    private static ConversationDetailResponse MapToDetail(
        Conversation c, Guid userId, PagedResult<MessageResponse> messages) => new()
    {
        Id = c.Id,
        OtherUserId = c.User1Id == userId ? c.User2Id : c.User1Id,
        OtherUserName = c.User1Id == userId ? c.User2.FullName : c.User1.FullName,
        PropertyId = c.PropertyId,
        PropertyTitle = c.Property?.Title,
        ProjectId = c.ProjectId,
        ProjectTitle = c.Project?.Title,
        Messages = messages,
        CreatedAt = c.CreatedAt
    };

    private static MessageResponse MapToMessage(Message m, Guid userId) => new()
    {
        Id = m.Id,
        SenderId = m.SenderId,
        SenderName = m.Sender.FullName,
        Content = m.Content,
        IsRead = m.IsRead,
        IsOwnMessage = m.SenderId == userId,
        CreatedAt = m.CreatedAt,
        AttachmentData = m.AttachmentData,
        AttachmentName = m.AttachmentName
    };
}
