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

    Task<PagedResult<AdminAgentResponse>> GetAdminAgentsAsync(
        int page, int pageSize, Guid? companyId, bool? isActive, CancellationToken ct = default);

    Task<AdminAgentResponse> CreateAdminAgentAsync(
        CreateAdminAgentRequest request, CancellationToken ct = default);

    Task<AdminAgentResponse> UpdateAdminAgentAsync(
        Guid userId, UpdateAdminAgentRequest request, CancellationToken ct = default);

    Task<PagedResult<AdminCompanyResponse>> GetCompaniesAsync(
        int page, int pageSize, string? city, bool? isVerified, CancellationToken ct = default);

    Task<PagedResult<PropertyResponse>> GetPropertiesAsync(
        int page, int pageSize, PropertyStatus? status, string? city, CancellationToken ct = default);

    Task<PagedResult<ProjectResponse>> GetProjectsAsync(
        int page, int pageSize, ProjectStatus? status, string? city, CancellationToken ct = default);

    Task<PagedResult<RequestResponse>> GetRequestsAsync(
        int page, int pageSize, RequestStatus? status, CancellationToken ct = default);

    Task<AdminUserResponse> CreateUserAsync(
        CreateAdminUserRequest request, CancellationToken ct = default);

    Task<AdminUserResponse> UpdateUserStatusAsync(
        Guid adminUserId, Guid targetUserId, bool isActive, CancellationToken ct = default);

    Task<AdminUserResponse> UpdateUserRoleAsync(
        Guid adminUserId, Guid targetUserId, UserRole newRole, CancellationToken ct = default);

    Task<AdminUserResponse> UpdateUserProfileImageAsync(
        Guid userId, string profileImageUrl, CancellationToken ct = default);

    Task<PagedResult<AdminBrokerResponse>> GetAdminBrokersAsync(
        int page, int pageSize, bool? isActive, CancellationToken ct = default);

    Task<AdminBrokerResponse> CreateAdminBrokerAsync(
        CreateAdminBrokerRequest request, CancellationToken ct = default);

    Task<AdminBrokerResponse> UpdateAdminBrokerAsync(
        Guid userId, UpdateAdminBrokerRequest request, CancellationToken ct = default);

    Task<AdminCompanyResponse> CreateCompanyAsync(
        CreateAdminCompanyRequest request, CancellationToken ct = default);

    Task<AdminCompanyResponse> UpdateCompanyAsync(
        Guid companyId, UpdateAdminCompanyRequest request, CancellationToken ct = default);

    Task<AdminCompanyResponse> VerifyCompanyAsync(
        Guid companyId, bool isVerified, CancellationToken ct = default);

    Task<List<ListingTypeResponse>> GetListingTypesAsync(CancellationToken ct = default);
    Task<ListingTypeResponse> CreateListingTypeAsync(UpsertListingTypeRequest request, CancellationToken ct = default);
    Task<ListingTypeResponse> UpdateListingTypeAsync(Guid id, UpsertListingTypeRequest request, CancellationToken ct = default);
    Task DeleteListingTypeAsync(Guid id, CancellationToken ct = default);

    // Property types
    Task<List<PropertyTypeResponse>> GetPropertyTypesAsync(CancellationToken ct = default);
    Task<PropertyTypeResponse> CreatePropertyTypeAsync(UpsertPropertyTypeRequest request, CancellationToken ct = default);
    Task<PropertyTypeResponse> UpdatePropertyTypeAsync(Guid id, UpsertPropertyTypeRequest request, CancellationToken ct = default);
    Task DeletePropertyTypeAsync(Guid id, CancellationToken ct = default);

    // Ownership types
    Task<List<OwnershipTypeResponse>> GetOwnershipTypesAsync(CancellationToken ct = default);
    Task<OwnershipTypeResponse> CreateOwnershipTypeAsync(UpsertOwnershipTypeRequest request, CancellationToken ct = default);
    Task<OwnershipTypeResponse> UpdateOwnershipTypeAsync(Guid id, UpsertOwnershipTypeRequest request, CancellationToken ct = default);
    Task DeleteOwnershipTypeAsync(Guid id, CancellationToken ct = default);
}
