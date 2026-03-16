namespace Boioot.Domain.Entities;

public class BuyerRequest : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string PropertyType { get; set; } = string.Empty;
    public string Description { get; set; } = string.Empty;
    public string? City { get; set; }
    public string? Neighborhood { get; set; }
    public bool IsPublished { get; set; } = true;

    public Guid UserId { get; set; }
    public User? User { get; set; }
}
