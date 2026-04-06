namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class NotifyUserDto
{
    /// <summary>"approved" | "rejected" | "missing_info"</summary>
    public string Decision { get; set; } = string.Empty;

    /// <summary>Notification title (auto-suggested, admin can override).</summary>
    public string Title { get; set; } = string.Empty;

    /// <summary>Mandatory message body written by the admin.</summary>
    public string Message { get; set; } = string.Empty;

    /// <summary>Send an in-app notification to the user (default: true).</summary>
    public bool SendInternal { get; set; } = true;

    /// <summary>Optionally send an email to the user.</summary>
    public bool SendEmail { get; set; } = false;
}

public class NotifyUserResult
{
    public bool SentInternally { get; set; }
    public bool SentByEmail    { get; set; }
    public bool EmailFailed    { get; set; }
    public string? EmailError  { get; set; }

    /// <summary>Updated request after the action.</summary>
    public PaymentRequestResponse Request { get; set; } = null!;
}
