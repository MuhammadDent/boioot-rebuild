using Boioot.Domain.Common;

namespace Boioot.Domain.Entities;

public class RequestResponse : AuditableEntity
{
    public string? MessageAr { get; set; }
    public string? MessageEn { get; set; }
    public bool IsRead { get; set; } = false;

    public Guid RequestId { get; set; }
    public PropertyRequest Request { get; set; } = null!;

    public Guid ResponderId { get; set; }
    public User Responder { get; set; } = null!;

    public Guid? PropertyId { get; set; }
    public Property? Property { get; set; }
}
