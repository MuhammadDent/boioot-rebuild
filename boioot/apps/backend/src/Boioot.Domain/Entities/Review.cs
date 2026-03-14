using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Review
{
    public Guid Id { get; set; }
    public Guid ReviewerId { get; set; }
    public ReviewTargetType TargetType { get; set; }
    public Guid TargetId { get; set; }
    public int Rating { get; set; }
    public string? Comment { get; set; }
    public DateTime CreatedAt { get; set; }

    public User Reviewer { get; set; } = null!;
}
