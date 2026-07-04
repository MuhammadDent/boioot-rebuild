/**
 * سياسة كلمة المرور القوية — يجب أن تبقى مطابقة لسياسة الخادم
 * (Boioot.Application.Common.PasswordPolicy).
 * الخادم هو المصدر النهائي للتحقق؛ هذا الملف لعرض أخطاء فورية فقط.
 */

export const PASSWORD_MIN_LENGTH = 12;

export const PASSWORD_HINT = `${PASSWORD_MIN_LENGTH} أحرف على الأقل، حرف كبير وصغير ورقم ورمز خاص`;

const BLOCKED_TERMS = [
  "password", "123456", "12345678", "qwerty", "admin", "admin123", "boioot123", "boioot",
];

/** يعيد رسالة الخطأ الأولى، أو null إذا كانت كلمة المرور مطابقة للسياسة. */
export function validatePassword(password: string, email?: string): string | null {
  if (!password) return "كلمة المرور مطلوبة";
  if (password.length < PASSWORD_MIN_LENGTH)
    return `كلمة المرور يجب أن لا تقل عن ${PASSWORD_MIN_LENGTH} أحرف`;
  if (!/[A-Z]/.test(password))
    return "كلمة المرور يجب أن تحتوي على حرف كبير واحد على الأقل (A-Z)";
  if (!/[a-z]/.test(password))
    return "كلمة المرور يجب أن تحتوي على حرف صغير واحد على الأقل (a-z)";
  if (!/[0-9]/.test(password))
    return "كلمة المرور يجب أن تحتوي على رقم واحد على الأقل (0-9)";
  if (!/[^a-zA-Z0-9]/.test(password))
    return "كلمة المرور يجب أن تحتوي على رمز خاص واحد على الأقل (مثل ! @ # $ %)";

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
