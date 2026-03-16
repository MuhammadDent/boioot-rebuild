namespace Boioot.Application.Features.BuyerRequests.DTOs;

public class BuyerRequestCommentResponse
{
    public Guid Id { get; set; }
    public string Content { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public Guid BuyerRequestId { get; set; }
    public DateTime CreatedAt { get; set; }
}
