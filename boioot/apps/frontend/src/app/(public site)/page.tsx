import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "1.5rem",
        padding: "2rem",
        fontFamily: "var(--font-arabic)",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2rem", fontWeight: 800, color: "var(--color-primary)" }}>
        بيوت
      </h1>
      <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
        منصة العقارات السورية
      </p>
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/login"
          style={{
            padding: "0.75rem 2rem",
            background: "var(--color-primary)",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          تسجيل الدخول
        </Link>
        <Link
          href="/register"
          style={{
            padding: "0.75rem 2rem",
            border: "2px solid var(--color-primary)",
            color: "var(--color-primary)",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          إنشاء حساب
        </Link>
      </div>
    </main>
  );
}
