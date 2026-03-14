namespace Boioot.Domain.Entities;

public class PropertyImage
{
    public Guid Id { get; set; }
    public Guid PropertyId { get; set; }
    public string ImageUrl { get; set; } = string.Empty;
    public bool IsPrimary { get; set; } = false;
    public int Order { get; set; } = 0;
    public DateTime CreatedAt { get; set; }

    public Property Property { get; set; } = null!;
}
