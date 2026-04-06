namespace Boioot.Domain.Entities;

public class Notification : BaseEntity
{
    public Guid UserId { get; set; }
    public string Type { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string Body { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;
    public string? RelatedEntityId { get; set; }
    public string? RelatedEntityType { get; set; }

    public User User { get; set; } = null!;
}
