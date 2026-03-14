using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class Conversation : AuditableEntity
{
    public Guid ParticipantOneId { get; set; }
    public User ParticipantOne { get; set; } = null!;

    public Guid ParticipantTwoId { get; set; }
    public User ParticipantTwo { get; set; } = null!;

    public Guid? PropertyId { get; set; }
    public Property? Property { get; set; }

    public DateTime LastMessageAt { get; set; } = DateTime.UtcNow;
    public string? LastMessagePreview { get; set; }
    public int UnreadCountForOne { get; set; } = 0;
    public int UnreadCountForTwo { get; set; } = 0;

    public ICollection<Message> Messages { get; set; } = [];
}
