namespace Boioot.Domain.Entities;

/// <summary>
/// A CMS-managed static page (privacy policy, terms, FAQ, about, etc.).
/// Slug is the URL key and must be unique.
/// IsSystem pages cannot be deleted via the admin API.
/// </summary>
public class StaticPage : BaseEntity
{
    /// <summary>URL-safe identifier, e.g. "privacy-policy".</summary>
    public string Slug { get; set; } = string.Empty;

    /// <summary>Arabic page title shown in the browser tab and page heading.</summary>
    public string TitleAr { get; set; } = string.Empty;

    /// <summary>HTML or Markdown content in Arabic.</summary>
    public string? ContentAr { get; set; }

    /// <summary>Short Arabic description for meta tags / footer.</summary>
    public string? MetaDescriptionAr { get; set; }

    /// <summary>When false the page returns 404 and is hidden from footer.</summary>
    public bool IsActive { get; set; } = true;

    /// <summary>When true the page link appears in the footer.</summary>
    public bool ShowInFooter { get; set; } = false;

    /// <summary>"support" | "policy" — which footer column this page belongs to.</summary>
    public string? FooterSection { get; set; }

    /// <summary>Ascending sort order within the footer column.</summary>
    public int SortOrder { get; set; } = 0;

    /// <summary>System pages (seeded defaults) cannot be deleted via the admin API.</summary>
    public bool IsSystem { get; set; } = false;
}
