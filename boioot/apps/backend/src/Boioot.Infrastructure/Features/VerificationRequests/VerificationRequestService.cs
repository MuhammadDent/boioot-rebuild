using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.Notifications.Interfaces;
using Boioot.Application.Features.VerificationRequests.DTOs;
using Boioot.Application.Features.VerificationRequests.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Domain.Enums;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.VerificationRequests;

public class VerificationRequestService : IVerificationRequestService
{
    private readonly BoiootDbContext _context;
    private readonly IUserNotificationService _notifications;
    private readonly INotificationTemplateService _notificationTemplates;
    private readonly ILogger<VerificationRequestService> _logger;

    public VerificationRequestService(
        BoiootDbContext context,
        IUserNotificationService notifications,
        INotificationTemplateService notificationTemplates,
        ILogger<VerificationRequestService> logger)
    {
        _context               = context;
        _notifications         = notifications;
        _notificationTemplates = notificationTemplates;
        _logger                = logger;
    }

    // ── User-side ─────────────────────────────────────────────────────────────

    public async Task<VerificationRequestResponse> CreateRequestAsync(
        Guid userId, CreateVerificationRequestDto dto, CancellationToken ct = default)
    {
        if (!Enum.TryParse<VerificationType>(dto.VerificationType, out var vt))
            throw new BoiootException("نوع التوثيق غير صالح", 400);

        var request = new VerificationRequest
        {
            Id               = Guid.NewGuid(),
            UserId           = userId,
            VerificationType = vt,
            Status           = VerificationRequestStatus.Draft,
            UserNotes        = dto.UserNotes?.Trim(),
            CreatedAt        = DateTime.UtcNow,
            UpdatedAt        = DateTime.UtcNow,
        };

        _context.Set<VerificationRequest>().Add(request);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} created verification request {RequestId}", userId, request.Id);

