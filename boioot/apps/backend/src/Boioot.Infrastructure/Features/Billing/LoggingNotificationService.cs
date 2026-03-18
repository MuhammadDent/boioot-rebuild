using Boioot.Application.Features.Billing.Interfaces;
using Microsoft.Extensions.Logging;

namespace Boioot.Infrastructure.Features.Billing;

/// <summary>
/// Notification service that logs billing events using structured logging.
/// Replace or extend with email/push/SMS providers when needed.
/// </summary>
public sealed class LoggingNotificationService : INotificationService
{
    private readonly ILogger<LoggingNotificationService> _logger;

    public LoggingNotificationService(ILogger<LoggingNotificationService> logger)
    {
        _logger = logger;
    }

    public Task NotifyInvoiceCreated(Guid userId, Guid invoiceId, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[Notification] Invoice created — UserId: {UserId}, InvoiceId: {InvoiceId}",
            userId, invoiceId);

        return Task.CompletedTask;
    }

    public Task NotifyInvoiceApproved(Guid userId, Guid invoiceId, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[Notification] Invoice approved — UserId: {UserId}, InvoiceId: {InvoiceId}",
            userId, invoiceId);

        return Task.CompletedTask;
    }

    public Task NotifyInvoiceRejected(Guid userId, Guid invoiceId, CancellationToken ct = default)
    {
        _logger.LogInformation(
            "[Notification] Invoice rejected — UserId: {UserId}, InvoiceId: {InvoiceId}",
            userId, invoiceId);

        return Task.CompletedTask;
    }
}
