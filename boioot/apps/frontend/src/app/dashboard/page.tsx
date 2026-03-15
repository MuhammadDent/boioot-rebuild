"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { dashboardSummaryApi } from "@/features/dashboard/summary/api";
import { normalizeError } from "@/lib/api";
import type { DashboardSummary } from "@/types";

// Roles that can access GET /api/dashboard/summary
const SUMMARY_ROLES = ["Admin", "CompanyOwner", "Agent"] as const;
type SummaryRole = (typeof SUMMARY_ROLES)[number];

function canSeeSummary(role: string): role is SummaryRole {
  return (SUMMARY_ROLES as readonly string[]).includes(role);
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user, isLoading, logout } = useProtectedRoute();
  const router = useRouter();

  const [summary, setSummary]               = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [summaryError, setSummaryError]     = useState("");

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    setSummaryError("");
    try {
      const data = await dashboardSummaryApi.getSummary();
      setSummary(data);
    } catch (e) {
      setSummaryError(normalizeError(e));
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (canSeeSummary(user.role)) {
      loadSummary();
    } else {
      setSummaryLoading(false);
    }
  }, [user, loadSummary]);

  if (isLoading || !user) return null;

  // Computed once — drives both SummarySection and management NavCards
  const isManagementRole = canSeeSummary(user.role);

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

        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "space-between", marginBottom: "2rem",
        }}>
          <Link href="/">
            <Image
              src="/logo-boioot.png" alt="بيوت"
              width={100} height={40} style={{ objectFit: "contain" }}
            />
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

        {/* ── Welcome Card ── */}
        <div className="form-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "1rem", marginBottom: "1.25rem",
          }}>
            <div style={{
              width: 56, height: 56, borderRadius: "50%",
              backgroundColor: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontSize: "1.5rem", fontWeight: 700, flexShrink: 0,
            }}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <div>
              <h1 style={{
                fontSize: "1.2rem", fontWeight: 700,
                margin: 0, color: "var(--color-text-primary)",
              }}>
                مرحباً، {user.fullName}
              </h1>
              <div style={{
                display: "flex", alignItems: "center",
                gap: "0.45rem", marginTop: "0.35rem", flexWrap: "wrap",
              }}>
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
            <InfoRow
              label="تاريخ الانضمام"
              value={new Date(user.createdAt).toLocaleDateString("ar-SY", {
                year: "numeric", month: "long", day: "numeric",
              })}
            />
          </div>
        </div>

        {/* ── Summary Cards (Admin / CompanyOwner / Agent only) ── */}
        {isManagementRole && (
          <SummarySection
            loading={summaryLoading}
            error={summaryError}
            summary={summary}
            onRetry={loadSummary}
          />
        )}

        {/* ── Navigation Cards ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>

          {/* Messages — all authenticated roles */}
          <NavCard
            href="/dashboard/messages"
            label="المحادثات والرسائل"
            description="تواصل مع المستخدمين الآخرين مباشرةً"
            icon={
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
            }
          />

          {/* Management cards — Admin / CompanyOwner / Agent only */}
          {isManagementRole && (
            <>
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
              <NavCard
                href="/dashboard/requests"
                label="الطلبات والاستفسارات"
                description="عرض وإدارة استفسارات العملاء وتحديث حالاتها"
                icon={
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                }
              />
            </>
          )}

        </div>

      </div>
    </div>
  );
}

// ─── Summary Section ──────────────────────────────────────────────────────────

