using Boioot.Application.Common.Models;
using Boioot.Application.Features.BuyerRequests.DTOs;

namespace Boioot.Application.Features.BuyerRequests.Interfaces;

public interface IBuyerRequestService
{
    Task<BuyerRequestResponse> CreateAsync(Guid userId, CreateBuyerRequestDto dto, CancellationToken ct = default);
    Task<BuyerRequestResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<PagedResult<BuyerRequestResponse>> GetMyAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<BuyerRequestResponse>> GetPublicAsync(int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<BuyerRequestResponse>> GetAllForAdminAsync(int page, int pageSize, string? search, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
    Task AdminDeleteAsync(Guid id, CancellationToken ct = default);
    /// <summary>Admin: set request status (Open | Closed | Reviewed).</summary>
    Task AdminSetStatusAsync(Guid id, string status, CancellationToken ct = default);
    /// <summary>Admin: post a comment reply to a buyer request on behalf of admin.</summary>
    Task<BuyerRequestCommentResponse> AdminRespondAsync(Guid adminUserId, Guid requestId, string content, CancellationToken ct = default);

    Task<List<BuyerRequestCommentResponse>> GetCommentsAsync(Guid requestId, CancellationToken ct = default);
    Task<BuyerRequestCommentResponse> AddCommentAsync(Guid userId, Guid requestId, AddCommentDto dto, CancellationToken ct = default);
    Task DeleteCommentAsync(Guid userId, Guid commentId, CancellationToken ct = default);
}
