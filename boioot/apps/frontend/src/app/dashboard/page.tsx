"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";

export default function DashboardPage() {
  const { user, isLoading, logout } = useProtectedRoute();
  const router = useRouter();

  if (isLoading || !user) return null;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const roleLabel: Record<string, string> = {
    Admin: "مدير النظام",
    CompanyOwner: "مالك شركة",
    Agent: "وكيل عقاري",
    User: "مستخدم",
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 640, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "2rem" }}>
          <Link href="/">
            <Image src="/logo-boioot.png" alt="بيوت" width={100} height={40} style={{ objectFit: "contain" }} />
          </Link>
          <button
            onClick={handleLogout}
            className="btn"
            style={{
              backgroundColor: "transparent",
              border: "1.5px solid var(--color-error)",
              color: "var(--color-error)",
              padding: "0.45rem 1.2rem",
              borderRadius: "8px",
              cursor: "pointer",
              fontSize: "0.9rem",
              fontFamily: "inherit",
            }}
          >
            تسجيل الخروج
          </button>
        </div>

        {/* Welcome Card */}
        <div className="form-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.25rem" }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "1.5rem", fontWeight: 700, flexShrink: 0,
            }}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
                مرحباً، {user.fullName}
              </h1>
              <div style={{ display: "flex", alignItems: "center", gap: "0.45rem", marginTop: "0.35rem", flexWrap: "wrap" }}>
                <span style={{
                  backgroundColor: "var(--color-primary-light, #e8f5e9)",
                  color: "var(--color-primary)", padding: "0.15rem 0.65rem",
                  borderRadius: 20, fontSize: "0.78rem", fontWeight: 600,
                }}>
                  {roleLabel[user.role] ?? user.role}
                </span>
                {user.userCode && (
                  <span style={{
                    backgroundColor: "#f1f5f9", color: "#475569",
                    padding: "0.15rem 0.65rem", borderRadius: 20,
                    fontSize: "0.78rem", fontWeight: 700,
                    fontFamily: "monospace", letterSpacing: "0.05em",
                    direction: "ltr",
                  }}>
                    #{user.userCode}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <InfoRow label="البريد الإلكتروني" value={user.email} />
            {user.phone && <InfoRow label="رقم الهاتف" value={user.phone} />}
            <InfoRow label="تاريخ الانضمام" value={new Date(user.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })} />
          </div>
        </div>

        {/* Navigation cards */}
        {(user.role === "Admin" || user.role === "CompanyOwner" || user.role === "Agent") && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <NavCard
              href="/dashboard/properties"
              label="إدارة العقارات"
              description="عرض وإضافة وتعديل وحذف العقارات"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              }
            />
            <NavCard
              href="/dashboard/projects"
              label="إدارة المشاريع"
              description="عرض وإضافة وتعديل وحذف المشاريع العقارية"
              icon={
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              }
            />
          </div>
        )}

      </div>
    </div>
  );
}

function NavCard({
  href,
  label,
  description,
  icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="form-card"
      style={{
        display: "flex",
        alignItems: "center",
        gap: "1rem",
        textDecoration: "none",
        color: "inherit",
        padding: "1.1rem 1.25rem",
      }}
    >
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: "10px",
          backgroundColor: "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)" }}>
          {label}
        </p>
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
          {description}
        </p>
      </div>
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{
          marginRight: "auto",
          color: "var(--color-text-secondary)",
          transform: "rotate(180deg)",
        }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)",
    }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>{label}</span>
      <span style={{ color: "var(--color-text-primary)", fontWeight: 500, fontSize: "0.92rem", direction: "ltr" }}>{value}</span>
    </div>
  );
}