function SummarySection({
  loading,
  error,
  summary,
  onRetry,
}: {
  loading: boolean;
  error: string;
  summary: DashboardSummary | null;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        marginBottom: "1.25rem",
      }}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="form-card"
            style={{
              minHeight: 88,
              background: "linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%)",
              backgroundSize: "200% 100%",
              animation: "shimmer 1.4s infinite",
            }}
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div style={{
        marginBottom: "1.25rem",
        background: "#fff8f8",
        border: "1px solid #fecaca",
        borderRadius: "10px",
        padding: "0.85rem 1rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "0.75rem",
      }}>
        <p style={{
          margin: 0, fontSize: "0.85rem",
          color: "var(--color-error, #c0392b)",
        }}>
          {error}
        </p>
        <button
          className="btn"
          style={{ fontSize: "0.8rem", padding: "0.3rem 0.9rem", flexShrink: 0 }}
          onClick={onRetry}
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  if (!summary) return null;

  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
      }}>
        <StatCard
          href="/dashboard/properties"
          label="العقارات"
          value={summary.totalProperties}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
              <polyline points="9 22 9 12 15 12 15 22" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/projects"
          label="المشاريع"
          value={summary.totalProjects}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="2" y="7" width="20" height="14" rx="2" />
              <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/requests"
          label="الطلبات"
          value={summary.totalRequests}
          badge={summary.newRequests > 0 ? { count: summary.newRequests, label: "جديد" } : undefined}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
          }
        />
        <StatCard
          href="/dashboard/messages"
          label="المحادثات"
          value={summary.totalConversations}
          badge={summary.unreadMessages > 0 ? { count: summary.unreadMessages, label: "غير مقروء" } : undefined}
          icon={
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
          }
        />
      </div>
    </div>
  );
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  href,
  label,
  value,
  badge,
  icon,
}: {
  href: string;
  label: string;
  value: number;
  badge?: { count: number; label: string };
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="form-card"
      style={{
        textDecoration: "none", color: "inherit",
        padding: "1rem 1.1rem",
        display: "flex", flexDirection: "column", gap: "0.35rem",
      }}
    >
      {/* Icon + badge row */}
      <div style={{
        display: "flex", alignItems: "center",
        justifyContent: "space-between",
      }}>
        <span style={{ color: "var(--color-primary)", opacity: 0.85 }}>
          {icon}
        </span>
        {badge && (
          <span style={{
            backgroundColor: "#fff3cd", color: "#856404",
            fontSize: "0.68rem", fontWeight: 700,
            padding: "0.1rem 0.5rem", borderRadius: 20,
          }}>
            {badge.count} {badge.label}
          </span>
        )}
      </div>

      {/* Count */}
      <p style={{
        margin: 0, fontSize: "1.75rem", fontWeight: 800,
        color: "var(--color-text-primary)", lineHeight: 1.1,
        direction: "ltr", textAlign: "right",
      }}>
        {value.toLocaleString("ar-SY")}
      </p>

      {/* Label */}
      <p style={{
        margin: 0, fontSize: "0.82rem",
        color: "var(--color-text-secondary)", fontWeight: 500,
      }}>
        {label}
      </p>
    </Link>
  );
}

// ─── Nav Card ─────────────────────────────────────────────────────────────────

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
        display: "flex", alignItems: "center", gap: "1rem",
        textDecoration: "none", color: "inherit",
        padding: "1.1rem 1.25rem",
      }}
    >
      <div style={{
        width: 44, height: 44, borderRadius: "10px",
        backgroundColor: "var(--color-primary)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        {icon}
      </div>
      <div>
        <p style={{
          margin: 0, fontWeight: 700, fontSize: "1rem",
          color: "var(--color-text-primary)",
        }}>
          {label}
        </p>
        <p style={{
          margin: "0.2rem 0 0", fontSize: "0.82rem",
          color: "var(--color-text-secondary)",
        }}>
          {description}
        </p>
      </div>
      <svg
        width="18" height="18" viewBox="0 0 24 24"
        fill="none" stroke="currentColor" strokeWidth="2"
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

// ─── Info Row ─────────────────────────────────────────────────────────────────

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0.6rem 0", borderBottom: "1px solid var(--color-border)",
    }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>
        {label}
      </span>
      <span style={{
        color: "var(--color-text-primary)", fontWeight: 500,
        fontSize: "0.92rem", direction: "ltr",
      }}>
        {value}
      </span>
    </div>
  );
}
