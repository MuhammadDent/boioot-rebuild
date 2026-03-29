using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.BuyerRequests.DTOs;
using Boioot.Application.Features.BuyerRequests.Interfaces;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.BuyerRequests;

public class BuyerRequestService : IBuyerRequestService
{
    private readonly BoiootDbContext _context;
    private readonly IUserNotificationService _notifications;
    private readonly ILogger<BuyerRequestService> _logger;

    public BuyerRequestService(
        BoiootDbContext context,
        IUserNotificationService notifications,
        ILogger<BuyerRequestService> logger)
    {
        _context       = context;
        _notifications = notifications;
        _logger        = logger;
    }

    // ── Create ───────────────────────────────────────────────────────────────

    public async Task<BuyerRequestResponse> CreateAsync(
        Guid userId, CreateBuyerRequestDto dto, CancellationToken ct = default)
    {
        var entity = new BuyerRequest
        {
            Title        = dto.Title.Trim(),
            PropertyType = dto.PropertyType.Trim(),
            Description  = dto.Description.Trim(),
            City         = dto.City?.Trim(),
            Neighborhood = dto.Neighborhood?.Trim(),
            IsPublished  = true,
            UserId       = userId,
        };

        _context.BuyerRequests.Add(entity);
        await _context.SaveChangesAsync(ct);

        var user = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct);

