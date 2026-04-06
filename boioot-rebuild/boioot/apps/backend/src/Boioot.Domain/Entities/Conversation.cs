namespace Boioot.Domain.Entities;

public class Conversation : BaseEntity
{
    public Guid User1Id { get; set; }
    public Guid User2Id { get; set; }
    public Guid? PropertyId { get; set; }
    public Guid? ProjectId { get; set; }
    public DateTime? LastMessageAt { get; set; }

    public User User1 { get; set; } = null!;
    public User User2 { get; set; } = null!;
    public Property? Property { get; set; }
    public Project? Project { get; set; }
    public ICollection<Message> Messages { get; set; } = [];
}
