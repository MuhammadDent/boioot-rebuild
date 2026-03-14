using Boioot.Application.Features.Dashboard.DTOs;

namespace Boioot.Application.Features.Dashboard.Interfaces;

public interface IDashboardService
{
    Task<DashboardSummaryResponse> GetSummaryAsync(Guid userId, string userRole, CancellationToken ct = default);
    Task<IReadOnlyList<DashboardPropertyItem>> GetPropertiesAsync(Guid userId, string userRole, CancellationToken ct = default);
    Task<IReadOnlyList<DashboardProjectItem>> GetProjectsAsync(Guid userId, string userRole, CancellationToken ct = default);
    Task<IReadOnlyList<DashboardRequestItem>> GetRequestsAsync(Guid userId, string userRole, CancellationToken ct = default);
    Task<DashboardMessageSummaryResponse> GetMessagesSummaryAsync(Guid userId, CancellationToken ct = default);
}
