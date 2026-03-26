namespace Boioot.Application.Features.Admin.DTOs;

/// <summary>Detailed verification record for one user — returned by GET /verification and PUT /verification.</summary>
public class UserVerificationResponse
{
    public Guid   UserId   { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Role     { get; set; } = string.Empty;

    // ── Legacy fields (backward compat) ──────────────────────────────────────
    public bool      IsVerified { get; set; }
    public DateTime? VerifiedAt { get; set; }
    public string?   VerifiedBy { get; set; }

    // ── Multi-level verification ──────────────────────────────────────────────
    public string VerificationStatus          { get; set; } = "None";
    public int    VerificationLevel           { get; set; } = 0;
    public bool   PhoneVerified               { get; set; }
    public bool   EmailVerified               { get; set; }
    public string IdentityVerificationStatus  { get; set; } = "None";
    public string BusinessVerificationStatus  { get; set; } = "None";
    public string? VerificationBadge          { get; set; }
    public string? VerificationNotes          { get; set; }
    public string? RejectionReason            { get; set; }

    public DateTime UpdatedAt { get; set; }
}
