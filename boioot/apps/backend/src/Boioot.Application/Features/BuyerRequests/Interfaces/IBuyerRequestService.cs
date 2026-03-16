using Boioot.Application.Common.Models;
using Boioot.Application.Features.BuyerRequests.DTOs;

namespace Boioot.Application.Features.BuyerRequests.Interfaces;

public interface IBuyerRequestService
{
    Task<BuyerRequestResponse> CreateAsync(Guid userId, CreateBuyerRequestDto dto, CancellationToken ct = default);
    Task<PagedResult<BuyerRequestResponse>> GetMyAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<BuyerRequestResponse>> GetPublicAsync(int page, int pageSize, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, Guid id, CancellationToken ct = default);
}
