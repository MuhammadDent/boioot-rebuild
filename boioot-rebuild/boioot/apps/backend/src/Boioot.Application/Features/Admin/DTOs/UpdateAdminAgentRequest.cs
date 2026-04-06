using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class UpdateAdminAgentRequest
{
    [Required(ErrorMessage = "الاسم الكامل مطلوب")]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Phone { get; set; }

    [MaxLength(1000)]
    public string? Bio { get; set; }

    public Guid? CompanyId { get; set; }
}
