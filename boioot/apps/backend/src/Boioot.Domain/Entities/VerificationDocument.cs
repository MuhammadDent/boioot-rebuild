using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class VerificationDocument : BaseEntity
{
    public Guid VerificationRequestId { get; set; }
    public VerificationRequest? VerificationRequest { get; set; }

    public DocumentType DocumentType { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public DocumentStatus Status { get; set; } = DocumentStatus.Pending;
    public string? Notes { get; set; }
}
