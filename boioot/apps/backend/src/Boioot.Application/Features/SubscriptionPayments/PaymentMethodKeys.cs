namespace Boioot.Application.Features.SubscriptionPayments;

/// <summary>
/// Canonical string keys for supported payment methods.
/// Stored as plain strings — easy to extend without a DB migration.
/// </summary>
public static class PaymentMethodKeys
{
    /// <summary>Future: auto-confirmed via payment gateway webhook (Stripe, etc.).</summary>
    public const string OnlineGateway  = "online_gateway";

    /// <summary>Customer transfers to company bank account and uploads receipt.</summary>
    public const string BankTransfer   = "bank_transfer";

    /// <summary>Customer pays cash to a sales representative in person.</summary>
    public const string CashToSalesRep = "cash_to_sales_rep";

    /// <summary>Customer uploads payment receipt (generic manual flow).</summary>
    public const string ReceiptUpload  = "receipt_upload";

    /// <summary>Any other manual/local method not covered above.</summary>
    public const string OtherManual    = "other_manual";

    // ── Routing helpers ───────────────────────────────────────────────────

    private static readonly HashSet<string> OnlineMethods = new(StringComparer.OrdinalIgnoreCase)
    {
        OnlineGateway,
    };

    /// <summary>Returns true when the method requires human review before activation.</summary>
    public static bool IsManual(string method) => !OnlineMethods.Contains(method);

    /// <summary>
    /// Returns "manual" | "online" | "hybrid" based on the selected payment method.
    /// Used to populate PaymentFlowType at request creation time.
    /// </summary>
    public static string GetFlowType(string method) =>
        OnlineMethods.Contains(method) ? PaymentFlowTypeKeys.Online : PaymentFlowTypeKeys.Manual;

    /// <summary>All recognised method keys (for input validation).</summary>
    public static readonly HashSet<string> All = new(StringComparer.OrdinalIgnoreCase)
    {
        OnlineGateway, BankTransfer, CashToSalesRep, ReceiptUpload, OtherManual,
    };
}
