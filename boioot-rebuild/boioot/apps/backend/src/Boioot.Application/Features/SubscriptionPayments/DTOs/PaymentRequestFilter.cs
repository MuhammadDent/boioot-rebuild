namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class PaymentRequestFilter
{
    public string?  Status          { get; set; }
    public string?  PaymentMethod   { get; set; }
    public string?  PaymentFlowType { get; set; }
    public Guid?    AccountId       { get; set; }
    public Guid?    PlanId          { get; set; }
    public DateTime? FromDate       { get; set; }
    public DateTime? ToDate         { get; set; }
}
