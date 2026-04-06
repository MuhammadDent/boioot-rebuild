using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class Favorite : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid PropertyId { get; set; }

    public User User { get; set; } = null!;
    public Property Property { get; set; } = null!;
}
