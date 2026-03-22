namespace Boioot.Application.Exceptions;

/// <summary>
/// Thrown when a user attempts an action that exceeds their subscription plan limit.
/// Produces a structured JSON response: { code, limit, message, upgradeRequired }.
/// </summary>
public class PlanLimitException : BoiootException
{
    /// <summary>The limit key that was exceeded (e.g. "max_active_listings").</summary>
    public string LimitKey { get; }

    /// <summary>Whether the user must upgrade to proceed.</summary>
    public bool UpgradeRequired { get; }

    public PlanLimitException(string limitKey, string message, bool upgradeRequired = true)
        : base(message, statusCode: 403, errorCode: "PLAN_LIMIT_REACHED")
    {
        LimitKey        = limitKey;
        UpgradeRequired = upgradeRequired;
    }
}
