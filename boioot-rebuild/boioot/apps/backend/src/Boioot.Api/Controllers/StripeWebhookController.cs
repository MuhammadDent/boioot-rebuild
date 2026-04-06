using Boioot.Application.Features.Billing.Interfaces;
using Boioot.Application.Features.Billing.Settings;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using Stripe;
using Stripe.Checkout;

namespace Boioot.Api.Controllers;

/// <summary>
/// Receives and validates incoming Stripe webhook events.
/// This endpoint is intentionally [AllowAnonymous] — Stripe cannot authenticate
/// with our JWT tokens. Security is provided by the Stripe-Signature header
/// which we validate using the webhook signing secret.
///
/// Route: POST /api/webhooks/stripe
/// </summary>
[Route("api/webhooks/stripe")]
[ApiController]
public class StripeWebhookController : ControllerBase
{
    private readonly IBillingService _billing;
    private readonly StripeOptions   _stripeOptions;
    private readonly ILogger<StripeWebhookController> _logger;

    public StripeWebhookController(
        IBillingService                billing,
        IOptions<StripeOptions>        stripeOptions,
        ILogger<StripeWebhookController> logger)
    {
        _billing       = billing;
        _stripeOptions = stripeOptions.Value;
        _logger        = logger;
    }

    /// <summary>
    /// Processes Stripe webhook events.
    ///
    /// Handles:
    ///   checkout.session.completed → marks invoice Paid, activates subscription.
    ///
    /// Returns 200 for all valid events (even if we don't handle the type)
    /// so Stripe does not retry unnecessarily.
    /// Returns 400 only when the signature is invalid.
    /// </summary>
    [HttpPost]
    public async Task<IActionResult> HandleWebhook(CancellationToken ct)
    {
        // Stripe requires us to read the raw body for signature validation.
        // Do not use model binding or [FromBody] here.
        string json;
        using (var reader = new StreamReader(HttpContext.Request.Body))
            json = await reader.ReadToEndAsync(ct);

        // ── Signature validation ───────────────────────────────────────────────
        if (string.IsNullOrWhiteSpace(_stripeOptions.WebhookSecret))
        {
            _logger.LogWarning("Stripe webhook received but WebhookSecret is not configured. Event ignored.");
            return Ok(new { received = true, warning = "webhook_secret_not_configured" });
        }

        Event stripeEvent;
        try
        {
            stripeEvent = EventUtility.ConstructEvent(
                json,
                Request.Headers["Stripe-Signature"],
                _stripeOptions.WebhookSecret,
                throwOnApiVersionMismatch: false);
        }
        catch (StripeException ex)
        {
            _logger.LogWarning(ex, "Stripe webhook signature validation failed");
            return BadRequest(new { error = "invalid_signature" });
        }

        _logger.LogInformation("Stripe webhook received: {EventType} ({EventId})",
            stripeEvent.Type, stripeEvent.Id);

        // ── Event handling ─────────────────────────────────────────────────────
        try
        {
            if (stripeEvent.Type == "checkout.session.completed")
            {
                var session = stripeEvent.Data.Object as Session;
                if (session is not null)
                {
                    _logger.LogInformation(
                        "Processing checkout.session.completed for session {SessionId}",
                        session.Id);

                    await _billing.StripeWebhookConfirmAsync(session.Id, ct);
                }
            }
            // Other event types can be added here as needed (e.g., payment_intent.payment_failed)
        }
        catch (Exception ex)
        {
            // Log but return 200 — prevents Stripe from retrying valid events
            // that failed due to transient issues (DB unavailable, etc.).
            // For idempotency failures (already processed), this is also safe.
            _logger.LogError(ex,
                "Error processing Stripe webhook event {EventType} ({EventId})",
                stripeEvent.Type, stripeEvent.Id);
        }

        return Ok(new { received = true });
    }
}
