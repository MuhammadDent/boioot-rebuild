using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Requests.DTOs;

public class SubmitRequestRequest
{
    [Required(ErrorMessage = "الاسم مطلوب")]
    [MaxLength(200, ErrorMessage = "الاسم يجب أن لا يتجاوز 200 حرف")]
    public string Name { get; set; } = string.Empty;

    [Required(ErrorMessage = "رقم الهاتف مطلوب")]
    [MaxLength(50, ErrorMessage = "رقم الهاتف يجب أن لا يتجاوز 50 رقم")]
    public string Phone { get; set; } = string.Empty;

    [EmailAddress(ErrorMessage = "البريد الإلكتروني غير صالح")]
    [MaxLength(200, ErrorMessage = "البريد الإلكتروني يجب أن لا يتجاوز 200 حرف")]
    public string? Email { get; set; }

    [MaxLength(2000, ErrorMessage = "الرسالة يجب أن لا تتجاوز 2000 حرف")]
    public string? Message { get; set; }

    public Guid? PropertyId { get; set; }
    public Guid? ProjectId { get; set; }
}
