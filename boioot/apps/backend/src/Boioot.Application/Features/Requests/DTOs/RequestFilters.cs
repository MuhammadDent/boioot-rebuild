using Boioot.Domain.Enums;

namespace Boioot.Application.Features.Requests.DTOs;

public class RequestFilters
{
    public RequestStatus? Status { get; set; }
    public Guid? PropertyId { get; set; }
    public Guid? ProjectId { get; set; }
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 20;
}
