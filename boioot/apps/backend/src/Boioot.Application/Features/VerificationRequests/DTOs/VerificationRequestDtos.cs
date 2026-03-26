namespace Boioot.Application.Features.VerificationRequests.DTOs;

// ── User-side request/response ────────────────────────────────────────────────

public class CreateVerificationRequestDto
{
    public string VerificationType { get; set; } = string.Empty;
    public string? UserNotes { get; set; }
}

public class AddDocumentDto
{
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? MimeType { get; set; }
}

public class VerificationDocumentResponse
{
    public Guid Id { get; set; }
    public string DocumentType { get; set; } = string.Empty;
    public string FileName { get; set; } = string.Empty;
    public string FileUrl { get; set; } = string.Empty;
    public string? MimeType { get; set; }
    public string Status { get; set; } = string.Empty;
    public string? Notes { get; set; }
    public DateTime CreatedAt { get; set; }
}

public class VerificationRequestResponse
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserFullName { get; set; }
    public string? UserEmail { get; set; }
    public string VerificationType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public DateTime? SubmittedAt { get; set; }
    public DateTime? ReviewedAt { get; set; }
    public string? ReviewedBy { get; set; }
    public string? UserNotes { get; set; }
    public string? AdminNotes { get; set; }
    public string? RejectionReason { get; set; }
    public List<VerificationDocumentResponse> Documents { get; set; } = [];
    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
}

public class VerificationRequestSummary
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string? UserFullName { get; set; }
    public string? UserEmail { get; set; }
    public string VerificationType { get; set; } = string.Empty;
    public string Status { get; set; } = string.Empty;
    public int DocumentCount { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime CreatedAt { get; set; }
}

// ── Admin review ──────────────────────────────────────────────────────────────

public class ReviewVerificationRequestDto
{
    /// <summary>Pending | Approved | Rejected | NeedsMoreInfo | Cancelled</summary>
    public string Status { get; set; } = string.Empty;
    public string? AdminNotes { get; set; }
    public string? RejectionReason { get; set; }

    // When Approved: optionally drive user verification fields via unified core
    public string? VerificationStatus { get; set; }
    public int?    VerificationLevel  { get; set; }
    public string? IdentityVerificationStatus  { get; set; }
    public string? BusinessVerificationStatus  { get; set; }
}

// ── Admin list filters ────────────────────────────────────────────────────────

public class AdminVerificationRequestFilter
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
    public string? Status { get; set; }
    public string? VerificationType { get; set; }
    public string? Search { get; set; }
}
