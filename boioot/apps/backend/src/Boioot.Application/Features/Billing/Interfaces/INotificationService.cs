namespace Boioot.Application.Features.Billing.Interfaces;

/// <summary>
/// Sends billing event notifications to users.
/// Current implementation: structured logging.
/// Future: email, push, SMS, etc.
/// </summary>
public interface INotificationService
{
    Task NotifyInvoiceCreated(Guid userId, Guid invoiceId, CancellationToken ct = default);
    Task NotifyInvoiceApproved(Guid userId, Guid invoiceId, CancellationToken ct = default);
    Task NotifyInvoiceRejected(Guid userId, Guid invoiceId, CancellationToken ct = default);
}
