"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { authApi } from "@/features/auth/api";
import { normalizeError } from "@/lib/api";
import { EyeIcon } from "@/components/ui/EyeIcon";
import Spinner from "@/components/ui/Spinner";
import { consumeRedirectTarget } from "@/lib/authRedirect";

export default function LoginPage() {
  const { login, isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      // Authenticated users visiting /login are redirected to their stored target
      // (e.g. a listing they were on) or fall back to /dashboard.
      const target = consumeRedirectTarget();
      router.replace(target ?? "/dashboard");
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setSubmitting(true);

    try {
      const res = await authApi.login({ email, password, rememberMe });
      login(res.token, res.user, res.expiresAt);
      // Return to the exact page the guest was on, or fall back intelligently.
      const target = consumeRedirectTarget();
      const isStaff = (res.user.permissions?.length ?? 0) > 0;
      router.push(target ?? (isStaff ? "/dashboard/admin" : "/dashboard"));
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  if (isLoading) return <Spinner />;

  return (
    <div className="login-page">
      <div className="form-card">
        <div className="login-page__logo">
          <Image
            src="/logo-boioot.png"
            alt="بيوت"
            width={120}
            height={48}
            style={{ objectFit: "contain" }}
            priority
          />
        </div>
        <h1 className="login-page__title">تسجيل الدخول</h1>

        {error && <div className="error-banner">{error}</div>}

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

          <div className="form-group">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <label
                className="form-label"
                htmlFor="password"
                style={{ margin: 0 }}
              >
                كلمة المرور
              </label>
              <Link
                href="/forgot-password"
                style={{
                  fontSize: "0.82rem",
                  color: "var(--color-primary)",
                  textDecoration: "none",
                }}
              >
                نسيت كلمة المرور؟
              </Link>
            </div>
            <div className="password-wrapper">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                className="form-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
              >
                <EyeIcon open={showPassword} />
              </button>
            </div>
          </div>

          <div
            className="form-group"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginTop: "-0.25rem",
            }}
          >
            <input
              id="rememberMe"
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{ width: "1rem", height: "1rem", cursor: "pointer" }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                fontSize: "0.88rem",
                color: "var(--color-text-secondary)",
                cursor: "pointer",
                userSelect: "none",
              }}
            >
              تذكّرني
            </label>
          </div>

          <button
            type="submit"
            className="btn btn-primary"
            disabled={submitting}
            style={{ width: "100%", marginTop: "0.5rem" }}
          >
            {submitting ? "جاري تسجيل الدخول..." : "تسجيل الدخول"}
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
          ليس لديك حساب؟{" "}
          <Link
            href="/register"
            style={{ color: "var(--color-primary)", fontWeight: 600 }}
          >
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}
