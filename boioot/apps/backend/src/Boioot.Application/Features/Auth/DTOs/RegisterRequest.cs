using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Auth.DTOs;

public class RegisterRequest
{
    [Required(ErrorMessage = "الاسم الكامل مطلوب")]
    [MinLength(2, ErrorMessage = "الاسم الكامل يجب أن لا يقل عن حرفين")]
    [MaxLength(150, ErrorMessage = "الاسم الكامل يجب أن لا يتجاوز 150 حرفاً")]
    public string FullName { get; set; } = string.Empty;

    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "البريد الإلكتروني غير صالح")]
    [MaxLength(200, ErrorMessage = "البريد الإلكتروني يجب أن لا يتجاوز 200 حرف")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    [MinLength(8, ErrorMessage = "كلمة المرور يجب أن لا تقل عن 8 أحرف")]
    [MaxLength(100, ErrorMessage = "كلمة المرور يجب أن لا تتجاوز 100 حرف")]
    public string Password { get; set; } = string.Empty;

    [Phone(ErrorMessage = "رقم الهاتف غير صالح")]
    [MaxLength(30, ErrorMessage = "رقم الهاتف يجب أن لا يتجاوز 30 رقماً")]
    public string? Phone { get; set; }

    /// <summary>
    /// نوع الحساب: User | Owner | Broker | CompanyOwner
    /// ملاحظة: Agent لا يُنشأ عبر التسجيل العام — يُنشئه المكتب أو الشركة فقط
    /// </summary>
    [Required(ErrorMessage = "يرجى تحديد نوع الحساب")]
    [RegularExpression("^(User|Owner|Broker|CompanyOwner)$",
        ErrorMessage = "نوع الحساب غير صالح")]
    public string Role { get; set; } = "User";

    /// <summary>
    /// اسم الشركة أو المكتب — مطلوب فقط للحسابات التجارية (CompanyOwner | Broker).
    /// إذا لم يُقدَّم، يُستخدم FullName تلقائياً.
    /// </summary>
    [MaxLength(200, ErrorMessage = "اسم الشركة يجب أن لا يتجاوز 200 حرف")]
    public string? CompanyName { get; set; }
}
