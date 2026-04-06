namespace Boioot.Application.Features.LeadUnlocks;

public record LeadUnlockResult(
    bool   AlreadyUnlocked,
    string ContactPhone,
    string ContactWhatsApp,
    string OwnerName,
    int    UnlocksUsedThisMonth,
    int    UnlocksAllowedThisMonth   // -1 = unlimited
);

public interface ILeadUnlockService
{
    /// <summary>
    /// Attempts to unlock contact details for a property.
    /// Checks monthly_lead_unlocks limit → records unlock → returns contact info.
    /// Throws PlanLimitException (422) if no unlock credits remain.
    /// </summary>
    Task<LeadUnlockResult> UnlockAsync(Guid userId, Guid propertyId, CancellationToken ct = default);

    /// <summary>
    /// Returns how many lead unlocks the account has used this calendar month,
    /// and the plan's monthly allowance (-1 = unlimited, 0 = blocked).
    /// </summary>
    Task<(int used, int limit)> GetMonthlyUsageAsync(Guid userId, CancellationToken ct = default);
}
