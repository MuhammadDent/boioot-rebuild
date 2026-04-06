using System.ComponentModel.DataAnnotations;

namespace Boioot.Application.Features.Auth.DTOs;

public class LoginRequest
{
    [Required(ErrorMessage = "البريد الإلكتروني مطلوب")]
    [EmailAddress(ErrorMessage = "البريد الإلكتروني غير صالح")]
    public string Email { get; set; } = string.Empty;

    [Required(ErrorMessage = "كلمة المرور مطلوبة")]
    public string Password { get; set; } = string.Empty;

    /// <summary>
    /// When true the refresh token lifetime is 30 days; otherwise 1 day.
    /// </summary>
    public bool RememberMe { get; set; } = false;
}
