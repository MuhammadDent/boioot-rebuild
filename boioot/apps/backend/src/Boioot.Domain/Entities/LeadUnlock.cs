namespace Boioot.Domain.Entities;

/// <summary>
/// Records a successful lead (contact-info) unlock event by an account.
/// Monthly usage is derived by querying UnlockedAt within the current calendar month.
/// </summary>
public class LeadUnlock
{
    public Guid      Id                { get; set; } = Guid.NewGuid();
    public Guid      UnlockerAccountId { get; set; }
    public Guid      PropertyId        { get; set; }

    /// <summary>"PerLead" (one-off) | "Subscription" (covered by plan)</summary>
    public string    UnlockType        { get; set; } = "PerLead";

    public DateTime  UnlockedAt        { get; set; } = DateTime.UtcNow;
    public DateTime? ExpiresAt         { get; set; }
    public decimal?  PricePaid         { get; set; }
    public DateTime  CreatedAt         { get; set; } = DateTime.UtcNow;

    // Navigation
    public Property? Property { get; set; }
}
