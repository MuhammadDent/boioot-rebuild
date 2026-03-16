using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Auth.DTOs;

public class UpdateProfileRequest
{
    [Required(ErrorMessage = "الاسم الكامل مطلوب")]
    [MinLength(2, ErrorMessage = "الاسم الكامل يجب أن لا يقل عن حرفين")]
    [MaxLength(150, ErrorMessage = "الاسم الكامل يجب أن لا يتجاوز 150 حرفاً")]
    public string FullName { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "صيغة البريد الإلكتروني غير صحيحة")]
    [MaxLength(200, ErrorMessage = "البريد الإلكتروني يجب أن لا يتجاوز 200 حرف")]
    public string? Email { get; set; }

    [MaxLength(30, ErrorMessage = "رقم الهاتف يجب أن لا يتجاوز 30 حرفاً")]
    public string? Phone { get; set; }

    public string? ProfileImageUrl { get; set; }

    [MaxLength(100, ErrorMessage = "كلمة المرور الجديدة يجب أن لا تتجاوز 100 حرف")]
    [MinLength(8, ErrorMessage = "كلمة المرور الجديدة يجب أن لا تقل عن 8 أحرف")]
    public string? NewPassword { get; set; }

    public string? CurrentPassword { get; set; }
}
