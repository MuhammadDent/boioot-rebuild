using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.SpecialRequests.DTOs;

public class CreateSpecialRequestTypeDto
{
    [Required, MaxLength(100)]
    public string Label { get; set; } = string.Empty;

    [Required, MaxLength(100)]
    public string Value { get; set; } = string.Empty;

    public int  SortOrder { get; set; }
    public bool IsActive  { get; set; } = true;
}
