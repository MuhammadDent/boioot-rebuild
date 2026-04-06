using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class VerifyCompanyRequest
{
    [Required]
    public bool? IsVerified { get; set; }
}
