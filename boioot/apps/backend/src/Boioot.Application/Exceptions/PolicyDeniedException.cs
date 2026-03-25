namespace Boioot.Application.Exceptions;

/// <summary>
/// Thrown when a user attempts an action that is restricted by an access policy,
/// typically when the feature's AccessPolicy is "admin_only" and the user is not an admin.
/// Produces a structured JSON response:
///   { code, feature, policy, message, adminRequired }.
/// HTTP 403.
/// </summary>
public class PolicyDeniedException : BoiootException
{
    /// <summary>The feature key whose policy blocked the action (e.g. "verified_badge").</summary>
    public string FeatureKey { get; }

    /// <summary>The policy that blocked the action (e.g. "admin_only").</summary>
    public string Policy { get; }

    /// <summary>True when admin activation is required to unlock this feature.</summary>
    public bool AdminRequired { get; }

    /// <param name="featureKey">Stable feature key constant from SubscriptionKeys.</param>
    /// <param name="policy">The blocking policy: "admin_only" | "self_service".</param>
    /// <param name="message">Arabic user-facing message.</param>
    public PolicyDeniedException(
        string featureKey,
        string policy,
        string message)
        : base(message, statusCode: 403, errorCode: "POLICY_ADMIN_ONLY")
    {
        FeatureKey    = featureKey;
        Policy        = policy;
        AdminRequired = policy == "admin_only";
    }
}
