using Boioot.Application.Common.Models;
using Boioot.Application.Exceptions;
using Boioot.Application.Features.BuyerRequests.DTOs;
using Boioot.Application.Features.BuyerRequests.Interfaces;
using Boioot.Domain.Entities;
using Boioot.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace Boioot.Infrastructure.Features.BuyerRequests;

public class BuyerRequestService : IBuyerRequestService
{
    private readonly BoiootDbContext _context;

    public BuyerRequestService(BoiootDbContext context)
    {
        _context = context;
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

    // ── Comments ──────────────────────────────────────────────────────────────

    public async Task<List<BuyerRequestCommentResponse>> GetCommentsAsync(
        Guid requestId, CancellationToken ct = default)
    {
        var exists = await _context.BuyerRequests.AnyAsync(r => r.Id == requestId, ct);
        if (!exists) throw new BoiootException("الطلب غير موجود", 404);

        return await _context.BuyerRequestComments
            .Include(c => c.User)
            .Where(c => c.BuyerRequestId == requestId)
            .OrderBy(c => c.CreatedAt)
            .AsNoTracking()
            .Select(c => MapComment(c))
            .ToListAsync(ct);
    }

    public async Task<BuyerRequestCommentResponse> AddCommentAsync(
        Guid userId, Guid requestId, AddCommentDto dto, CancellationToken ct = default)
    {
        var exists = await _context.BuyerRequests.AnyAsync(r => r.Id == requestId && r.IsPublished, ct);
        if (!exists) throw new BoiootException("الطلب غير موجود", 404);

        var comment = new BuyerRequestComment
        {
            Content         = dto.Content.Trim(),
            BuyerRequestId  = requestId,
            UserId          = userId,
        };

        _context.BuyerRequestComments.Add(comment);
        await _context.SaveChangesAsync(ct);

        var user = await _context.Users
            .Where(u => u.Id == userId)
            .Select(u => u.FullName)
            .FirstOrDefaultAsync(ct);

        comment.User = new User { FullName = user ?? "" };
        return MapComment(comment);
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
        UserId        = r.UserId,
        UserName      = userName,
        CommentsCount = commentsCount,
        CreatedAt     = r.CreatedAt,
        UpdatedAt     = r.UpdatedAt,
    };

    private static BuyerRequestCommentResponse MapComment(BuyerRequestComment c) => new()
    {
        Id             = c.Id,
        Content        = c.Content,
        UserId         = c.UserId,
        UserName       = c.User?.FullName ?? "",
        BuyerRequestId = c.BuyerRequestId,
        CreatedAt      = c.CreatedAt,
    };
}
