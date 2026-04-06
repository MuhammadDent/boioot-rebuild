using Boioot.Application.Common.Models;
using Boioot.Application.Features.Projects.DTOs;

namespace Boioot.Application.Features.Projects.Interfaces;

public interface IProjectService
{
    Task<PagedResult<ProjectResponse>> GetPublicListAsync(ProjectFilters filters, CancellationToken ct = default);
    Task<ProjectResponse> GetByIdPublicAsync(Guid id, CancellationToken ct = default);
    Task<ProjectResponse> GetByIdDashboardAsync(Guid userId, string userRole, Guid projectId, CancellationToken ct = default);
    Task<ProjectResponse> CreateAsync(Guid userId, string userRole, CreateProjectRequest request, CancellationToken ct = default);
    Task<ProjectResponse> UpdateAsync(Guid userId, string userRole, Guid projectId, UpdateProjectRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, string userRole, Guid projectId, CancellationToken ct = default);
    Task<PagedResult<ProjectResponse>> GetDashboardListAsync(Guid userId, string userRole, ProjectFilters filters, CancellationToken ct = default);
}
