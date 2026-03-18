namespace Boioot.Application.Features.Subscriptions.DTOs;

/// <summary>
/// Result of evaluating a plan change request.
/// Payment is NOT processed here — this is intent-only.
/// </summary>
public sealed class UpgradeIntentResponse
{
    public string  CurrentPlanName { get; init; } = string.Empty;
    public string  TargetPlanName  { get; init; } = string.Empty;
    public string  BillingCycle    { get; init; } = "Monthly";
    public decimal PriceAmount     { get; init; }
    public string  CurrencyCode    { get; init; } = "SYP";

    /// <summary>Whether the intent can proceed (always true unless same plan/cycle).</summary>
    public bool    Allowed         { get; init; }

    /// <summary>
    /// Machine-readable reason:
    ///   upgrade | downgrade | cycle_change | new_subscription | already_subscribed
    /// </summary>
    public string  Reason          { get; init; } = string.Empty;

    /// <summary>Human-readable Arabic message shown in the confirmation modal.</summary>
    public string  Message         { get; init; } = string.Empty;
}
