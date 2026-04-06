namespace Boioot.Application.Features.Billing.DTOs;

public sealed class InvoiceResponse
{
    public Guid     Id           { get; init; }
    public Guid     UserId       { get; init; }
    public string   UserName     { get; init; } = string.Empty;
    public string   UserEmail    { get; init; } = string.Empty;
    public Guid     PlanPricingId { get; init; }
    public string   PlanName     { get; init; } = string.Empty;
    public string   BillingCycle { get; init; } = "Monthly";
    public decimal  Amount       { get; init; }
    public string   Currency     { get; init; } = "SYP";
    public string   Status       { get; init; } = "Pending";
    public string   ProviderName { get; init; } = "internal";
    public string?  ExternalRef  { get; init; }

    /// <summary>
    /// Stripe hosted checkout URL. Non-null only for Stripe invoices.
    /// The frontend must redirect the user to this URL to complete payment.
    /// </summary>
    public string?  SessionUrl   { get; init; }

    public string?  AdminNote    { get; init; }
    public DateTime  CreatedAt   { get; init; }
    public DateTime? ExpiresAt   { get; init; }
    public bool      IsExpired   { get; init; }

    public Guid?     ApprovedBy  { get; init; }
    public DateTime? ApprovedAt  { get; init; }
    public Guid?     RejectedBy  { get; init; }
    public DateTime? RejectedAt  { get; init; }

    /// <summary>
    /// Bank transfer details the user needs to complete payment.
    /// Populated for all internal (non-Stripe) invoices.
    /// </summary>
    public PaymentInstructionsDto? PaymentInstructions { get; init; }

    public PaymentProofResponse? Proof { get; init; }
}

/// <summary>Static bank details for completing the transfer.</summary>
public sealed class PaymentInstructionsDto
{
    public string BankName      { get; init; } = string.Empty;
    public string AccountName   { get; init; } = string.Empty;
    public string AccountNumber { get; init; } = string.Empty;
    public string Instructions  { get; init; } = string.Empty;
}

public sealed class PaymentProofResponse
{
    public Guid     Id        { get; init; }
    public string   ImageUrl  { get; init; } = string.Empty;
    public string?  Notes     { get; init; }
    public DateTime CreatedAt { get; init; }
}
