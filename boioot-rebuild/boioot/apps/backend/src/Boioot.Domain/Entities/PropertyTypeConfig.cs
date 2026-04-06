namespace Boioot.Domain.Entities;

public class PropertyTypeConfig : BaseEntity
{
    public string Value { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string Icon  { get; set; } = string.Empty;
    public int Order { get; set; }
    public bool IsActive { get; set; } = true;
}
