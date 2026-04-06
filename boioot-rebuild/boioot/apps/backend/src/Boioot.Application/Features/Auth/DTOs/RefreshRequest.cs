using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Auth.DTOs;

public class RefreshRequest
{
    [Required(ErrorMessage = "رمز التحديث مطلوب")]
    public string RefreshToken { get; set; } = string.Empty;
}
