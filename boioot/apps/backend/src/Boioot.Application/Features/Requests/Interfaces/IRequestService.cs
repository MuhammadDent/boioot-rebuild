using Boioot.Application.Common.Models;
using Boioot.Application.Features.Requests.DTOs;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Requests.Interfaces;

public interface IRequestService
{
    Task<RequestResponse> SubmitAsync(SubmitRequestRequest request, CancellationToken ct = default);
    Task<PagedResult<RequestResponse>> GetDashboardListAsync(Guid userId, string userRole, RequestFilters filters, CancellationToken ct = default);
    Task<RequestResponse> GetByIdAsync(Guid userId, string userRole, Guid requestId, CancellationToken ct = default);
    Task<RequestResponse> UpdateStatusAsync(Guid userId, string userRole, Guid requestId, RequestStatus newStatus, CancellationToken ct = default);
}
