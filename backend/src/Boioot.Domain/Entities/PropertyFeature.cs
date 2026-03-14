using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class PropertyFeature : BaseEntity
{
    public string NameAr { get; set; } = string.Empty;
    public string NameEn { get; set; } = string.Empty;
    public string? Icon { get; set; }

    public Guid PropertyId { get; set; }
    public Property Property { get; set; } = null!;
}
