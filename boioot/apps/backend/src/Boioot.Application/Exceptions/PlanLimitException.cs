namespace Boioot.Application.Exceptions;

/// <summary>
/// Thrown when a user attempts an action that exceeds their subscription plan limit,
/// or when their subscription has expired.
/// Produces a structured JSON response: { code, limit, message, upgradeRequired }.
/// </summary>
public class PlanLimitException : BoiootException
{
    /// <summary>The limit key that was exceeded (e.g. "max_active_listings").</summary>
    public string LimitKey { get; }

    /// <summary>Whether the user must upgrade / renew to proceed.</summary>
    public bool UpgradeRequired { get; }

    /// <param name="limitKey">Limit key constant from SubscriptionKeys.</param>
    /// <param name="message">Arabic user-facing message.</param>
    /// <param name="upgradeRequired">True by default; set false for non-paywall errors.</param>
    /// <param name="errorCode">Override error code — default "PLAN_LIMIT_REACHED".</param>
    public PlanLimitException(
        string limitKey,
        string message,
        bool   upgradeRequired = true,
        string errorCode       = "PLAN_LIMIT_REACHED")
        : base(message, statusCode: 403, errorCode: errorCode)
    {
        LimitKey        = limitKey;
        UpgradeRequired = upgradeRequired;
    }
}
