using Boioot.Application.Common.Models;
using Boioot.Application.Features.Dashboard.DTOs;

namespace Boioot.Application.Features.Dashboard.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryResponse> GetSummaryAsync(Guid userId, string userRole, CancellationToken ct = default);
    Task<PagedResult<DashboardPropertyItem>> GetPropertiesAsync(Guid userId, string userRole, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<DashboardProjectItem>> GetProjectsAsync(Guid userId, string userRole, int page, int pageSize, CancellationToken ct = default);
    Task<PagedResult<DashboardRequestItem>> GetRequestsAsync(Guid userId, string userRole, int page, int pageSize, CancellationToken ct = default);
    Task<DashboardMessageSummaryResponse> GetMessagesSummaryAsync(Guid userId, CancellationToken ct = default);
}
