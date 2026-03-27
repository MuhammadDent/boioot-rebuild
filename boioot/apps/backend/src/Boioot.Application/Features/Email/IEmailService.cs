namespace Boioot.Application.Features.Email;

public class EmailMessage
{
    public string ToAddress  { get; set; } = string.Empty;
    public string ToName     { get; set; } = string.Empty;
    public string Subject    { get; set; } = string.Empty;
    public string HtmlBody   { get; set; } = string.Empty;
    public string PlainBody  { get; set; } = string.Empty;
}

public interface IEmailService
{
    /// <summary>
    /// Attempts to send an email. Returns true on success, false on failure.
    /// Implementations must never throw — failure must be captured in the return value.
    /// </summary>
    Task<(bool Success, string? Error)> TrySendAsync(EmailMessage message, CancellationToken ct = default);
}
