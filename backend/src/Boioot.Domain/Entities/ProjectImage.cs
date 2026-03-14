using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class ProjectImage : BaseEntity
{
    public string Url { get; set; } = string.Empty;
    public string? PublicId { get; set; }
    public bool IsMain { get; set; } = false;
    public int SortOrder { get; set; } = 0;

    public Guid ProjectId { get; set; }
    public Project Project { get; set; } = null!;
}
