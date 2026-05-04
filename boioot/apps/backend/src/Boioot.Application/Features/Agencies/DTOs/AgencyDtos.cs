namespace Boioot.Application.Features.Agencies.DTOs;

// ── Public ──────────────────────────────────────────────────────────────────

public record AgencyListItemDto(
    string Id,
    string FullName,
    string Role,
    string RoleLabel,
    string? City,
    string? Bio,
    string? LogoUrl,
    bool   IsVerified,
    bool   IsFeatured,
    int    SortOrder,
    int    ListingCount);

public record AgencyDetailDto(
    string  Id,
    string  FullName,
    string  Role,
    string  RoleLabel,
    string? City,
    string? Bio,
    string? LogoUrl,
    string? Phone,
    bool    IsVerified,
    bool    IsFeatured,
    int     ListingCount,
    DateTime CreatedAt);

public record AgenciesPagedResult(
    IReadOnlyList<AgencyListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

// ── Admin ────────────────────────────────────────────────────────────────────

public record AdminAgencyDto(
    string  Id,
    string  FullName,
    string  Email,
    string? Phone,
    string  Role,
    string  RoleLabel,
    string? City,
    string? Bio,
    string? LogoUrl,
    bool    IsVisible,
    bool    IsVerified,
    bool    IsFeatured,
    int     SortOrder,
    bool    IsActive,
    DateTime CreatedAt,
    int     ListingCount);

public record AdminAgenciesPagedResult(
    IReadOnlyList<AdminAgencyDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

public record UpdateAgencyProfileRequest(
    bool    IsVisible,
    bool    IsVerified,
    bool    IsFeatured,
    string? Bio,
    string? City,
    string? LogoUrl,
    int     SortOrder);
