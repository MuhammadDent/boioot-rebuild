"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

export default function DashboardPage() {
  const { user, isAuthenticated, isLoading, logout } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isLoading, isAuthenticated, router]);

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
              <span style={{
                display: "inline-block", marginTop: "0.25rem",
                backgroundColor: "var(--color-primary-light, #e8f5e9)",
                color: "var(--color-primary)", padding: "0.15rem 0.65rem",
                borderRadius: 20, fontSize: "0.78rem", fontWeight: 600,
              }}>
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            <InfoRow label="البريد الإلكتروني" value={user.email} />
            {user.phone && <InfoRow label="رقم الهاتف" value={user.phone} />}
            <InfoRow label="تاريخ الانضمام" value={new Date(user.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })} />
          </div>
        </div>

        {/* Placeholder sections */}
        <div className="form-card" style={{ textAlign: "center", color: "var(--color-text-muted)", padding: "2.5rem 1rem" }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{ opacity: 0.4, marginBottom: "0.75rem" }}>
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <p style={{ margin: 0, fontSize: "0.95rem" }}>قريباً — لوحة التحكم الكاملة</p>
        </div>

      </div>
    </div>
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
