using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.AgentManagement.DTOs;

public class CreateAgentRequest
{
    [Required(ErrorMessage = "الاسم الكامل مطلوب")]
    [MinLength(2)]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    [MinLength(8)]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [Phone]
    [MaxLength(30)]
    public string? Phone { get; set; }

    public string? Bio { get; set; }
}
