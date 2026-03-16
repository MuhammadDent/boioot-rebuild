using Boioot.Application.Common.Models;
using Boioot.Application.Features.Properties.DTOs;

namespace Boioot.Application.Features.Properties.Interfaces;

public interface IPropertyService
{
    Task<PagedResult<PropertyResponse>> GetPublicListAsync(PropertyFilters filters, CancellationToken ct = default);
    Task<PropertyResponse> GetByIdPublicAsync(Guid id, CancellationToken ct = default);
    Task<PropertyResponse> GetByIdDashboardAsync(Guid userId, string userRole, Guid propertyId, CancellationToken ct = default);
    Task<PropertyResponse> CreateAsync(Guid userId, string userRole, CreatePropertyRequest request, CancellationToken ct = default);
    Task<PropertyResponse> UpdateAsync(Guid userId, string userRole, Guid propertyId, UpdatePropertyRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid userId, string userRole, Guid propertyId, CancellationToken ct = default);
    Task<PagedResult<PropertyResponse>> GetDashboardListAsync(Guid userId, string userRole, PropertyFilters filters, CancellationToken ct = default);
    Task<PropertyResponse> CreateUserListingAsync(Guid userId, string userRole, CreatePropertyRequest request, CancellationToken ct = default);
    Task<PagedResult<PropertyResponse>> GetMyListingsAsync(Guid userId, int page, int pageSize, CancellationToken ct = default);
    Task DeleteMyListingAsync(Guid userId, Guid propertyId, CancellationToken ct = default);
    Task<(int used, int limit)> GetMonthlyListingStatsAsync(Guid userId, string userRole, CancellationToken ct = default);
}
