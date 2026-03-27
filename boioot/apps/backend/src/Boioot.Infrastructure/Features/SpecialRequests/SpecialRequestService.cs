using System.Text.Json;
using Boioot.Application.Common.Models;
using Boioot.Application.Features.Notifications.DTOs;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Application.Features.SpecialRequests.DTOs;
using Boioot.Application.Features.SpecialRequests.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.SpecialRequests;

public class SpecialRequestService : ISpecialRequestService
{
    private readonly BoiootDbContext        _context;
    private readonly IUserNotificationService _notifications;

    public SpecialRequestService(BoiootDbContext context, IUserNotificationService notifications)
    {
        _context       = context;
        _notifications = notifications;
    }

    // ── Public ────────────────────────────────────────────────────────────────

    public async Task<SpecialRequestResponse> SubmitAsync(
        SubmitSpecialRequestDto dto,
        Guid? userId,
        CancellationToken ct = default)
    {
        var code = await GenerateCodeAsync(ct);

        var entity = new SpecialRequest
        {
            PublicCode      = code,
            CreatedByUserId = userId,
            FullName        = dto.FullName.Trim(),
            Phone           = dto.Phone.Trim(),
            WhatsApp        = dto.WhatsApp?.Trim(),
            Email           = dto.Email?.Trim(),
            RequestType     = dto.RequestType?.Trim(),
            Message         = dto.Message.Trim(),
            Attachments     = dto.AttachmentUrls is { Count: > 0 }
                                ? JsonSerializer.Serialize(dto.AttachmentUrls)
                                : null,
            Status          = SpecialRequestStatus.New,
            Source          = dto.Source ?? "web",
        };

        _context.SpecialRequests.Add(entity);
        await _context.SaveChangesAsync(ct);

        // Notify all admin users
        await NotifyAdminsAsync(entity, ct);

        return Map(entity);
    }

    // ── Admin ─────────────────────────────────────────────────────────────────

    public async Task<PagedResult<SpecialRequestResponse>> GetAllAsync(
        string? search,
        string? status,
        int page,
        int pageSize,
        CancellationToken ct = default)
    {
        var query = _context.SpecialRequests
            .Include(r => r.AssignedToUser)
            .Include(r => r.CreatedByUser)
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(search))
        {
            var s = search.Trim().ToLower();
            query = query.Where(r =>
                r.FullName.ToLower().Contains(s) ||
                r.Phone.Contains(s) ||
                r.PublicCode.ToLower().Contains(s) ||
                r.Message.ToLower().Contains(s));
        }

        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(r => r.Status == status);

        var total = await query.CountAsync(ct);
        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        return new PagedResult<SpecialRequestResponse>(
            items.Select(Map).ToList(),
            page,
            pageSize,
            total
        );
    }

    public async Task<SpecialRequestResponse?> GetByIdAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.SpecialRequests
            .Include(r => r.AssignedToUser)
            .Include(r => r.CreatedByUser)
            .FirstOrDefaultAsync(r => r.Id == id, ct);

        return entity is null ? null : Map(entity);
    }

    public async Task<SpecialRequestResponse> UpdateAsync(
        Guid id,
        UpdateSpecialRequestDto dto,
        CancellationToken ct = default)
    {
        var entity = await _context.SpecialRequests
            .Include(r => r.AssignedToUser)
            .Include(r => r.CreatedByUser)
            .FirstOrDefaultAsync(r => r.Id == id, ct)
            ?? throw new KeyNotFoundException($"SpecialRequest {id} not found.");

        if (dto.Status is not null && SpecialRequestStatus.All.Contains(dto.Status))
        {
            entity.Status = dto.Status;
            if (dto.Status is SpecialRequestStatus.Closed or SpecialRequestStatus.Archived)
                entity.ClosedAt ??= DateTime.UtcNow;
        }

        if (dto.AssignedToUserId.HasValue)
            entity.AssignedToUserId = dto.AssignedToUserId.Value == Guid.Empty
                ? null
                : dto.AssignedToUserId.Value;

        if (dto.NotesInternal is not null)
            entity.NotesInternal = dto.NotesInternal;

        entity.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);
        return Map(entity);
    }

    public async Task DeleteAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _context.SpecialRequests.FindAsync([id], ct)
            ?? throw new KeyNotFoundException($"SpecialRequest {id} not found.");

        _context.SpecialRequests.Remove(entity);
        await _context.SaveChangesAsync(ct);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private async Task<string> GenerateCodeAsync(CancellationToken ct)
    {
        var year  = DateTime.UtcNow.Year;
        var count = await _context.SpecialRequests.CountAsync(ct);
        return $"SR-{year}-{count + 1:D4}";
    }

    private async Task NotifyAdminsAsync(SpecialRequest entity, CancellationToken ct)
    {
        var adminRole = await _context.RbacRoles
            .FirstOrDefaultAsync(r => r.Name == "Admin", ct);

        if (adminRole is null) return;

        var adminUserIds = await _context.RbacUserRoles
            .Where(ur => ur.RoleId == adminRole.Id)
            .Select(ur => ur.UserId)
            .ToListAsync(ct);

        if (adminUserIds.Count == 0) return;

        var batch = adminUserIds.Select(uid => new NotificationRequest(
            UserId:            uid,
            Type:              "special_request_new",
            Title:             "طلب خاص جديد",
            Body:              $"تم استلام طلب خاص جديد من {entity.FullName}",
            RelatedEntityId:   entity.Id.ToString(),
            RelatedEntityType: "special_request"
        )).ToList();

        await _notifications.CreateBatchAsync(batch, ct);
    }

    private static SpecialRequestResponse Map(SpecialRequest r) => new()
    {
        Id                  = r.Id,
        PublicCode          = r.PublicCode,
        FullName            = r.FullName,
        Phone               = r.Phone,
        WhatsApp            = r.WhatsApp,
        Email               = r.Email,
        RequestType         = r.RequestType,
        Message             = r.Message,
        AttachmentUrls      = r.Attachments is not null
                                ? JsonSerializer.Deserialize<List<string>>(r.Attachments)
                                : null,
        Status              = r.Status,
        Source              = r.Source,
        NotesInternal       = r.NotesInternal,
        ClosedAt            = r.ClosedAt,
        CreatedAt           = r.CreatedAt,
        UpdatedAt           = r.UpdatedAt,
        AssignedToUserId    = r.AssignedToUserId,
        AssignedToUserName  = r.AssignedToUser?.FullName,
        CreatedByUserId     = r.CreatedByUserId,
        CreatedByUserName   = r.CreatedByUser?.FullName,
    };
}
