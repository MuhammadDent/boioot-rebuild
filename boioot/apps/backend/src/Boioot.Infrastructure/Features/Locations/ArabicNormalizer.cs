using System.Text.RegularExpressions;

namespace Boioot.Infrastructure.Features.Locations;

/// <summary>
/// Reusable Arabic location name normalization utilities.
///
/// STRICT normalization  → used for DB storage (NormalizedName) and real duplicate checks.
/// SOFT  normalization   → used only for "Did you mean?" similarity suggestions.
/// </summary>
public static class ArabicNormalizer
{
    // ─── Private helpers ──────────────────────────────────────────────────────

    // Arabic diacritics (harakat + shadda + sukun + maddah + hamzas above/below)
    private static readonly Regex _diacritics = new(
        @"[\u064B-\u065F\u0610-\u061A\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED]",
        RegexOptions.Compiled);

    // Separators/punctuation → space
    private static readonly Regex _separators = new(
        @"[_/\\.,\(\)\[\]\{\}|\-]",
        RegexOptions.Compiled);

    // Collapse multiple whitespace
    private static readonly Regex _spaces = new(@"\s+", RegexOptions.Compiled);

    // Arabic-Indic digits ٠١٢٣٤٥٦٧٨٩ → 0-9
    private static readonly Regex _arabicDigits = new(@"[\u0660-\u0669]", RegexOptions.Compiled);

    // Leading "ال" (for soft normalization only)
    private static readonly Regex _leadingAl = new(@"^ال", RegexOptions.Compiled);

    // ─── Public API ───────────────────────────────────────────────────────────

    /// <summary>
    /// Strict normalization — generates the NormalizedName stored in the database.
    /// Ensures real duplicates are caught regardless of diacritics, spacing, or Alef variants.
    /// </summary>
    public static string Normalize(string? input)
    {
        if (string.IsNullOrWhiteSpace(input))
            return string.Empty;

        var s = input;

        // 1. Replace separators / punctuation with space
        s = _separators.Replace(s, " ");

        // 2. Remove Arabic diacritics
        s = _diacritics.Replace(s, "");

        // 3. Remove tatweel / kashida (ـ  U+0640)
        s = s.Replace("\u0640", "");

        // 4. Normalize Alef variants  أ إ آ  →  ا
        s = s.Replace('أ', 'ا').Replace('إ', 'ا').Replace('آ', 'ا');

        // 5. Normalize  ى  →  ي
        s = s.Replace('ى', 'ي');

        // 6. Convert Arabic-Indic digits  ٠-٩  →  0-9
        s = _arabicDigits.Replace(s, m => ((char)(m.Value[0] - '\u0660' + '0')).ToString());

        // 7. Lowercase English letters (keep Arabic letters unchanged)
        s = s.ToLowerInvariant();

        // 8. Collapse spaces + trim
        s = _spaces.Replace(s, " ").Trim();

        return s;
    }

    /// <summary>
    /// Soft normalization — used ONLY for "Did you mean?" suggestions.
    /// NOT stored in the database. NOT used for uniqueness checks.
    ///
    /// Starts from Normalize(), then removes leading "ال" for relaxed matching.
    /// </summary>
    public static string SoftNormalize(string? input)
    {
        var strict = Normalize(input);
        if (string.IsNullOrEmpty(strict))
            return strict;

        // Remove leading "ال" so "الهفوف" and "هفوف" suggest each other
        var soft = _leadingAl.Replace(strict, "").TrimStart();
        return string.IsNullOrEmpty(soft) ? strict : soft;
    }
}
