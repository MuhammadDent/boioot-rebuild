namespace Boioot.Domain.Entities;

public class SiteContent : BaseEntity
{
    /// <summary>Unique dotted key, e.g. "home.hero.title".</summary>
    public string Key { get; set; } = string.Empty;

    /// <summary>Grouping bucket: home | navbar | footer | general.</summary>
    public string Group { get; set; } = string.Empty;

    /// <summary>Value type hint: text | textarea | url | image | richtext.</summary>
    public string Type { get; set; } = "text";

    public string LabelAr { get; set; } = string.Empty;
    public string? LabelEn { get; set; }

    public string? ValueAr { get; set; }
    public string? ValueEn { get; set; }

    public bool IsActive { get; set; } = true;

    /// <summary>System-managed keys cannot be deleted.</summary>
    public bool IsSystem { get; set; } = false;

    public int SortOrder { get; set; } = 0;
}
