namespace Boioot.Application.Exceptions;

/// <summary>
/// Thrown when a user attempts an action that exceeds their subscription plan limit,
/// or when their subscription has expired.
/// Produces HTTP 422 with structured JSON:
/// { code, limitKey, currentValue?, planLimit?, suggestedPlanCode?, message, upgradeRequired }
/// </summary>
public class PlanLimitException : BoiootException
{
    /// <summary>The limit key that was exceeded (e.g. "max_active_listings").</summary>
    public string LimitKey { get; }

    /// <summary>Whether the user must upgrade / renew to proceed.</summary>
    public bool UpgradeRequired { get; }

    /// <summary>Current usage count at the time of the error.</summary>
    public int? CurrentValue { get; }

    /// <summary>The plan's hard limit value (-1 = unlimited).</summary>
    public int? PlanLimit { get; }

    /// <summary>The suggested plan code to upgrade to.</summary>
    public string? SuggestedPlanCode { get; }

    /// <param name="limitKey">Limit key constant from SubscriptionKeys.</param>
    /// <param name="message">Arabic user-facing message.</param>
    /// <param name="upgradeRequired">True by default; set false for non-paywall errors.</param>
    /// <param name="errorCode">Override error code — default "PLAN_LIMIT_EXCEEDED".</param>
    /// <param name="currentValue">Current usage count at time of error.</param>
    /// <param name="planLimit">The plan limit that was hit.</param>
    /// <param name="suggestedPlanCode">Plan code to suggest for upgrade.</param>
    public PlanLimitException(
        string  limitKey,
        string  message,
        bool    upgradeRequired   = true,
        string  errorCode         = "PLAN_LIMIT_EXCEEDED",
        int?    currentValue      = null,
        int?    planLimit         = null,
        string? suggestedPlanCode = null)
        : base(message, statusCode: 422, errorCode: errorCode)
    {
        LimitKey          = limitKey;
        UpgradeRequired   = upgradeRequired;
        CurrentValue      = currentValue;
        PlanLimit         = planLimit;
        SuggestedPlanCode = suggestedPlanCode;
    }
}
