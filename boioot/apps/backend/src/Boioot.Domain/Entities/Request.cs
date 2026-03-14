using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Request : BaseEntity
{
    public Guid UserId { get; set; }
    public Guid? PropertyId { get; set; }
    public Guid? ProjectId { get; set; }
    public string? Message { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.Pending;

    public User User { get; set; } = null!;
    public Property? Property { get; set; }
    public Project? Project { get; set; }
}
