using Boioot.Application.Features.SpecialRequests.DTOs;

namespace Boioot.Application.Features.SpecialRequests.Interfaces;

public interface ISpecialRequestTypeService
{
    // Public — active types only
    Task<List<SpecialRequestTypeResponse>> GetActiveAsync(CancellationToken ct = default);

    // Admin — all types
    Task<List<SpecialRequestTypeResponse>> GetAllAsync(CancellationToken ct = default);
    Task<SpecialRequestTypeResponse>       CreateAsync(CreateSpecialRequestTypeDto dto, CancellationToken ct = default);
    Task<SpecialRequestTypeResponse>       UpdateAsync(Guid id, UpdateSpecialRequestTypeDto dto, CancellationToken ct = default);
    Task                                   DeleteAsync(Guid id, CancellationToken ct = default);
}
