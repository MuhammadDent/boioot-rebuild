namespace Boioot.Application.Features.Billing.Settings;

/// <summary>
/// Stripe configuration bound from appsettings.json → "Stripe".
/// Set these via environment variables or secrets — never commit real keys.
/// </summary>
public sealed class StripeOptions
{
    public const string SectionName = "Stripe";

    /// <summary>Stripe secret key (sk_test_... or sk_live_...).</summary>
    public string SecretKey { get; set; } = string.Empty;

    /// <summary>Webhook signing secret (whsec_...) from the Stripe dashboard.</summary>
    public string WebhookSecret { get; set; } = string.Empty;

    /// <summary>URL Stripe redirects to after successful payment. Must be publicly reachable.</summary>
    public string SuccessUrl { get; set; } = "https://example.com/dashboard/billing?status=success";

    /// <summary>URL Stripe redirects to when the user cancels the checkout.</summary>
    public string CancelUrl { get; set; } = "https://example.com/pricing?status=cancelled";
}
