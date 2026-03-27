using Boioot.Application.Features.Email;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using System.Net;
using System.Net.Mail;

namespace Boioot.Infrastructure.Features.Email;

/// <summary>
/// Email service that sends via SMTP when configured, otherwise logs only.
/// Never throws — failures are returned as (false, errorMessage).
/// </summary>
public sealed class LoggingEmailService : IEmailService
{
    private readonly ILogger<LoggingEmailService> _logger;
    private readonly string? _smtpHost;
    private readonly int     _smtpPort;
    private readonly string? _smtpUser;
    private readonly string? _smtpPass;
    private readonly string? _fromAddress;
    private readonly string? _fromName;
    private readonly bool    _useSsl;

    public LoggingEmailService(IConfiguration config, ILogger<LoggingEmailService> logger)
    {
        _logger      = logger;
        _smtpHost    = config["Email:SmtpHost"];
        _smtpPort    = int.TryParse(config["Email:SmtpPort"], out var p) ? p : 587;
        _smtpUser    = config["Email:SmtpUser"];
        _smtpPass    = config["Email:SmtpPassword"];
        _fromAddress = config["Email:FromAddress"];
        _fromName    = config["Email:FromName"] ?? "Boioot";
        _useSsl      = config["Email:UseSsl"]?.Equals("true", StringComparison.OrdinalIgnoreCase) ?? true;
    }

    public async Task<(bool Success, string? Error)> TrySendAsync(
        EmailMessage message, CancellationToken ct = default)
    {
        // If SMTP is not configured, log and return gracefully.
        if (string.IsNullOrWhiteSpace(_smtpHost) || string.IsNullOrWhiteSpace(_fromAddress))
        {
            _logger.LogInformation(
                "[EMAIL-NOOP] To={To} Subject={Subject} — SMTP not configured, email not sent.",
                message.ToAddress, message.Subject);
            return (false, "خدمة البريد الإلكتروني غير مُعدَّة على الخادم.");
        }

        try
        {
            using var client = new SmtpClient(_smtpHost, _smtpPort)
            {
                Credentials     = new NetworkCredential(_smtpUser, _smtpPass),
                EnableSsl       = _useSsl,
                DeliveryMethod  = SmtpDeliveryMethod.Network,
                Timeout         = 15_000,
            };

            using var mail = new MailMessage
            {
                From       = new MailAddress(_fromAddress!, _fromName),
                Subject    = message.Subject,
                Body       = message.HtmlBody,
                IsBodyHtml = true,
            };
            mail.To.Add(new MailAddress(message.ToAddress, message.ToName));

            if (!string.IsNullOrWhiteSpace(message.PlainBody))
                mail.AlternateViews.Add(
                    AlternateView.CreateAlternateViewFromString(message.PlainBody, null, "text/plain"));

            await client.SendMailAsync(mail, ct);

            _logger.LogInformation(
                "[EMAIL-SENT] To={To} Subject={Subject}", message.ToAddress, message.Subject);
            return (true, null);
        }
        catch (Exception ex)
        {
            _logger.LogError(ex,
                "[EMAIL-FAILED] To={To} Subject={Subject}: {Error}",
                message.ToAddress, message.Subject, ex.Message);
            return (false, ex.Message);
        }
    }
}
