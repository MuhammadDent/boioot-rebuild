using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class UpdateAdminBrokerRequest
{
    [Required] public string FullName { get; set; } = string.Empty;
    public string? Phone { get; set; }
    public string? ProfileImageUrl { get; set; }
}
