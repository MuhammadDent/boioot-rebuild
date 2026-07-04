using Boioot.Application.Exceptions;
using Boioot.Domain.Enums;

namespace Boioot.Application.Common;

/// <summary>
/// سياسة كلمة المرور — تُطبَّق مركزياً في كل مكان يتم فيه إنشاء أو تغيير كلمة مرور.
/// هناك مستويان:
///   • Standard (المستخدمون العاديون والوكلاء والوسطاء): 8 أحرف على الأقل، تتضمن حرفاً ورقماً.
///   • Admin (حسابات المشرفين): 12 حرفاً على الأقل، حرف كبير وصغير ورقم ورمز خاص.
/// كلا المستويين يرفضان كلمات المرور الشائعة الضعيفة وكلمات المرور المحتوية على اسم البريد الإلكتروني.
/// </summary>
public static class PasswordPolicy
{
    public const int StandardMinLength = 8;
    public const int AdminMinLength    = 12;

    private static readonly string[] BlockedTerms =
    {
        "password", "123456", "12345678", "qwerty", "admin", "admin123", "boioot123"
    };

    /// <summary>يحدد مستوى السياسة المطلوب بناءً على دور المستخدم.</summary>
    public static PasswordTier TierForRole(UserRole role) =>
        role == UserRole.Admin ? PasswordTier.Admin : PasswordTier.Standard;

    /// <summary>الحد الأدنى لطول كلمة المرور حسب المستوى.</summary>
    public static int MinLengthFor(PasswordTier tier) =>
        tier == PasswordTier.Admin ? AdminMinLength : StandardMinLength;

    /// <summary>
    /// يتحقق من كلمة المرور ويرمي BoiootException (400، WEAK_PASSWORD) عند مخالفة السياسة.
    /// </summary>
    public static void EnsureValid(string? password, PasswordTier tier, string? email = null)
    {
        var errors = Validate(password, tier, email);
        if (errors.Count > 0)
            throw new BoiootException(string.Join("، ", errors), 400, "WEAK_PASSWORD");
    }

    /// <summary>
    /// يعيد قائمة برسائل الأخطاء (فارغة إذا كانت كلمة المرور مطابقة للسياسة).
    /// </summary>
    public static IReadOnlyList<string> Validate(string? password, PasswordTier tier, string? email = null)
    {
        var errors = new List<string>();

        if (string.IsNullOrEmpty(password))
        {
            errors.Add("كلمة المرور مطلوبة");
            return errors;
        }

        var minLength = MinLengthFor(tier);
        if (password.Length < minLength)
            errors.Add($"كلمة المرور يجب أن لا تقل عن {minLength} أحرف");

        // متطلبات مشتركة لجميع المستويات: حرف واحد ورقم واحد على الأقل.
        if (!password.Any(char.IsLetter))
            errors.Add("كلمة المرور يجب أن تحتوي على حرف واحد على الأقل");

        if (!password.Any(char.IsDigit))
            errors.Add("كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)");

        // متطلبات إضافية لحسابات المشرفين فقط: حرف كبير وصغير ورمز خاص.
        if (tier == PasswordTier.Admin)
        {
            if (!password.Any(char.IsUpper))
                errors.Add("كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)");

            if (!password.Any(char.IsLower))
                errors.Add("كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)");

            if (!password.Any(c => !char.IsLetterOrDigit(c)))
                errors.Add("كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل ! @ # $ %)");
        }

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

/// <summary>مستوى صرامة سياسة كلمة المرور.</summary>
public enum PasswordTier
{
    /// <summary>المستخدمون العاديون والوكلاء والوسطاء.</summary>
    Standard,
    /// <summary>حسابات المشرفين.</summary>
    Admin,
}
