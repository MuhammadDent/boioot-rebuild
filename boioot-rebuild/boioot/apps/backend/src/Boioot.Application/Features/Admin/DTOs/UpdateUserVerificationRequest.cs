using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

/// <summary>
/// Payload for PUT /api/admin/users/{id}/verification.
/// All fields are optional — only non-null values are applied.
/// </summary>
public class UpdateUserVerificationRequest
{
    /// <summary>"None" | "Pending" | "PartiallyVerified" | "Verified" | "Rejected"</summary>
    public string? VerificationStatus { get; set; }

    /// <summary>0=None, 1=Basic, 2=Identity, 3=Business, 4=Trusted</summary>
    [Range(0, 4)]
    public int? VerificationLevel { get; set; }

    public bool? PhoneVerified { get; set; }
    public bool? EmailVerified { get; set; }

    /// <summary>"None" | "Pending" | "Approved" | "Rejected"</summary>
    public string? IdentityVerificationStatus { get; set; }

    /// <summary>"None" | "Pending" | "Approved" | "Rejected"</summary>
    public string? BusinessVerificationStatus { get; set; }

    /// <summary>Human-readable badge text, e.g. "وسيط موثوق" (null to clear).</summary>
    public string? VerificationBadge { get; set; }

    /// <summary>Internal admin notes (null = unchanged, empty string = clear).</summary>
    public string? VerificationNotes { get; set; }

    /// <summary>Rejection reason (null = unchanged, empty string = clear).</summary>
    public string? RejectionReason { get; set; }
}
