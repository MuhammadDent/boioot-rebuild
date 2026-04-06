namespace Boioot.Application.Exceptions;

/// <summary>
/// Thrown when a user attempts an action that requires a plan feature
/// not included in their current subscription.
/// Produces a structured JSON response: { code, feature, message, upgradeRequired }.
/// </summary>
public class PlanFeatureDisabledException : BoiootException
{
    /// <summary>The feature key that is not available (e.g. "analytics_dashboard").</summary>
    public string FeatureKey { get; }

    /// <summary>Whether the user must upgrade to access this feature.</summary>
    public bool UpgradeRequired { get; }

    /// <param name="featureKey">Feature key constant from SubscriptionKeys.</param>
    /// <param name="message">Arabic user-facing message.</param>
    /// <param name="upgradeRequired">True by default.</param>
    public PlanFeatureDisabledException(
        string featureKey,
        string message,
        bool   upgradeRequired = true)
        : base(message, statusCode: 403, errorCode: "FEATURE_DISABLED")
    {
        FeatureKey       = featureKey;
        UpgradeRequired  = upgradeRequired;
    }
}
