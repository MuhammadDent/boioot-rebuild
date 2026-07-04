using Boioot.Application.Exceptions;

namespace Boioot.Application.Common;

/// <summary>
/// سياسة كلمة المرور القوية — تُطبَّق مركزياً في كل مكان يتم فيه إنشاء أو تغيير كلمة مرور.
/// الحد الأدنى 12 حرفاً + حرف كبير + حرف صغير + رقم + رمز خاص،
/// مع رفض كلمات المرور الشائعة الضعيفة وكلمات المرور المحتوية على اسم البريد الإلكتروني.
/// </summary>
public static class PasswordPolicy
{
    public const int MinLength = 12;

    private static readonly string[] BlockedTerms =
    {
        "password", "123456", "12345678", "qwerty", "admin", "admin123", "boioot123", "boioot"
    };

    /// <summary>
    /// يتحقق من كلمة المرور ويرمي BoiootException (400، WEAK_PASSWORD) عند مخالفة السياسة.
    /// </summary>
    public static void EnsureValid(string? password, string? email = null)
    {
        var errors = Validate(password, email);
        if (errors.Count > 0)
            throw new BoiootException(string.Join("، ", errors), 400, "WEAK_PASSWORD");
    }

    /// <summary>
    /// يعيد قائمة برسائل الأخطاء (فارغة إذا كانت كلمة المرور مطابقة للسياسة).
    /// </summary>
    public static IReadOnlyList<string> Validate(string? password, string? email = null)
    {
        var errors = new List<string>();

        if (string.IsNullOrEmpty(password))
        {
            errors.Add("كلمة المرور مطلوبة");
            return errors;
        }

        if (password.Length < MinLength)
            errors.Add($"كلمة المرور يجب أن لا تقل عن {MinLength} أحرف");

        if (!password.Any(char.IsUpper))
            errors.Add("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)");

        if (!password.Any(char.IsLower))
            errors.Add("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)");

        if (!password.Any(char.IsDigit))
            errors.Add("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)");

        if (!password.Any(c => !char.IsLetterOrDigit(c)))
            errors.Add("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل ! @ # $ %)");

        var lower = password.ToLowerInvariant();

        if (BlockedTerms.Any(term => lower.Contains(term)))
            errors.Add("كلمة المرور تحتوي على كلمة شائعة يسهل تخمينها — يرجى اختيار كلمة مرور أخرى");

        if (!string.IsNullOrWhiteSpace(email))
        {
            var localPart = email.Split('@')[0].Trim().ToLowerInvariant();
            if (localPart.Length >= 3 && lower.Contains(localPart))
                errors.Add("كلمة المرور يجب أن لا تحتوي على اسم بريدك الإلكتروني");
        }

        return errors;
    }
}
