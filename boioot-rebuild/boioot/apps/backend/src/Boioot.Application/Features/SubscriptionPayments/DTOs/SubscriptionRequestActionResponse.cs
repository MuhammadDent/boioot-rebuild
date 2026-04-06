namespace Boioot.Application.Features.SubscriptionPayments.DTOs;

public class SubscriptionRequestActionResponse
{
    public Guid      Id                { get; set; }
    public string    ActionType        { get; set; } = string.Empty;
    public string    Decision          { get; set; } = string.Empty;
    public string    Title             { get; set; } = string.Empty;
    public string    Note              { get; set; } = string.Empty;
    public bool      SentInternally    { get; set; }
    public bool      SentByEmail       { get; set; }
    public bool      EmailFailed       { get; set; }
    public Guid      PerformedByUserId { get; set; }
    public string?   PerformedByName   { get; set; }
    public DateTime  CreatedAt         { get; set; }
}
