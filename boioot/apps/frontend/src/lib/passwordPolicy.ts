/**
 * سياسة كلمة المرور — يجب أن تبقى مطابقة لسياسة الخادم
 * (Boioot.Application.Common.PasswordPolicy).
 * الخادم هو المصدر النهائي للتحقق؛ هذا الملف لعرض أخطاء فورية فقط.
 *
 * مستويان:
 *   • standard (المستخدمون العاديون والوكلاء والوسطاء): 8 أحرف، حرف ورقم.
 *   • admin (حسابات المشرفين): 12 حرفاً، حرف كبير وصغير ورقم ورمز خاص.
 */

export type PasswordTier = "standard" | "admin";

export const STANDARD_MIN_LENGTH = 8;
export const ADMIN_MIN_LENGTH = 12;

export const PASSWORD_HINT = `${STANDARD_MIN_LENGTH} أحرف على الأقل، تتضمن حرفاً ورقماً`;
export const ADMIN_PASSWORD_HINT = `${ADMIN_MIN_LENGTH} حرفاً على الأقل، حرف كبير وصغير ورقم ورمز خاص`;

const BLOCKED_TERMS = [
  "password", "123456", "12345678", "qwerty", "admin", "admin123", "boioot123",
];

/** يعيد رسالة الخطأ الأولى، أو null إذا كانت كلمة المرور مطابقة للسياسة. */
export function validatePassword(
  password: string,
  email?: string,
  tier: PasswordTier = "standard",
): string | null {
  if (!password) return "كلمة المرور مطلوبة";

  const minLength = tier === "admin" ? ADMIN_MIN_LENGTH : STANDARD_MIN_LENGTH;
  if (password.length < minLength)
    return `كلمة المرور يجب أن لا تقل عن ${minLength} أحرف`;

  // متطلبات مشتركة: حرف واحد ورقم واحد على الأقل.
  if (!/[a-zA-Z]/.test(password))
    return "كلمة المرور يجب أن تحتوي على حرف واحد على الأقل";
  if (!/[0-9]/.test(password))
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)";

  // متطلبات إضافية لحسابات المشرفين فقط.
  if (tier === "admin") {
    if (!/[A-Z]/.test(password))
      return "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)";
    if (!/[a-z]/.test(password))
      return "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)";
    if (!/[^a-zA-Z0-9]/.test(password))
      return "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل ! @ # $ %)";
  }

  const lower = password.toLowerCase();
  if (BLOCKED_TERMS.some((t) => lower.includes(t)))
    return "كلمة المرور تحتوي على كلمة شائعة يسهل تخمينها — يرجى اختيار كلمة مرور أخرى";

  if (email) {
    const localPart = email.split("@")[0].trim().toLowerCase();
    if (localPart.length >= 3 && lower.includes(localPart))
      return "كلمة المرور يجب أن لا تحتوي على اسم بريدك الإلكتروني";
  }

  return null;
}
