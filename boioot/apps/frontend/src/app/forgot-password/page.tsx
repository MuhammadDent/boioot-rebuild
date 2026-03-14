"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await new Promise((r) => setTimeout(r, 800));
    setSubmitted(true);
    setSubmitting(false);
  }

  return (
    <div className="login-page">
      <div className="form-card">
        <div className="login-page__logo">
          <Image src="/logo-boioot.png" alt="بيوت" width={120} height={48} style={{ objectFit: "contain" }} priority />
        </div>

        {submitted ? (
          <div style={{ textAlign: "center", padding: "0.5rem 0 1rem" }}>
            <div style={{
              width: 64, height: 64, borderRadius: "50%",
              backgroundColor: "var(--color-primary-light, #e8f5e9)",
              display: "flex", alignItems: "center", justifyContent: "center",
              margin: "0 auto 1.25rem",
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none"
                stroke="var(--color-primary)" strokeWidth="2.5"
                strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <h2 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.6rem", color: "var(--color-text-primary)" }}>
              تم إرسال الرابط
            </h2>
            <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "1.5rem" }}>
              إذا كان البريد الإلكتروني <strong style={{ color: "var(--color-text-primary)" }}>{email}</strong> مسجلاً لدينا،
              ستصل رسالة بها رابط إعادة تعيين كلمة المرور خلال دقائق.
            </p>
            <Link
              href="/login"
              style={{
                display: "inline-block",
                color: "var(--color-primary)", fontWeight: 600, fontSize: "0.9rem",
              }}
            >
              العودة لتسجيل الدخول
            </Link>
          </div>
        ) : (
          <>
            <h1 className="login-page__title">نسيت كلمة المرور؟</h1>
            <p style={{ textAlign: "center", fontSize: "0.88rem", color: "var(--color-text-secondary)", marginBottom: "1.5rem", lineHeight: 1.7 }}>
              أدخل بريدك الإلكتروني وسنرسل لك رابطاً لإعادة تعيين كلمة المرور.
            </p>

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label className="form-label" htmlFor="email">
                  البريد الإلكتروني
                </label>
                <input
                  id="email"
                  type="email"
                  className="form-input"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  placeholder="example@email.com"
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={submitting}
                style={{ width: "100%", marginTop: "0.5rem" }}
              >
                {submitting ? "جاري الإرسال..." : "إرسال رابط الاسترداد"}
              </button>
            </form>

            <p style={{ textAlign: "center", marginTop: "1.25rem", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
              <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 600 }}>
                العودة لتسجيل الدخول
              </Link>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
