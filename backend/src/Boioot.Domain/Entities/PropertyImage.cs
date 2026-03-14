using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class PropertyImage : BaseEntity
{
    public string Url { get; set; } = string.Empty;
    public string? PublicId { get; set; }
    public bool IsMain { get; set; } = false;
    public int SortOrder { get; set; } = 0;
    public string? AltTextAr { get; set; }
    public string? AltTextEn { get; set; }

    public Guid PropertyId { get; set; }
    public Property Property { get; set; } = null!;
}
