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
        // Project: load only FullName from User, not the full entity
        var row = await _context.BuyerRequests
            .AsNoTracking()
            .Where(r => r.Id == id)
            .Select(r => new
            {
                r.Id, r.Title, r.PropertyType, r.Description, r.City,
                r.Neighborhood, r.IsPublished, r.Status, r.UserId,
                r.CreatedAt, r.UpdatedAt,
                UserName = r.User != null ? r.User.FullName : ""
            })
            .FirstOrDefaultAsync(ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        var commentsCount = await _context.BuyerRequestComments
            .CountAsync(c => c.BuyerRequestId == id, ct);

        return new BuyerRequestResponse
        {
            Id            = row.Id,
            Title         = row.Title,
            PropertyType  = row.PropertyType,
            Description   = row.Description,
            City          = row.City,
            Neighborhood  = row.Neighborhood,
            IsPublished   = row.IsPublished,
            Status        = row.Status,
            UserId        = row.UserId,
            UserName      = row.UserName,
            CommentsCount = commentsCount,
            CreatedAt     = row.CreatedAt,
            UpdatedAt     = row.UpdatedAt,
        };
    }

    // ── My requests ───────────────────────────────────────────────────────────

    public async Task<PagedResult<BuyerRequestResponse>> GetMyAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BuyerRequests
            .Where(r => r.UserId == userId)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking();

        var total = await query.CountAsync(ct);

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id, r.Title, r.PropertyType, r.Description, r.City,
                r.Neighborhood, r.IsPublished, r.Status, r.UserId,
                r.CreatedAt, r.UpdatedAt,
                UserName = r.User != null ? r.User.FullName : ""
            })
            .ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var commentCounts = await _context.BuyerRequestComments
            .Where(c => ids.Contains(c.BuyerRequestId))
            .GroupBy(c => c.BuyerRequestId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Id, g => g.Count, ct);

        return new PagedResult<BuyerRequestResponse>(
            rows.Select(r => new BuyerRequestResponse
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
                UserName      = r.UserName,
                CommentsCount = commentCounts.GetValueOrDefault(r.Id, 0),
                CreatedAt     = r.CreatedAt,
                UpdatedAt     = r.UpdatedAt,
            }).ToList(),
            page, pageSize, total);
    }

    // ── Public listing ────────────────────────────────────────────────────────

    public async Task<PagedResult<BuyerRequestResponse>> GetPublicAsync(
        int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.BuyerRequests
            .Where(r => r.IsPublished)
            .OrderByDescending(r => r.CreatedAt)
            .AsNoTracking();

        var total = await query.CountAsync(ct);

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id, r.Title, r.PropertyType, r.Description, r.City,
                r.Neighborhood, r.IsPublished, r.Status, r.UserId,
                r.CreatedAt, r.UpdatedAt,
                UserName = r.User != null ? r.User.FullName : ""
            })
            .ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var commentCounts = await _context.BuyerRequestComments
            .Where(c => ids.Contains(c.BuyerRequestId))
            .GroupBy(c => c.BuyerRequestId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Id, g => g.Count, ct);

        return new PagedResult<BuyerRequestResponse>(
            rows.Select(r => new BuyerRequestResponse
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
                UserName      = r.UserName,
                CommentsCount = commentCounts.GetValueOrDefault(r.Id, 0),
                CreatedAt     = r.CreatedAt,
                UpdatedAt     = r.UpdatedAt,
            }).ToList(),
            page, pageSize, total);
    }

    // ── Admin listing (all requests, with optional search) ────────────────────

    public async Task<PagedResult<BuyerRequestResponse>> GetAllForAdminAsync(
        int page, int pageSize, string? search, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 100);

        var query = _context.BuyerRequests.AsNoTracking().AsQueryable();

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

        var rows = await query
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new
            {
                r.Id, r.Title, r.PropertyType, r.Description, r.City,
                r.Neighborhood, r.IsPublished, r.Status, r.UserId,
                r.CreatedAt, r.UpdatedAt,
                UserName = r.User != null ? r.User.FullName : ""
            })
            .ToListAsync(ct);

        var ids = rows.Select(r => r.Id).ToList();
        var commentCounts = await _context.BuyerRequestComments
            .Where(c => ids.Contains(c.BuyerRequestId))
            .GroupBy(c => c.BuyerRequestId)
            .Select(g => new { Id = g.Key, Count = g.Count() })
            .ToDictionaryAsync(g => g.Id, g => g.Count, ct);

        return new PagedResult<BuyerRequestResponse>(
            rows.Select(r => new BuyerRequestResponse
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
                UserName      = r.UserName,
                CommentsCount = commentCounts.GetValueOrDefault(r.Id, 0),
                CreatedAt     = r.CreatedAt,
                UpdatedAt     = r.UpdatedAt,
            }).ToList(),
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
        if (string.IsNullOrWhiteSpace(content))
            throw new BoiootException("نص الرد مطلوب ولا يمكن أن يكون فارغاً", 400);

        var exists = await _context.BuyerRequests.AnyAsync(r => r.Id == requestId, ct);
        if (!exists) throw new BoiootException("الطلب غير موجود", 404);

        var adminName = await _context.Users
            .AsNoTracking()
            .Where(u => u.Id == adminUserId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct) ?? "الإدارة";

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

        return MapComment(comment, adminName);
    }

    // ── Comments ──────────────────────────────────────────────────────────────

    public async Task<List<BuyerRequestCommentResponse>> GetCommentsAsync(
        Guid requestId, CancellationToken ct = default)
    {
        var exists = await _context.BuyerRequests.AnyAsync(r => r.Id == requestId, ct);
        if (!exists) throw new BoiootException("الطلب غير موجود", 404);

        // Project: only FullName from User, not the full entity
        var rows = await _context.BuyerRequestComments
            .Where(c => c.BuyerRequestId == requestId)
            .OrderBy(c => c.CreatedAt)
            .AsNoTracking()
            .Select(c => new
            {
                c.Id, c.Content, c.UserId, c.BuyerRequestId,
                c.ParentCommentId, c.CreatedAt,
                UserName = c.User != null ? c.User.FullName : ""
            })
            .ToListAsync(ct);

        return rows.Select(c => new BuyerRequestCommentResponse
        {
            Id              = c.Id,
            Content         = c.Content,
            UserId          = c.UserId,
            UserName        = c.UserName,
            BuyerRequestId  = c.BuyerRequestId,
            ParentCommentId = c.ParentCommentId,
            CreatedAt       = c.CreatedAt,
        }).ToList();
    }

    public async Task<BuyerRequestCommentResponse> AddCommentAsync(
        Guid userId, Guid requestId, AddCommentDto dto, CancellationToken ct = default)
    {
        var request = await _context.BuyerRequests
            .Where(r => r.Id == requestId && r.IsPublished)
            .Select(r => new { r.UserId, r.Title })
            .FirstOrDefaultAsync(ct);

        if (request is null) throw new BoiootException("الطلب غير موجود", 404);

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

        var actorName = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct) ?? "";

        var previousParticipantIds = await _context.BuyerRequestComments
            .Where(c => c.BuyerRequestId == requestId
                     && c.Id             != comment.Id
                     && c.UserId         != userId)
            .Select(c => c.UserId)
            .Distinct()
            .ToListAsync(ct);

        var recipientSet  = new HashSet<Guid>();
        var notifications = new List<NotificationRequest>();

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
