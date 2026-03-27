using System.ComponentModel.DataAnnotations.Schema;

namespace Boioot.Domain.Entities;

/// <summary>
/// Immutable audit log of every admin action taken on a SubscriptionPaymentRequest.
/// Use-cases: notify-user, status-change, manual comments.
/// </summary>
public class SubscriptionRequestAction : BaseEntity
{
    /// <summary>Parent payment request.</summary>
    public Guid RequestId { get; set; }

    /// <summary>"notify_user" | "status_change" | "comment"</summary>
    public string ActionType { get; set; } = string.Empty;

    /// <summary>"approved" | "rejected" | "missing_info"</summary>
    public string Decision { get; set; } = string.Empty;

    /// <summary>Title of the notification sent to the user.</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Full message body written by the admin.</summary>
    public string Note { get; set; } = string.Empty;

    public bool SentInternally { get; set; }
    public bool SentByEmail    { get; set; }
    public bool EmailFailed    { get; set; }

    /// <summary>
    /// The admin user who performed this action.
    /// Named PerformedByUserId (not PerformedById) to avoid EF Core generating
    /// a conflicting shadow FK column alongside the navigation property.
    /// </summary>
    public Guid PerformedByUserId { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────
    public SubscriptionPaymentRequest? Request { get; set; }

    /// <summary>
    /// ForeignKey attribute tells EF Core to use PerformedByUserId as the FK
    /// instead of creating a shadow 'PerformedById' column.
    /// </summary>
    [ForeignKey(nameof(PerformedByUserId))]
    public User? PerformedBy { get; set; }
}
