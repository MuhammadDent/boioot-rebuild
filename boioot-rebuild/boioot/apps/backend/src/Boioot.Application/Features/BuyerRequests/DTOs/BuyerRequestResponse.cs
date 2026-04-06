namespace Boioot.Application.Features.BuyerRequests.DTOs;

public class BuyerRequestResponse
{
    public Guid Id { get; set; }
    public string Title { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Neighborhood { get; set; }
    public bool IsPublished { get; set; }
    public string Status { get; set; } = "Open";
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public int CommentsCount { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}
