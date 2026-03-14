using Boioot.Application.Common.Models;

namespace Boioot.Application.Features.Messaging.DTOs;

public class ConversationDetailResponse
{
    public Guid Id { get; set; }
    public Guid OtherUserId { get; set; }
    public string OtherUserName { get; set; } = string.Empty;

    public Guid? PropertyId { get; set; }
    public string? PropertyTitle { get; set; }

    public Guid? ProjectId { get; set; }
    public string? ProjectTitle { get; set; }

    public PagedResult<MessageResponse> Messages { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
