namespace Boioot.Application.Features.Messaging.DTOs;

public class ConversationSummaryResponse
{
    public Guid Id { get; set; }
    public Guid OtherUserId { get; set; }
    public string OtherUserName { get; set; } = string.Empty;
    public DateTime? LastMessageAt { get; set; }
    public int UnreadCount { get; set; }

    public Guid? PropertyId { get; set; }
    public string? PropertyTitle { get; set; }

    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }

    public DateTime CreatedAt { get; set; }
}
