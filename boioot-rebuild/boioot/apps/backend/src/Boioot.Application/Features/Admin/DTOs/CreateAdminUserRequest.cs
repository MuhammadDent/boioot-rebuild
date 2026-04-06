using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Admin.DTOs;

public class CreateAdminUserRequest
{
    [Required(ErrorMessage = "الاسم الكامل مطلوب")]
    [MinLength(2, ErrorMessage = "الاسم الكامل يجب أن لا يقل عن حرفين")]
    [MaxLength(150)]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "البريد الإلكتروني غير صالح")]
    [MaxLength(200)]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    [MinLength(8, ErrorMessage = "كلمة المرور يجب أن لا تقل عن 8 أحرف")]
    [MaxLength(100)]
    public string Password { get; set; } = string.Empty;

    [MaxLength(30)]
    public string? Phone { get; set; }

    public string? Role { get; set; }
}
