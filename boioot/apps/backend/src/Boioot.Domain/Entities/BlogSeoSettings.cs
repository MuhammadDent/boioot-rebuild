namespace Boioot.Domain.Entities;

/// <summary>
/// Singleton table — one row, stores global blog SEO template defaults.
/// </summary>
public class BlogSeoSettings
{
    public Guid Id { get; set; } = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public string SiteName { get; set; } = "بيوت";

    /// <summary>Used when a post is in Template mode for SeoTitle.</summary>
    public string DefaultPostSeoTitleTemplate { get; set; } = "{PostTitle} | {SiteName}";

    /// <summary>Used when a post is in Template mode for SeoDescription.</summary>
    public string DefaultPostSeoDescriptionTemplate { get; set; } = "{Excerpt}";

    /// <summary>Static SEO title for the /blog list page.</summary>
    public string DefaultBlogListSeoTitle { get; set; } = "المدونة | بيوت";

    /// <summary>Static SEO description for the /blog list page.</summary>
    public string DefaultBlogListSeoDescription { get; set; } = "تصفح أحدث المقالات والأخبار العقارية من بيوت سوريا";
}