        return MapToResponse(entity, user ?? "", 0);
    }

    // ── Get by ID ─────────────────────────────────────────────────────────────

    public async Task<BuyerRequestResponse> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.BuyerRequests
            .Include(r => r.User)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        var commentsCount = await _context.BuyerRequestComments
            .CountAsync(c => c.BuyerRequestId == id, ct);

        return MapToResponse(entity, entity.User?.FullName ?? "", commentsCount);
    }

    // ── My requests ───────────────────────────────────────────────────────────

    public async Task<PagedResult<BuyerRequestResponse>> GetMyAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BuyerRequests
            .Include(r => r.User)
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking();

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ids = items.Select(r => r.Id).ToList();
        var commentCounts = await _context.BuyerRequestComments
            .Where(c => ids.Contains(c.BuyerRequestId))
            .GroupBy(c => c.BuyerRequestId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Id, g => g.Count, ct);

        return new PagedResult<BuyerRequestResponse>(
            items.Select(r => MapToResponse(r, r.User?.FullName ?? "", commentCounts.GetValueOrDefault(r.Id, 0))).ToList(),
            page, pageSize, total);
    }

    // ── Public listing ────────────────────────────────────────────────────────

    public async Task<PagedResult<BuyerRequestResponse>> GetPublicAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BuyerRequests
            .Include(r => r.User)
            .Where(r => r.IsPublished)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking();

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ids = items.Select(r => r.Id).ToList();
        var commentCounts = await _context.BuyerRequestComments
            .Where(c => ids.Contains(c.BuyerRequestId))
            .GroupBy(c => c.BuyerRequestId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Id, g => g.Count, ct);

        return new PagedResult<BuyerRequestResponse>(
            items.Select(r => MapToResponse(r, r.User?.FullName ?? "", commentCounts.GetValueOrDefault(r.Id, 0))).ToList(),
            page, pageSize, total);
    }

    // ── Admin listing (all requests, with optional search) ────────────────────

    public async Task<PagedResult<BuyerRequestResponse>> GetAllForAdminAsync(
        int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.BuyerRequests
            .Include(r => r.User)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var term = search.Trim().ToLower();
            query = query.Where(r =>
                r.Title.ToLower().Contains(term) ||
                r.Description.ToLower().Contains(term) ||
                (r.City != null && r.City.ToLower().Contains(term)) ||
                (r.Neighborhood != null && r.Neighborhood.ToLower().Contains(term)));
        }

        query = query.OrderByDescending(r => r.CreatedAt);

        var total = await query.CountAsync(ct);
        var items = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var ids = items.Select(r => r.Id).ToList();
        var commentCounts = await _context.BuyerRequestComments
            .Where(c => ids.Contains(c.BuyerRequestId))
            .GroupBy(c => c.BuyerRequestId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Id, g => g.Count, ct);

        return new PagedResult<BuyerRequestResponse>(
            items.Select(r => MapToResponse(r, r.User?.FullName ?? "", commentCounts.GetValueOrDefault(r.Id, 0))).ToList(),
            page, pageSize, total);
    }

    // ── Delete request ────────────────────────────────────────────────────────

    public async Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default)
    {
        var entity = await _context.BuyerRequests
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (entity.UserId != userId)
            throw new BoiootException("غير مصرح لك بحذف هذا الطلب", 403);

        _context.BuyerRequests.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task AdminDeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.BuyerRequests
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        _context.BuyerRequests.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    public async Task AdminSetStatusAsync(Guid id, string status, CancellationToken ct = default)
    {
        var allowed = new[] { "Open", "Closed", "Reviewed" };
        if (!allowed.Contains(status))
            throw new BoiootException("الحالة غير صالحة", 400);

        var entity = await _context.BuyerRequests
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        entity.Status = status;
        await _context.SaveChangesAsync(ct);
    }

    public async Task<BuyerRequestCommentResponse> AdminRespondAsync(
        Guid adminUserId, Guid requestId, string content, CancellationToken ct = default)
    {
        var exists = await _context.BuyerRequests.AnyAsync(r => r.Id == requestId, ct);
        if (!exists) throw new BoiootException("الطلب غير موجود", 404);

        var adminUser = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(u => u.Id == adminUserId, ct);

        var comment = new BuyerRequestComment
        {
            Id              = Guid.NewGuid(),
            Content         = content,
            UserId          = adminUserId,
            BuyerRequestId  = requestId,
            ParentCommentId = null,
            CreatedAt       = DateTime.UtcNow,
            UpdatedAt       = DateTime.UtcNow,
        };

        _context.BuyerRequestComments.Add(comment);
        await _context.SaveChangesAsync(ct);

        return MapComment(comment, adminUser?.FullName ?? "الإدارة");
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    public async Task<List<BuyerRequestCommentResponse>> GetCommentsAsync(
        Guid requestId, CancellationToken ct = default)
    {
        var exists = await _context.BuyerRequests.AnyAsync(r => r.Id == requestId, ct);
        if (!exists) throw new BoiootException("الطلب غير موجود", 404);

        // Materialize to in-memory list first, then project.
        // Cannot call MapComment inside IQueryable.Select() because MapComment has an
        // optional parameter (actorName), which causes CS0854 in expression trees.
        var rows = await _context.BuyerRequestComments
            .Include(c => c.User)
            .Where(c => c.BuyerRequestId == requestId)
            .OrderBy(c => c.CreatedAt)
            .AsNoTracking()
            .ToListAsync(ct);

        return rows.Select(c => MapComment(c)).ToList();
    }

    public async Task<BuyerRequestCommentResponse> AddCommentAsync(
        Guid userId, Guid requestId, AddCommentDto dto, CancellationToken ct = default)
    {
        // Fetch the request to validate existence AND retrieve the owner's UserId.
        // We need the owner to send a notification — do NOT use AnyAsync here.
        var request = await _context.BuyerRequests
            .Where(r => r.Id == requestId && r.IsPublished)
            .Select(r => new { r.UserId, r.Title })
            .FirstOrDefaultAsync(ct);

        if (request is null) throw new BoiootException("الطلب غير موجود", 404);

        // ── Validate parent comment (if replying) ──────────────────────────────────
        Guid? parentAuthorId = null;
        if (dto.ParentCommentId.HasValue)
        {
            var parent = await _context.BuyerRequestComments
                .Where(c => c.Id == dto.ParentCommentId.Value
                         && c.BuyerRequestId == requestId)
                .Select(c => new { c.UserId })
                .FirstOrDefaultAsync(ct);

            if (parent is null)
                throw new BoiootException("التعليق الأصلي غير موجود في هذا الطلب", 400);

            parentAuthorId = parent.UserId;
        }

        var comment = new BuyerRequestComment
        {
            Content         = dto.Content.Trim(),
            BuyerRequestId  = requestId,
            UserId          = userId,
            ParentCommentId = dto.ParentCommentId,
        };

        _context.BuyerRequestComments.Add(comment);
        await _context.SaveChangesAsync(ct);

        // Fetch commenter's name for notification body and comment response.
        // NOTE: Do NOT assign comment.User = new User{...} on a tracked entity.
        // EF Core's change-tracker would queue it for INSERT → UNIQUE constraint on UserCode.
        var actorName = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct) ?? "";

        // ── Notifications: multi-recipient, priority-ordered, deduplicated ────────
        //
        //  Priority:
        //    0) Parent comment author (if reply)    → "تم الرد على تعليقك"         (request_reply)
        //    A) Request owner (if different)        → "تعليق جديد على طلبك"         (request_comment)
        //    B) Other previous participants         → "نشاط جديد في نقاش شاركت فيه" (request_discussion_activity)
        //
        //  Rules:
        //    • Never notify the actor.
        //    • Never duplicate — first assignment wins (HashSet<Guid>).
        //    • Owner gets message A even if they also commented before.

        var previousParticipantIds = await _context.BuyerRequestComments
            .Where(c => c.BuyerRequestId == requestId
                     && c.Id             != comment.Id   // exclude just-saved comment
                     && c.UserId         != userId)      // exclude actor
            .Select(c => c.UserId)
            .Distinct()
            .ToListAsync(ct);

        var recipientSet  = new HashSet<Guid>();
        var notifications = new List<NotificationRequest>();

        // 0) Parent comment author — most specific message for replies
        if (parentAuthorId.HasValue && parentAuthorId.Value != userId
                                    && recipientSet.Add(parentAuthorId.Value))
        {
            notifications.Add(new NotificationRequest(
                UserId            : parentAuthorId.Value,
                Type              : "request_reply",
                Title             : "تم الرد على تعليقك",
                Body              : $"قام {actorName} بالرد على تعليقك في الطلب: {request.Title}",
                RelatedEntityId   : requestId.ToString(),
                RelatedEntityType : "BuyerRequest"));
        }

        // A) Request owner
        if (request.UserId != userId && recipientSet.Add(request.UserId))
        {
            notifications.Add(new NotificationRequest(
                UserId            : request.UserId,
                Type              : "request_comment",
                Title             : "تعليق جديد على طلبك",
                Body              : $"قام {actorName} بالتعليق على طلبك: {request.Title}",
                RelatedEntityId   : requestId.ToString(),
                RelatedEntityType : "BuyerRequest"));
        }

        // B) Other previous participants
        foreach (var pId in previousParticipantIds)
        {
            if (!recipientSet.Add(pId)) continue;

            notifications.Add(new NotificationRequest(
                UserId            : pId,
                Type              : "request_discussion_activity",
                Title             : "نشاط جديد في نقاش شاركت فيه",
                Body              : $"قام {actorName} بالتعليق على طلب شاركت في نقاشه",
                RelatedEntityId   : requestId.ToString(),
                RelatedEntityType : "BuyerRequest"));
        }

        if (notifications.Count > 0)
        {
            _logger.LogInformation(
                "[BuyerRequest] Dispatching {Count} notification(s) — requestId={RequestId}, actorId={ActorId}, isReply={IsReply}, recipients=[{Recipients}]",
                notifications.Count, requestId, userId, dto.ParentCommentId.HasValue,
                string.Join(", ", recipientSet));
            try
            {
                await _notifications.CreateBatchAsync(notifications, ct);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex,
                    "[BuyerRequest] Failed to dispatch notifications for requestId={RequestId}", requestId);
            }
        }
        else
        {
            _logger.LogDebug(
                "[BuyerRequest] No notification recipients (self-comment or solo) requestId={RequestId}",
                requestId);
        }

        return MapComment(comment, actorName);
    }

    public async Task DeleteCommentAsync(Guid userId, Guid commentId, CancellationToken ct = default)
    {
        var comment = await _context.BuyerRequestComments
            .FirstOrDefaultAsync(c => c.Id == commentId, ct)
            ?? throw new BoiootException("التعليق غير موجود", 404);

        if (comment.UserId != userId)
            throw new BoiootException("غير مصرح لك بحذف هذا التعليق", 403);

        _context.BuyerRequestComments.Remove(comment);
        await _context.SaveChangesAsync(ct);
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private static BuyerRequestResponse MapToResponse(BuyerRequest r, string userName, int commentsCount) => new()
    {
        Id            = r.Id,
        Title         = r.Title,
        PropertyType  = r.PropertyType,
        Description   = r.Description,
        City          = r.City,
        Neighborhood  = r.Neighborhood,
        IsPublished   = r.IsPublished,
        Status        = r.Status,
        UserId        = r.UserId,
        UserName      = userName,
        CommentsCount = commentsCount,
        CreatedAt     = r.CreatedAt,
        UpdatedAt     = r.UpdatedAt,
    };

    // actorName overrides the navigation property — avoids EF change-tracker issues
    // when the caller cannot safely set c.User = new User{...} on a tracked entity.
    private static BuyerRequestCommentResponse MapComment(BuyerRequestComment c, string? actorName = null) => new()
    {
        Id              = c.Id,
        Content         = c.Content,
        UserId          = c.UserId,
        UserName        = actorName ?? c.User?.FullName ?? "",
        BuyerRequestId  = c.BuyerRequestId,
        ParentCommentId = c.ParentCommentId,
        CreatedAt       = c.CreatedAt,
    };
}
