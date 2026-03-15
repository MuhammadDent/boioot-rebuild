using Boioot.Application.Common.Models;
using Boioot.Application.Features.Admin.DTOs;
using Boioot.Application.Features.Projects.DTOs;
using Boioot.Application.Features.Properties.DTOs;
using Boioot.Application.Features.Requests.DTOs;
using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Admin.Interfaces;

public interface IAdminService
{
    Task<PagedResult<AdminUserResponse>> GetUsersAsync(
        int page, int pageSize, UserRole? role, bool? isActive, CancellationToken ct = default);

    Task<PagedResult<AdminCompanyResponse>> GetCompaniesAsync(
        int page, int pageSize, string? city, bool? isVerified, CancellationToken ct = default);

    Task<PagedResult<PropertyResponse>> GetPropertiesAsync(
        int page, int pageSize, PropertyStatus? status, string? city, CancellationToken ct = default);

    Task<PagedResult<ProjectResponse>> GetProjectsAsync(
        int page, int pageSize, ProjectStatus? status, string? city, CancellationToken ct = default);

    Task<PagedResult<RequestResponse>> GetRequestsAsync(
        int page, int pageSize, RequestStatus? status, CancellationToken ct = default);

    Task<AdminUserResponse> UpdateUserStatusAsync(
        Guid adminUserId, Guid targetUserId, bool isActive, CancellationToken ct = default);

    Task<AdminUserResponse> UpdateUserRoleAsync(
        Guid adminUserId, Guid targetUserId, UserRole newRole, CancellationToken ct = default);

    Task<AdminCompanyResponse> VerifyCompanyAsync(
        Guid companyId, bool isVerified, CancellationToken ct = default);
}
