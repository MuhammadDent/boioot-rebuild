using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Auth.DTOs;

public class ChangeEmailRequest
{
    [Required(ErrorMessage = "البريد الإلكتروني الجديد مطلوب")]
    [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صحيحة")]
    [MaxLength(200, ErrorMessage = "البريد الإلكتروني يجب أن لا يتجاوز 200 حرف")]
    public string NewEmail { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور الحالية مطلوبة للتحقق من هويتك")]
    public string CurrentPassword { get; set; } = string.Empty;
}
