namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class PaymentRequestResponse
{
    public Guid   Id              { get; set; }
    public Guid   AccountId       { get; set; }
    public Guid   UserId          { get; set; }

    // ── User / account info (enriched by admin queries) ───────────────────
    public string? UserName       { get; set; }
    public string? UserEmail      { get; set; }
    /// <summary>Raw audience type: "broker" | "office" | "company" | "owner" | "seeker"</summary>
    public string? AccountType    { get; set; }
    /// <summary>Arabic label for the account type.</summary>
    public string? AccountTypeAr  { get; set; }

    // ── Plan ──────────────────────────────────────────────────────────────
    public Guid   PlanId              { get; set; }
    public string PlanName            { get; set; } = string.Empty;
    public string PlanCode            { get; set; } = string.Empty;
    public string? PlanDisplayNameAr  { get; set; }
    public Guid?  PricingId           { get; set; }
    public string BillingCycle        { get; set; } = string.Empty;

    // ── Payment ───────────────────────────────────────────────────────────
    public decimal Amount         { get; set; }
    public string  Currency       { get; set; } = string.Empty;
    public string  PaymentMethod  { get; set; } = string.Empty;
    public string  PaymentFlowType{ get; set; } = string.Empty;

    // ── Status ────────────────────────────────────────────────────────────
    public string  Status         { get; set; } = string.Empty;

    // ── Customer data ─────────────────────────────────────────────────────
    public string? ReceiptImageUrl          { get; set; }
    public string? ReceiptFileName          { get; set; }
    public string? CustomerNote             { get; set; }
    public string? SalesRepresentativeName  { get; set; }

    // ── Review ────────────────────────────────────────────────────────────
    public Guid?   ReviewedByUserId         { get; set; }
    public string? ReviewNote               { get; set; }
    public string? ExternalPaymentReference { get; set; }

    // ── Timestamps ────────────────────────────────────────────────────────
    public DateTime  CreatedAt   { get; set; }
    public DateTime? ReviewedAt  { get; set; }
    public DateTime? ActivatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // ── Action history (admin detail view) ───────────────────────────────
    public List<SubscriptionRequestActionResponse> Actions { get; set; } = [];
}
