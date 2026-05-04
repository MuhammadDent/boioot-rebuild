"use client";

import Link from "next/link";

export default function SectionDisabled() {
  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "3rem 1.5rem",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "4rem", marginBottom: "1.5rem", lineHeight: 1 }}>🔒</div>

      <h1
        style={{
          fontSize: "1.75rem",
          fontWeight: 700,
          color: "#111827",
          marginBottom: "0.75rem",
        }}
      >
        هذا القسم غير متاح حالياً
      </h1>

      <p
        style={{
          color: "#6b7280",
          fontSize: "1rem",
          maxWidth: 400,
          lineHeight: 1.75,
          marginBottom: "2rem",
        }}
      >
        تم إيقاف هذا القسم مؤقتاً من قِبل إدارة الموقع. يمكنك العودة للصفحة
        الرئيسية أو تصفّح الأقسام الأخرى المتاحة.
      </p>

      <Link
        href="/"
        style={{
          padding: "0.65rem 1.75rem",
          background: "var(--color-primary, #16a34a)",
          color: "#fff",
          borderRadius: "8px",
          textDecoration: "none",
          fontWeight: 600,
          fontSize: "0.95rem",
        }}
      >
        العودة للرئيسية
      </Link>
    </div>
  );
}
