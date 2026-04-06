using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class Request : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string Phone { get; set; } = string.Empty;
    public string? Email { get; set; }
    public string? Message { get; set; }
    public RequestStatus Status { get; set; } = RequestStatus.New;

    public Guid? PropertyId { get; set; }
    public Guid? ProjectId { get; set; }
    public Guid? UserId { get; set; }

    public Property? Property { get; set; }
    public Project? Project { get; set; }
    public User? User { get; set; }
}
