namespace Boioot.Application.Features.SubscriptionPayments;

/// <summary>
/// String constants for PaymentFlowType column.
/// Extensible without migration — add a new constant and update routing logic.
/// </summary>
public static class PaymentFlowTypeKeys
{
    /// <summary>Requires human review before subscription activation.</summary>
    public const string Manual = "manual";

    /// <summary>Auto-confirmed by payment gateway (future).</summary>
    public const string Online = "online";

    /// <summary>Hybrid: partially automated, partially manual (future).</summary>
    public const string Hybrid = "hybrid";
}
