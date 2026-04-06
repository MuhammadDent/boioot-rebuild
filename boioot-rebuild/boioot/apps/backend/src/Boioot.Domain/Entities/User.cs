using Boioot.Domain.Common;
using Boioot.Domain.Enums;

namespace Boioot.Domain.Entities;

public class User : BaseEntity, ISoftDeletable
{
    public string UserCode { get; set; } = string.Empty;
    public string FullName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string PasswordHash { get; set; } = string.Empty;
    public UserRole Role { get; set; } = UserRole.User;
    public bool IsActive { get; set; } = true;
    public bool IsDeleted { get; set; } = false;
    public string? ProfileImageUrl { get; set; }

    /// <summary>
    /// Counts how many listings this user has ever successfully created while on the
    /// free-trial (User role). Incremented on creation, never decremented on deletion.
    /// Used to enforce the 2-listing all-time trial cap.
    /// </summary>
    public int TrialListingsUsed { get; set; } = 0;

    /// <summary>UTC timestamp of the last successful login.</summary>
    public DateTime? LastLoginAt { get; set; }

    // ── Legacy identity verification (admin-controlled, backward compat) ──────

    /// <summary>True once an admin has granted verification at any level.</summary>
    public bool IsVerified { get; set; } = false;

    /// <summary>UTC timestamp when the admin last changed verification.</summary>
    public DateTime? VerifiedAt { get; set; }

    /// <summary>Id (as string) of the admin who last changed verification.</summary>
    public string? VerifiedBy { get; set; }

    // ── Multi-level verification (Phase 2) ───────────────────────────────────

    /// <summary>Overall verification state of the account.</summary>
    public VerificationStatus VerificationStatus { get; set; } = VerificationStatus.None;

    /// <summary>
    /// Ordered trust level: 0=None, 1=Basic, 2=Identity, 3=Business, 4=Trusted.
    /// Stored as INTEGER for easy range queries.
    /// </summary>
    public int VerificationLevel { get; set; } = 0;

    /// <summary>True if the user's phone number has been confirmed.</summary>
    public bool PhoneVerified { get; set; } = false;

    /// <summary>True if the user's email address has been confirmed.</summary>
    public bool EmailVerified { get; set; } = false;

    /// <summary>State of the identity-document review (national ID / passport).</summary>
    public IdentityVerificationStatus IdentityVerificationStatus { get; set; } = IdentityVerificationStatus.None;

    /// <summary>State of the business/professional-licence review (broker, office, company).</summary>
    public BusinessVerificationStatus BusinessVerificationStatus { get; set; } = BusinessVerificationStatus.None;

    /// <summary>Human-readable badge label assigned by an admin (e.g. "وسيط موثوق").</summary>
    public string? VerificationBadge { get; set; }

    /// <summary>Internal admin notes about this user's verification.</summary>
    public string? VerificationNotes { get; set; }

    /// <summary>Reason stored when a verification request is rejected.</summary>
    public string? RejectionReason { get; set; }

    public Agent? Agent { get; set; }
    public ICollection<Review> Reviews { get; set; } = [];
    public ICollection<AccountUser> AccountUsers { get; set; } = [];
}
