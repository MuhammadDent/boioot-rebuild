using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class UpdateUserStatusRequest
{
    [Required]
    public bool? IsActive { get; set; }
}
