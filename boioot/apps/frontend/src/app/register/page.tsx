"use client";

import { useState, useEffect, type FormEvent, type ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { useAuth } from "@/context/AuthContext";
import { authService } from "@/services/auth.service";
import { ApiError } from "@/lib/api";
import type { E164Number } from "libphonenumber-js/core";

interface FormState {
  username: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const INITIAL_FORM: FormState = {
  username: "",
  email: "",
  password: "",
  confirmPassword: "",
};

export default function RegisterPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [form, setForm] = useState<FormState>(INITIAL_FORM);
  const [phone, setPhone] = useState<E164Number | undefined>(undefined);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Partial<FormState>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace("/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFieldErrors((prev) => ({ ...prev, [name]: undefined }));
  }

  function validate(): boolean {
    const errors: Partial<FormState> = {};

    if (form.username.trim().length < 3) {
      errors.username = "اسم المستخدم يجب أن لا يقل عن 3 أحرف";
    } else if (!/^[\w\u0600-\u06FF.-]+$/.test(form.username.trim())) {
      errors.username = "اسم المستخدم يحتوي على أحرف غير مسموح بها";
    }
    if (!form.email.includes("@")) {
      errors.email = "البريد الإلكتروني غير صالح";
    }
    if (form.password.length < 8) {
      errors.password = "كلمة المرور يجب أن لا تقل عن 8 أحرف";
    }
    if (form.password !== form.confirmPassword) {
      errors.confirmPassword = "كلمتا المرور غير متطابقتين";
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!validate()) return;

    setSubmitting(true);
    try {
      const res = await authService.register({
        fullName: form.username.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: phone || undefined,
      });
      login(res.token, res.user);
      router.push("/dashboard");
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("تعذر الاتصال بالخادم. تأكد من اتصالك بالإنترنت.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return null;

  return (
    <div className="login-page">
      <div className="form-card">
        <div className="login-page__logo">
          <Image src="/logo-boioot.png" alt="بيوت" width={120} height={48} style={{ objectFit: "contain" }} priority />
        </div>
        <h1 className="login-page__title">إنشاء حساب جديد</h1>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label className="form-label" htmlFor="username">
              اسم المستخدم <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="username"
              name="username"
              type="text"
              className="form-input"
              value={form.username}
              onChange={handleChange}
              required
              autoComplete="username"
              placeholder="مثال: ahmad_1990"
              dir="ltr"
            />
            {fieldErrors.username && (
              <span className="form-error">{fieldErrors.username}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="email">
              البريد الإلكتروني <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              className="form-input"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              placeholder="example@email.com"
            />
            {fieldErrors.email && (
              <span className="form-error">{fieldErrors.email}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              رقم الهاتف{" "}
              <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>(اختياري)</span>
            </label>
            <PhoneInput
              id="phone"
              international
              defaultCountry="SY"
              value={phone}
              onChange={setPhone}
              className="phone-input-wrapper"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">
              كلمة المرور <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="password"
              name="password"
              type="password"
              className="form-input"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="new-password"
              placeholder="8 أحرف على الأقل"
            />
            {fieldErrors.password && (
              <span className="form-error">{fieldErrors.password}</span>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="confirmPassword">
              تأكيد كلمة المرور <span style={{ color: "var(--color-error)" }}>*</span>
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              className="form-input"
              value={form.confirmPassword}
              onChange={handleChange}
              required
              autoComplete="new-password"
              placeholder="أعد كتابة كلمة المرور"
            />
            {fieldErrors.confirmPassword && (
              <span className="form-error">{fieldErrors.confirmPassword}</span>
            )}
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {submitting ? "جاري إنشاء الحساب..." : "إنشاء الحساب"}
          </button>
        </form>

        <p
          style={{
            textAlign: "center",
            marginTop: "1.25rem",
            fontSize: "0.88rem",
            color: "var(--color-text-secondary)",
          }}
        >
          لديك حساب بالفعل؟{" "}
          <Link
            href="/login"
            style={{ color: "var(--color-primary)", fontWeight: 600 }}
          >
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
