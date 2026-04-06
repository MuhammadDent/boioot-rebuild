namespace Boioot.Domain.Entities;

/// <summary>
/// Immutable audit log of every state change on a subscription.
/// Once written, history rows must never be modified or deleted.
/// </summary>
public class SubscriptionHistory
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>The subscription this event belongs to.</summary>
    public Guid SubscriptionId { get; set; }

    /// <summary>
    /// Machine-readable event type.
    /// Values: created | upgraded | downgraded | renewed | canceled |
    ///         expired | trial_started | trial_converted | assigned | changed
    /// </summary>
    public string EventType { get; set; } = string.Empty;

    /// <summary>Plan in effect before this change. Null for 'created' events.</summary>
    public Guid? OldPlanId { get; set; }

    /// <summary>Plan in effect after this change.</summary>
    public Guid? NewPlanId { get; set; }

    /// <summary>Optional human-readable note (admin comment, reason, etc.).</summary>
    public string? Notes { get; set; }

    /// <summary>UTC timestamp of when this event occurred.</summary>
    public DateTime CreatedAtUtc { get; set; } = DateTime.UtcNow;

    /// <summary>User who triggered this change. Null for system events.</summary>
    public Guid? CreatedByUserId { get; set; }

    // ── Navigation ────────────────────────────────────────────────────────────

    public Subscription Subscription { get; set; } = null!;
    public Plan? OldPlan { get; set; }
    public Plan? NewPlan { get; set; }
    public User? CreatedByUser { get; set; }
}
