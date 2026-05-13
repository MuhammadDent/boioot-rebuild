namespace Boioot.Application.Features.Pages.DTOs;

/// <summary>Full page record returned to the admin panel.</summary>
public record StaticPageAdminDto(
    Guid   Id,
    string Slug,
    string TitleAr,
    string? ContentAr,
    string? MetaDescriptionAr,
    bool   IsActive,
    bool   ShowInFooter,
    string? FooterSection,
    int    SortOrder,
    bool   IsSystem,
    DateTime CreatedAt,
    DateTime UpdatedAt
);

/// <summary>Public read — only returned when IsActive = true.</summary>
public record StaticPagePublicDto(
    string Slug,
    string TitleAr,
    string? ContentAr,
    string? MetaDescriptionAr
);

/// <summary>Minimal record used to build footer navigation.</summary>
public record FooterLinkDto(
    string Slug,
    string TitleAr,
    string? FooterSection,
    int    SortOrder
);

/// <summary>Payload for create and update operations.</summary>
public record UpsertStaticPageDto(
    string  Slug,
    string  TitleAr,
    string? ContentAr,
    string? MetaDescriptionAr,
    bool    IsActive,
    bool    ShowInFooter,
    string? FooterSection,
    int     SortOrder
);
