namespace Boioot.Domain.Entities;

/// <summary>
/// Simple key/value store for site-wide feature flags and configuration.
/// Key is the primary key (e.g. "section_projects_enabled").
/// Value is stored as a string; consumers parse booleans via bool.Parse / bool.TryParse.
/// </summary>
public class AppSetting
{
    public string Key   { get; set; } = string.Empty;
    public string Value { get; set; } = "true";
}
