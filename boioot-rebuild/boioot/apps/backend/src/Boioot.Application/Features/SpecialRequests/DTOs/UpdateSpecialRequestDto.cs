namespace Boioot.Application.Features.SpecialRequests.DTOs;

public class UpdateSpecialRequestDto
{
    public string?  Status           { get; set; }
    public Guid?    AssignedToUserId { get; set; }
    public string?  NotesInternal    { get; set; }
}
