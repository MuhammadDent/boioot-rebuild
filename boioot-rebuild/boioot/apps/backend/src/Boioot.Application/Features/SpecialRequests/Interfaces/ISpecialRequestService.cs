using Boioot.Application.Features.SpecialRequests.DTOs;
using Boioot.Application.Common.Models;

namespace Boioot.Application.Features.SpecialRequests.Interfaces;

public interface ISpecialRequestService
{
    // Public
    Task<SpecialRequestResponse> SubmitAsync(SubmitSpecialRequestDto dto, Guid? userId, CancellationToken ct = default);

    // Admin
    Task<PagedResult<SpecialRequestResponse>> GetAllAsync(string? search, string? status, int page, int pageSize, CancellationToken ct = default);
    Task<SpecialRequestResponse?> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<SpecialRequestResponse> UpdateAsync(Guid id, UpdateSpecialRequestDto dto, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
