namespace Boioot.Domain.Enums;

/// <summary>
/// Lifecycle states for a SubscriptionPaymentRequest.
/// Stored as string in the database for readability and forward-compatibility.
/// </summary>
public enum PaymentRequestStatus
{
    /// <summary>Created — awaiting customer or system action.</summary>
    Pending,

    /// <summary>System is waiting for the customer to complete the payment (e.g. bank transfer).</summary>
    AwaitingPayment,

    /// <summary>Customer uploaded a receipt — awaiting admin review.</summary>
    ReceiptUploaded,

    /// <summary>Admin has opened and is actively reviewing the request.</summary>
    UnderReview,

    /// <summary>Admin confirmed payment — subscription is ready to activate.</summary>
    Approved,

    /// <summary>Admin rejected the request (invalid receipt, fraud check, etc.).</summary>
    Rejected,

    /// <summary>Subscription was successfully activated — terminal success state.</summary>
    Activated,

    /// <summary>Cancelled by the customer or an admin — terminal failure state.</summary>
    Cancelled,
}
