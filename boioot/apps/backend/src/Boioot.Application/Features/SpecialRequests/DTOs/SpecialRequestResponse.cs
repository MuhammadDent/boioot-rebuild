namespace Boioot.Application.Features.SpecialRequests.DTOs;

public class SpecialRequestResponse
{
    public Guid      Id            { get; set; }
    public string    PublicCode    { get; set; } = string.Empty;
    public string    FullName      { get; set; } = string.Empty;
    public string    Phone         { get; set; } = string.Empty;
    public string?   WhatsApp      { get; set; }
    public string?   Email         { get; set; }
    public string    Message       { get; set; } = string.Empty;
    public string    Status        { get; set; } = string.Empty;
    public string?   Source        { get; set; }
    public string?   NotesInternal { get; set; }
    public DateTime? ClosedAt      { get; set; }
    public DateTime  CreatedAt     { get; set; }
    public DateTime  UpdatedAt     { get; set; }

    public Guid?   AssignedToUserId   { get; set; }
    public string? AssignedToUserName { get; set; }
    public Guid?   CreatedByUserId    { get; set; }
    public string? CreatedByUserName  { get; set; }
}
