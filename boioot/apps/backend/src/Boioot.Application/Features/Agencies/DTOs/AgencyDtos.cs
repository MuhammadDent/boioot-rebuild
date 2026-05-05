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
    int     ListingCount,
    // ── Ratings (aggregated from AgencyRatings table) ─────────────────────────
    decimal AverageRating,
    int     RatingsCount);

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
    DateTime CreatedAt,
    // ── Ratings ───────────────────────────────────────────────────────────────
    decimal  AverageRating,
    int      RatingsCount);

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

// LogoUrl removed — photo always comes from User.ProfileImageUrl.
public record UpdateAgencyProfileRequest(
    bool    IsVisible,
    bool    IsFeatured,
    string? Bio,
    string? City,
    int     SortOrder);

// ── Agency ratings ────────────────────────────────────────────────────────────

public record AgencyRatingDto(
    string  Id,
    string  ReviewerId,
    string  ReviewerName,
    int     Rating,
    string? Comment,
    DateTime CreatedAt);

public record CreateAgencyRatingRequest(int Rating, string? Comment);

public record AgencyRatingsPagedResult(
    IReadOnlyList<AgencyRatingDto> Items,
    int     Page,
    int     PageSize,
    int     TotalCount,
    decimal AverageRating,
    int     RatingsCount);

// ── Agency city item for hierarchical filter ──────────────────────────────────

public record AgencyCityItem(string City, string Province);

// ── Self-service: profile the owner sees/edits ───────────────────────────────
// BusinessName removed — name comes from User.FullName.
// LogoUrl removed    — photo comes from User.ProfileImageUrl.

public record MyAgencyProfileDto(
    string? Bio,
    string? City,
    string? Province,
    string? ContactNumber,
    string? WhatsappLink,
    string? Address,
    string? WebsiteUrl,
    // Read-only admin fields shown for info only
    bool    IsVisible,
    bool    IsFeatured,
    string  VerificationStatus,
    string? VerificationBadge,
    bool    IsVerified);

// ── Self-service: what the owner can submit (no admin fields) ─────────────────

public record UpsertMyAgencyProfileRequest(
    string? Bio,
    string? City,
    string? Province,
    string? ContactNumber,
    string? WhatsappLink,
    string? Address,
    string? WebsiteUrl);
