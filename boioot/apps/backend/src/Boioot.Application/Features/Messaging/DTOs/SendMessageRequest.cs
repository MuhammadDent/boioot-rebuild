using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Messaging.DTOs;

public class SendMessageRequest
{
    [Required(ErrorMessage = "محتوى الرسالة مطلوب")]
    [MinLength(1, ErrorMessage = "الرسالة لا يمكن أن تكون فارغة")]
    [MaxLength(2000, ErrorMessage = "الرسالة يجب أن لا تتجاوز 2000 حرف")]
    public string Content { get; set; } = string.Empty;
}
