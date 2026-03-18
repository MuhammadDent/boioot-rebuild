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
    public string?  AdminNote    { get; init; }
    public DateTime  CreatedAt   { get; init; }
    public DateTime? ExpiresAt   { get; init; }
    public bool      IsExpired   { get; init; }

    public Guid?     ApprovedBy  { get; init; }
    public DateTime? ApprovedAt  { get; init; }
    public Guid?     RejectedBy  { get; init; }
    public DateTime? RejectedAt  { get; init; }

    public PaymentProofResponse? Proof { get; init; }
}

public sealed class PaymentProofResponse
{
    public Guid     Id        { get; init; }
    public string   ImageUrl  { get; init; } = string.Empty;
    public string?  Notes     { get; init; }
    public DateTime CreatedAt { get; init; }
}
