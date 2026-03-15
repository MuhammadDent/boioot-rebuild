import Link from "next/link";
import Image from "next/image";

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
      <Image
        src="/logo-boioot.png"
        alt="بيوت"
        width={160}
        height={64}
        style={{ objectFit: "contain" }}
        priority
      />

      <p style={{ color: "var(--color-text-muted)", fontSize: "1.1rem" }}>
        منصة العقارات السورية
      </p>

      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", justifyContent: "center" }}>
        <Link
          href="/properties"
          style={{
            padding: "0.75rem 2rem",
            background: "var(--color-primary)",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          تصفح العقارات
        </Link>
        <Link
          href="/daily-rentals"
          style={{
            padding: "0.75rem 2rem",
            background: "var(--color-primary)",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
            opacity: 0.9,
          }}
        >
          الإيجار اليومي
        </Link>
        <Link
          href="/projects"
          style={{
            padding: "0.75rem 2rem",
            background: "var(--color-primary)",
            color: "#fff",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
            opacity: 0.85,
          }}
        >
          تصفح المشاريع
        </Link>
        <Link
          href="/login"
          style={{
            padding: "0.75rem 2rem",
            border: "2px solid var(--color-primary)",
            color: "var(--color-primary)",
            borderRadius: "8px",
            fontWeight: 600,
            textDecoration: "none",
          }}
        >
          تسجيل الدخول
        </Link>
      </div>
    </main>
  );
}
