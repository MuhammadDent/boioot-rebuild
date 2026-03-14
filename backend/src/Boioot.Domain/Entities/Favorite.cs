using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class Favorite : BaseEntity
{
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;

    public Guid UserId { get; set; }
    public User User { get; set; } = null!;

    public Guid PropertyId { get; set; }
    public Property Property { get; set; } = null!;
}
