"use client";

import { Component, type ReactNode, type ErrorInfo } from "react";
import Link from "next/link";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class PricingErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, errorMessage: "" };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message ?? "خطأ غير متوقع" };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("[PricingErrorBoundary] caught:", error, info.componentStack);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ maxWidth: 560, margin: "5rem auto", padding: "2rem 1.5rem", textAlign: "center" }}>
          <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 900, color: "var(--color-text-primary)", margin: "0 0 0.75rem" }}>
            تعذّر تحميل صفحة الأسعار
          </h1>
          <p style={{ color: "var(--color-text-secondary)", lineHeight: 1.7, marginBottom: "2rem" }}>
            حدث خطأ أثناء تحميل بيانات الباقات. يرجى المحاولة مرة أخرى أو التواصل معنا للاستفسار.
          </p>
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: "" })}
              style={{
                padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)",
                background: "var(--color-primary)", color: "#fff",
                border: "none", fontFamily: "inherit", fontWeight: 700,
                fontSize: "0.95rem", cursor: "pointer",
              }}
            >
              إعادة المحاولة
            </button>
            <Link
              href="/contact"
              style={{
                display: "inline-flex", alignItems: "center",
                padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)",
                border: "1px solid var(--color-border)", color: "var(--color-text-secondary)",
                fontWeight: 600, textDecoration: "none", fontSize: "0.95rem",
                background: "transparent",
              }}
            >
              تواصل معنا
            </Link>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
