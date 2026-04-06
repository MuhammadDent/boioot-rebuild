using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SpecialRequests.DTOs;

public class UpdateSpecialRequestTypeDto
{
    [MaxLength(100)]
    public string? Label     { get; set; }

    [MaxLength(100)]
    public string? Value     { get; set; }

    public int?  SortOrder { get; set; }
    public bool? IsActive  { get; set; }
}
