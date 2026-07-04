using System.Text.RegularExpressions;
using Boioot.Application.Exceptions;

namespace Boioot.Application.Common;

/// <summary>
/// حارس النصوص الآمنة — يرفض أي محتوى نصي من المستخدم يحتوي على حمولات
/// HTML / JavaScript / SVG / معالجات أحداث (XSS payloads) قبل حفظه.
/// النص العربي والرموز العادية مسموحة بالكامل؛ يُرفض فقط ما يشكّل وسم HTML
/// أو بروتوكول تنفيذ سكربت أو معالج حدث.
/// </summary>
public static partial class SafeTextGuard
{
    // وسم HTML/SVG/سكربت: < متبوعة بحرف أو / أو ! (تعليق أو DOCTYPE) أو ?
    private static readonly Regex HtmlTagPattern =
        new(@"<\s*[a-zA-Z!/?]", RegexOptions.Compiled);

    // بروتوكولات تنفيذ: javascript: / vbscript: / data:text/html (مع تجاهل الفراغات)
    private static readonly Regex DangerousProtocolPattern =
        new(@"(javascript|vbscript)\s*:|data\s*:\s*text\s*/\s*html",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

    // معالجات أحداث: onload= / onerror= / onclick= ... (غير مسبوقة بحرف أو رقم)
    private static readonly Regex EventHandlerPattern =
        new(@"(?<![a-zA-Z0-9])on[a-zA-Z]+\s*=",
            RegexOptions.Compiled | RegexOptions.IgnoreCase);

    /// <summary>هل يحتوي النص على حمولة خطرة؟</summary>
    public static bool ContainsDangerousContent(string? value)
    {
        if (string.IsNullOrEmpty(value)) return false;
        return HtmlTagPattern.IsMatch(value)
            || DangerousProtocolPattern.IsMatch(value)
            || EventHandlerPattern.IsMatch(value);
    }

    /// <summary>
    /// يرمي BoiootException (400، UNSAFE_INPUT) إذا احتوى النص على حمولة خطرة.
    /// </summary>
    public static void EnsureSafe(string? value, string fieldLabel)
    {
        if (ContainsDangerousContent(value))
            throw new BoiootException(
                $"حقل «{fieldLabel}» يحتوي على محتوى غير مسموح (وسوم HTML أو أكواد برمجية). يرجى إدخال نص عادي فقط.",
                400,
                "UNSAFE_INPUT");
    }
}
