using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Messaging.DTOs;

public class SendMessageRequest : IValidatableObject
{
    [MaxLength(2000, ErrorMessage = "الرسالة يجب أن لا تتجاوز 2000 حرف")]
    public string Content { get; set; } = string.Empty;

    // Optional file attachment stored as base64 data URL
    public string? AttachmentData { get; set; }
    public string? AttachmentName { get; set; }

    public IEnumerable<ValidationResult> Validate(ValidationContext validationContext)
    {
        var hasContent    = !string.IsNullOrWhiteSpace(Content);
        var hasAttachment = !string.IsNullOrWhiteSpace(AttachmentData);

        if (!hasContent && !hasAttachment)
            yield return new ValidationResult(
                "يجب إرسال نص أو ملف مرفق على الأقل",
                [nameof(Content)]);
    }
}
