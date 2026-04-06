using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class VerificationRequest : BaseEntity
{
    public Guid UserId { get; set; }
    public User? User { get; set; }

    public VerificationType VerificationType { get; set; }
    public VerificationRequestStatus Status { get; set; } = VerificationRequestStatus.Draft;

    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }

    public string? UserNotes { get; set; }
    public string? AdminNotes { get; set; }
    public string? RejectionReason { get; set; }

    public ICollection<VerificationDocument> Documents { get; set; } = [];
}
