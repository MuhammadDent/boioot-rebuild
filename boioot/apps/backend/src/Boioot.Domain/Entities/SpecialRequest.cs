namespace Boioot.Domain.Entities;

public class SpecialRequest : BaseEntity
{
    /// <summary>Human-readable code shown to admin, e.g. SR-20240001.</summary>
    public string PublicCode { get; set; } = string.Empty;

    // ── Submitter ─────────────────────────────────────────────────────────────
    public Guid?   CreatedByUserId { get; set; }
    public User?   CreatedByUser   { get; set; }

    public string  FullName     { get; set; } = string.Empty;
    public string  Phone        { get; set; } = string.Empty;
    public string? WhatsApp     { get; set; }
    public string? Email        { get; set; }

    /// <summary>Type of request: buy, sell, invest, legal, etc.</summary>
    public string? RequestType  { get; set; }

    /// <summary>The main free-text message — the core of the request.</summary>
    public string  Message   { get; set; } = string.Empty;

    /// <summary>JSON array of file URLs attached by the submitter.</summary>
    public string? Attachments { get; set; }

    // ── Workflow ──────────────────────────────────────────────────────────────
    public string  Status    { get; set; } = SpecialRequestStatus.New;

    /// <summary>Where the request came from: web, homepage, etc.</summary>
    public string? Source    { get; set; }

    public Guid?   AssignedToUserId { get; set; }
    public User?   AssignedToUser   { get; set; }

    public string? NotesInternal { get; set; }
    public DateTime? ClosedAt   { get; set; }
}

public static class SpecialRequestStatus
{
    public const string New       = "New";
    public const string Contacted = "Contacted";
    public const string Closed    = "Closed";
    public const string Archived  = "Archived";

    public static readonly string[] All = [New, Contacted, Closed, Archived];
}
