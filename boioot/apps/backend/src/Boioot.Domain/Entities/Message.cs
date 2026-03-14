namespace Boioot.Domain.Entities;

public class Message : BaseEntity
{
    public Guid ConversationId { get; set; }
    public Guid SenderId { get; set; }
    public string Content { get; set; } = string.Empty;
    public bool IsRead { get; set; } = false;

    public Conversation Conversation { get; set; } = null!;
    public User Sender { get; set; } = null!;
}
