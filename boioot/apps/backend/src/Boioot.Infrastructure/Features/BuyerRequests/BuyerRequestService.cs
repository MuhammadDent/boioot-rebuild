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

        return MapToResponse(entity, user ?? "");
    }

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

        return new PagedResult<BuyerRequestResponse>(
            items.Select(r => MapToResponse(r, r.User?.FullName ?? "")).ToList(),
            page, pageSize, total);
    }

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

        return new PagedResult<BuyerRequestResponse>(
            items.Select(r => MapToResponse(r, r.User?.FullName ?? "")).ToList(),
            page, pageSize, total);
    }

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

    private static BuyerRequestResponse MapToResponse(BuyerRequest r, string userName) => new()
    {
        Id           = r.Id,
        Title        = r.Title,
        PropertyType = r.PropertyType,
        Description  = r.Description,
        City         = r.City,
        Neighborhood = r.Neighborhood,
        IsPublished  = r.IsPublished,
        UserId       = r.UserId,
        UserName     = userName,
        CreatedAt    = r.CreatedAt,
        UpdatedAt    = r.UpdatedAt,
    };
}
