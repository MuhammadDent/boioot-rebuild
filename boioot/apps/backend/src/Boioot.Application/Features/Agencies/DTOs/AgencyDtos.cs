namespace Boioot.Application.Features.Agencies.DTOs;

// ── Public list ───────────────────────────────────────────────────────────────

public record AgencyListItemDto(
    string  Id,
    string  FullName,
    string  Role,
    string  RoleLabel,
    string? City,
    string? Bio,
    string? LogoUrl,
    // IsVerified is derived from VerificationStatus by ApplyVerificationCore
    // (true when VerificationStatus is Verified or PartiallyVerified)
    bool    IsVerified,
    string  VerificationStatus,   // "None"|"Pending"|"PartiallyVerified"|"Verified"|"Rejected"
    string? VerificationBadge,    // human-readable admin label, e.g. "وسيط موثوق"
    bool    IsFeatured,
    int     SortOrder,
    int     ListingCount);

// ── Public detail ─────────────────────────────────────────────────────────────

public record AgencyDetailDto(
    string   Id,
    string   FullName,
    string   Role,
    string   RoleLabel,
    string?  City,
    string?  Bio,
    string?  LogoUrl,
    string?  Phone,
    bool     IsVerified,
    string   VerificationStatus,
    int      VerificationLevel,   // 0=None … 4=Trusted
    string?  VerificationBadge,
    bool     IsFeatured,
    int      ListingCount,
    DateTime CreatedAt);

// ── Paged wrappers ────────────────────────────────────────────────────────────

public record AgenciesPagedResult(
    IReadOnlyList<AgencyListItemDto> Items,
    int Page,
    int PageSize,
    int TotalCount,
    int TotalPages);

// ── Admin list ────────────────────────────────────────────────────────────────

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
    // ── Verification (read from User — never written directly here) ────────
    bool    IsVerified,
    string  VerificationStatus,
    int     VerificationLevel,
    string  BusinessVerificationStatus,
    string? VerificationBadge,
    // ── Agency profile fields ──────────────────────────────────────────────
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

// ── Admin write (agency profile only — NOT verification) ─────────────────────
// Verification is managed exclusively via PUT /api/admin/agencies/{userId}/verification
// which calls IAdminService.UpdateUserVerificationAsync — the single source of truth.

public record UpdateAgencyProfileRequest(
    bool    IsVisible,
    bool    IsFeatured,
    string? Bio,
    string? City,
    string? LogoUrl,
    int     SortOrder);