        return await GetRequestByIdCoreAsync(request.Id, ct);
    }

    public async Task<VerificationRequestResponse> AddDocumentAsync(
        Guid userId, Guid requestId, AddDocumentDto dto, CancellationToken ct = default)
    {
        var request = await _context.Set<VerificationRequest>()
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (request.Status is not VerificationRequestStatus.Draft and not VerificationRequestStatus.NeedsMoreInfo)
            throw new BoiootException("لا يمكن إضافة مستندات بعد تقديم الطلب", 400);

        if (!Enum.TryParse<DocumentType>(dto.DocumentType, out var dt))
            throw new BoiootException("نوع المستند غير صالح", 400);

        if (string.IsNullOrWhiteSpace(dto.FileUrl))
            throw new BoiootException("رابط الملف مطلوب", 400);

        var doc = new VerificationDocument
        {
            Id                    = Guid.NewGuid(),
            VerificationRequestId = requestId,
            DocumentType          = dt,
            FileName              = dto.FileName.Trim(),
            FileUrl               = dto.FileUrl.Trim(),
            MimeType              = dto.MimeType?.Trim(),
            Status                = DocumentStatus.Pending,
            CreatedAt             = DateTime.UtcNow,
            UpdatedAt             = DateTime.UtcNow,
        };

        _context.Set<VerificationDocument>().Add(doc);
        request.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return await GetRequestByIdCoreAsync(requestId, ct);
    }

    public async Task<VerificationRequestResponse> SubmitRequestAsync(
        Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var request = await _context.Set<VerificationRequest>()
            .Include(r => r.Documents)
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (request.Status is not VerificationRequestStatus.Draft and not VerificationRequestStatus.NeedsMoreInfo)
            throw new BoiootException("الطلب مُقدَّم بالفعل", 400);

        if (!request.Documents.Any())
            throw new BoiootException("يجب إرفاق مستند واحد على الأقل قبل التقديم", 400);

        request.Status      = VerificationRequestStatus.Pending;
        request.SubmittedAt = DateTime.UtcNow;
        request.UpdatedAt   = DateTime.UtcNow;

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} submitted verification request {RequestId}", userId, requestId);

        // Notify admins of new verification submission
        try
        {
            var userName = await _context.Users
                .Where(u => u.Id == userId)
                .Select(u => u.FullName)
                .FirstOrDefaultAsync(ct) ?? "مستخدم";
            await NotifyAdminsVerificationAsync(
                "verification_new_request",
                "طلب توثيق جديد",
                $"تقدّم {userName} بطلب توثيق جديد ويحتاج إلى مراجعة",
                requestId.ToString(),
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send admin notification for verification request {RequestId}", requestId);
        }

        return await GetRequestByIdCoreAsync(requestId, ct);
    }

    public async Task<PagedResult<VerificationRequestSummary>> GetMyRequestsAsync(
        Guid userId, int page, int pageSize, CancellationToken ct = default)
    {
        page     = Math.Max(1, page);
        pageSize = Math.Clamp(pageSize, 1, 50);

        var query = _context.Set<VerificationRequest>()
            .Where(r => r.UserId == userId)
            .AsNoTracking();

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .Select(r => new VerificationRequestSummary
            {
                Id               = r.Id,
                UserId           = r.UserId,
                VerificationType = r.VerificationType.ToString(),
                Status           = r.Status.ToString(),
                DocumentCount    = r.Documents.Count,
                SubmittedAt      = r.SubmittedAt,
                CreatedAt        = r.CreatedAt,
            })
            .ToListAsync(ct);

        return new PagedResult<VerificationRequestSummary>(items, page, pageSize, total);
    }

    public async Task<VerificationRequestResponse> GetMyRequestByIdAsync(
        Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var exists = await _context.Set<VerificationRequest>()
            .AnyAsync(r => r.Id == requestId && r.UserId == userId, ct);

        if (!exists)
            throw new BoiootException("الطلب غير موجود", 404);

        return await GetRequestByIdCoreAsync(requestId, ct);
    }

    public async Task DeleteDraftAsync(Guid userId, Guid requestId, CancellationToken ct = default)
    {
        var request = await _context.Set<VerificationRequest>()
            .Include(r => r.Documents)
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (request.Status != VerificationRequestStatus.Draft)
            throw new BoiootException("لا يمكن حذف طلب مُقدَّم أو مكتمل", 400);

        _context.Set<VerificationDocument>().RemoveRange(request.Documents);
        _context.Set<VerificationRequest>().Remove(request);
        await _context.SaveChangesAsync(ct);

        _logger.LogInformation("User {UserId} deleted draft verification request {RequestId}", userId, requestId);
    }

    public async Task<VerificationRequestResponse> RemoveDocumentAsync(
        Guid userId, Guid requestId, Guid documentId, CancellationToken ct = default)
    {
        var request = await _context.Set<VerificationRequest>()
            .FirstOrDefaultAsync(r => r.Id == requestId && r.UserId == userId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (request.Status is not VerificationRequestStatus.Draft and not VerificationRequestStatus.NeedsMoreInfo)
            throw new BoiootException("لا يمكن حذف مستند بعد تقديم الطلب", 400);

        var doc = await _context.Set<VerificationDocument>()
            .FirstOrDefaultAsync(d => d.Id == documentId && d.VerificationRequestId == requestId, ct)
            ?? throw new BoiootException("المستند غير موجود", 404);

        _context.Set<VerificationDocument>().Remove(doc);
        request.UpdatedAt = DateTime.UtcNow;
        await _context.SaveChangesAsync(ct);

        return await GetRequestByIdCoreAsync(requestId, ct);
    }

    // ── Admin-side ────────────────────────────────────────────────────────────

    public async Task<PagedResult<VerificationRequestSummary>> GetAllRequestsAsync(
        AdminVerificationRequestFilter filter, CancellationToken ct = default)
    {
        filter.Page     = Math.Max(1, filter.Page);
        filter.PageSize = Math.Clamp(filter.PageSize, 1, 100);

        var query = _context.Set<VerificationRequest>()
            .Include(r => r.User)
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(filter.Status) &&
            Enum.TryParse<VerificationRequestStatus>(filter.Status, out var statusEnum))
            query = query.Where(r => r.Status == statusEnum);

        if (!string.IsNullOrWhiteSpace(filter.VerificationType) &&
            Enum.TryParse<VerificationType>(filter.VerificationType, out var vtEnum))
            query = query.Where(r => r.VerificationType == vtEnum);

        if (!string.IsNullOrWhiteSpace(filter.Search))
        {
            var s = filter.Search.Trim().ToLower();
            query = query.Where(r =>
                (r.User != null && (r.User.FullName.ToLower().Contains(s) || r.User.Email.ToLower().Contains(s))));
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderByDescending(r => r.CreatedAt)
            .Skip((filter.Page - 1) * filter.PageSize)
            .Take(filter.PageSize)
            .Select(r => new VerificationRequestSummary
            {
                Id               = r.Id,
                UserId           = r.UserId,
                UserFullName     = r.User != null ? r.User.FullName : null,
                UserEmail        = r.User != null ? r.User.Email : null,
                VerificationType = r.VerificationType.ToString(),
                Status           = r.Status.ToString(),
                DocumentCount    = r.Documents.Count,
                SubmittedAt      = r.SubmittedAt,
                CreatedAt        = r.CreatedAt,
            })
            .ToListAsync(ct);

        return new PagedResult<VerificationRequestSummary>(items, filter.Page, filter.PageSize, total);
    }

    public async Task<VerificationRequestResponse> GetRequestByIdAsync(
        Guid requestId, CancellationToken ct = default)
        => await GetRequestByIdCoreAsync(requestId, ct);

    public async Task<VerificationRequestResponse> ReviewRequestAsync(
        Guid adminUserId, Guid requestId, ReviewVerificationRequestDto dto, CancellationToken ct = default)
    {
        if (!Enum.TryParse<VerificationRequestStatus>(dto.Status, out var newStatus))
            throw new BoiootException("حالة الطلب غير صالحة", 400);

        var request = await _context.Set<VerificationRequest>()
            .Include(r => r.Documents)
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        if (request.Status is VerificationRequestStatus.Draft)
            throw new BoiootException("لا يمكن مراجعة طلب لم يُقدَّم بعد", 400);

        request.Status         = newStatus;
        request.AdminNotes     = dto.AdminNotes?.Trim();
        request.RejectionReason = dto.RejectionReason?.Trim();
        request.ReviewedAt     = DateTime.UtcNow;
        request.ReviewedBy     = adminUserId.ToString();
        request.UpdatedAt      = DateTime.UtcNow;

        // When approved: update the user's verification via the unified service logic
        if (newStatus is VerificationRequestStatus.Approved)
        {
            var user = await _context.Users
                .IgnoreQueryFilters()
                .FirstOrDefaultAsync(u => u.Id == request.UserId, ct);

            if (user is not null)
            {
                // Resolve target status — default to Verified if not specified
                var targetUserStatus = VerificationStatus.Verified;
                if (!string.IsNullOrWhiteSpace(dto.VerificationStatus) &&
                    Enum.TryParse<VerificationStatus>(dto.VerificationStatus, out var vs))
                    targetUserStatus = vs;

                // Resolve target level — default to at least Basic(1) if not specified
                var currentLevel = user.VerificationLevel;
                var targetLevel  = dto.VerificationLevel.HasValue
                    ? dto.VerificationLevel.Value
                    : Math.Max(currentLevel, 1);

                // Apply through the unified core (single source of truth)
                ApplyVerificationCore(user, targetUserStatus, targetLevel, adminUserId);

                // Apply identity / business sub-statuses if provided
                if (!string.IsNullOrWhiteSpace(dto.IdentityVerificationStatus) &&
                    Enum.TryParse<IdentityVerificationStatus>(dto.IdentityVerificationStatus, out var idvs))
                    user.IdentityVerificationStatus = idvs;

                if (!string.IsNullOrWhiteSpace(dto.BusinessVerificationStatus) &&
                    Enum.TryParse<BusinessVerificationStatus>(dto.BusinessVerificationStatus, out var bvs))
                    user.BusinessVerificationStatus = bvs;
            }
        }

        await _context.SaveChangesAsync(ct);

        _logger.LogInformation(
            "Admin {AdminId} reviewed verification request {RequestId}: status={Status}",
            adminUserId, requestId, newStatus);

        // Notify user about the review result
        try
        {
            var (notifType, title, body) = newStatus switch
            {
                VerificationRequestStatus.Approved =>
                    ("verification_approved",
                     string.Empty,
                     string.Empty),
                VerificationRequestStatus.Rejected =>
                    ("verification_rejected",
                     string.Empty,
                     string.Empty),
                VerificationRequestStatus.NeedsMoreInfo =>
                    ("verification_needs_info",
                     "طلب التوثيق يحتاج معلومات إضافية",
                     string.IsNullOrWhiteSpace(dto.AdminNotes)
                         ? "يرجى إضافة المستندات المطلوبة وإعادة تقديم الطلب."
                         : $"يرجى استكمال الطلب: {dto.AdminNotes}"),
                _ =>
                    ("verification_updated",
                     "تم تحديث طلب التوثيق",
                     "تم تحديث حالة طلب التوثيق الخاص بك.")
            };

            if (notifType is "verification_approved" or "verification_rejected")
            {
                var rendered = _notificationTemplates.Render(
                    notifType,
                    new Dictionary<string, string?>
                    {
                        ["rejectionReason"] = dto.RejectionReason,
                        ["rejectionReasonText"] = string.IsNullOrWhiteSpace(dto.RejectionReason)
                            ? " يمكنك تعديل البيانات أو المستندات وإرسال الطلب من جديد."
                            : $" سبب المراجعة: {dto.RejectionReason}. يمكنك تعديل الطلب وإرساله من جديد."
                    });

                if (rendered is null) return await GetRequestByIdCoreAsync(requestId, ct);

                title = rendered.Title;
                body = rendered.Body;
            }

            await _notifications.CreateAsync(
                userId:            request.UserId,
                type:              notifType,
                title:             title,
                body:              body,
                relatedEntityId:   requestId.ToString(),
                relatedEntityType: "VerificationRequest",
                ct:                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Failed to send user notification for verification review {RequestId}", requestId);
        }

        return await GetRequestByIdCoreAsync(requestId, ct);
    }

    // ── Shared private helpers ────────────────────────────────────────────────

    private async Task<VerificationRequestResponse> GetRequestByIdCoreAsync(
        Guid requestId, CancellationToken ct)
    {
        var r = await _context.Set<VerificationRequest>()
            .Include(r => r.User)
            .Include(r => r.Documents)
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == requestId, ct)
            ?? throw new BoiootException("الطلب غير موجود", 404);

        return new VerificationRequestResponse
        {
            Id               = r.Id,
            UserId           = r.UserId,
            UserFullName     = r.User?.FullName,
            UserEmail        = r.User?.Email,
            VerificationType = r.VerificationType.ToString(),
            Status           = r.Status.ToString(),
            SubmittedAt      = r.SubmittedAt,
            ReviewedAt       = r.ReviewedAt,
            ReviewedBy       = r.ReviewedBy,
            UserNotes        = r.UserNotes,
            AdminNotes       = r.AdminNotes,
            RejectionReason  = r.RejectionReason,
            CreatedAt        = r.CreatedAt,
            UpdatedAt        = r.UpdatedAt,
            Documents        = r.Documents.Select(d => new VerificationDocumentResponse
            {
                Id           = d.Id,
                DocumentType = d.DocumentType.ToString(),
                FileName     = d.FileName,
                FileUrl      = d.FileUrl,
                MimeType     = d.MimeType,
                Status       = d.Status.ToString(),
                Notes        = d.Notes,
                CreatedAt    = d.CreatedAt,
            }).OrderBy(d => d.CreatedAt).ToList(),
        };
    }

    /// <summary>
    /// Mirrors AdminService.ApplyVerificationCore — single source of truth for
    /// computing IsVerified from VerificationStatus. Kept in sync with AdminService.
    /// </summary>
    private static void ApplyVerificationCore(
        User user, VerificationStatus status, int level, Guid adminUserId)
    {
        user.VerificationStatus = status;
        user.VerificationLevel  = Math.Clamp(level, 0, 4);
        user.IsVerified         = status is VerificationStatus.Verified
                                          or VerificationStatus.PartiallyVerified;

        if (user.IsVerified)
        {
            user.VerifiedAt ??= DateTime.UtcNow;
            user.VerifiedBy   = adminUserId.ToString();
        }
        else
        {
            user.VerifiedAt = null;
        }

        user.UpdatedAt = DateTime.UtcNow;
    }

    private async Task NotifyAdminsVerificationAsync(
        string type, string title, string body, string relatedEntityId, CancellationToken ct)
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
            Type:              type,
            Title:             title,
            Body:              body,
            RelatedEntityId:   relatedEntityId,
            RelatedEntityType: "VerificationRequest"
        )).ToList();

        await _notifications.CreateBatchAsync(batch, ct);
    }
}
