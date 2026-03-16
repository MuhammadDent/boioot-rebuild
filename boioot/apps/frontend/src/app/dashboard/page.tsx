"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { dashboardSummaryApi } from "@/features/dashboard/summary/api";
import { authApi } from "@/features/auth/api";
import { ROLE_LABELS } from "@/features/admin/constants";
import { normalizeError } from "@/lib/api";
import type { DashboardSummary } from "@/types";

const SUMMARY_ROLES = ["Admin", "CompanyOwner", "Agent"] as const;
type SummaryRole = (typeof SUMMARY_ROLES)[number];
function canSeeSummary(role: string): role is SummaryRole {
  return (SUMMARY_ROLES as readonly string[]).includes(role);
}

export default function DashboardPage() {
  const { user, isLoading, logout } = useProtectedRoute();
  const { setUser } = useAuth();
  const router = useRouter();

  const [summary, setSummary]           = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);

  const [editOpen, setEditOpen]         = useState(false);
  const [editName, setEditName]         = useState("");
  const [editEmail, setEditEmail]       = useState("");
  const [editPhone, setEditPhone]       = useState("");
  const [editAvatar, setEditAvatar]     = useState<string | null>(null);
  const [editCurPwd, setEditCurPwd]     = useState("");
  const [editNewPwd, setEditNewPwd]     = useState("");
  const [editSaving, setEditSaving]     = useState(false);
  const [editError, setEditError]       = useState("");
  const [editSuccess, setEditSuccess]   = useState(false);

  const loadSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const data = await dashboardSummaryApi.getSummary();
      setSummary(data);
    } catch {
      /* silent */
    } finally {
      setSummaryLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (canSeeSummary(user.role)) loadSummary();
    else setSummaryLoading(false);
  }, [user, loadSummary]);

  useEffect(() => {
    if (user && editOpen) {
      setEditName(user.fullName);
      setEditEmail(user.email);
      setEditPhone(user.phone ?? "");
      setEditAvatar(user.profileImageUrl ?? null);
      setEditCurPwd("");
      setEditNewPwd("");
      setEditError("");
      setEditSuccess(false);
    }
  }, [editOpen, user]);

  if (isLoading || !user) return null;

  const isManagementRole = canSeeSummary(user.role);
  const isCompanyOrAdmin = user.role === "Admin" || user.role === "CompanyOwner";

  function handleLogout() {
    logout();
    router.push("/login");
  }

  async function handleEditSave(e: FormEvent) {
    e.preventDefault();
    setEditError("");
    setEditSuccess(false);
    setEditSaving(true);
    try {
      const updated = await authApi.updateProfile({
        fullName: editName,
        email: editEmail || undefined,
        phone: editPhone || undefined,
        profileImageUrl: editAvatar,
        newPassword: editNewPwd || undefined,
        currentPassword: editCurPwd || undefined,
      });
      setUser(updated);
      setEditSuccess(true);
      setTimeout(() => {
        setEditOpen(false);
        setEditSuccess(false);
      }, 1200);
    } catch (err) {
      setEditError(normalizeError(err));
    } finally {
      setEditSaving(false);
    }
  }

  const roleColor: Record<string, string> = {
    Admin:        "#dc2626",
    CompanyOwner: "#2563eb",
    Agent:        "#d97706",
    User:         "#6b7280",
  };
  const roleBg: Record<string, string> = {
    Admin:        "#fef2f2",
    CompanyOwner: "#eff6ff",
    Agent:        "#fffbeb",
    User:         "#f9fafb",
  };

  const initial = user.fullName.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0f4f0", direction: "rtl" }}>

      {/* ══ Top bar ══════════════════════════════════════════════════════════ */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {/* Row 1: Logo + logout */}
        <div style={{
          padding: "0.6rem 1.25rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}>
          <Link href="/">
            <Image src="/logo-boioot.png" alt="بيوت" width={115} height={44} style={{ objectFit: "contain" }} />
          </Link>
          <button
            onClick={handleLogout}
            style={{
              backgroundColor: "transparent",
              border: "1.5px solid #dc2626",
              color: "#dc2626",
              padding: "0.3rem 0.85rem",
              borderRadius: 8,
              cursor: "pointer",
              fontSize: "0.8rem",
              fontFamily: "inherit",
              fontWeight: 600,
            }}
          >
            تسجيل الخروج
          </button>
        </div>

        {/* Row 2: Site navigation */}
        <div style={{
          borderTop: "1px solid #f1f5f9",
          padding: "0 1rem",
          display: "flex",
          alignItems: "center",
          gap: "0",
          overflowX: "auto",
          scrollbarWidth: "none",
        }}>
          {[
            { href: "/",                   label: "الرئيسية" },
            { href: "/daily-rentals",      label: "الإيجار اليومي" },
            { href: "/projects",           label: "المشاريع" },
            { href: "/dashboard/requests", label: "الطلبات" },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              style={{
                textDecoration: "none",
                color: "#475569",
                fontSize: "0.82rem",
                fontWeight: 600,
                padding: "0.55rem 0.9rem",
                whiteSpace: "nowrap",
                borderBottom: "2px solid transparent",
                display: "inline-block",
                transition: "color 0.15s",
              }}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ══ Body ═════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

        {/* ── Profile card ─────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 16,
          padding: "1.75rem",
          marginBottom: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          position: "relative",
        }}>
          {/* Edit button */}
          {!editOpen && (
            <button
              onClick={() => setEditOpen(true)}
              title="تعديل الملف الشخصي"
              style={{
                position: "absolute",
                top: "1.25rem",
                left: "1.25rem",
                width: 36,
                height: 36,
                borderRadius: "50%",
                border: "1.5px solid #e2e8f0",
                backgroundColor: "#f8fafc",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "var(--color-text-secondary)",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </button>
          )}

          {!editOpen ? (
            /* ── View mode ── */
            <div style={{ display: "flex", alignItems: "flex-start", gap: "1.25rem" }}>
              {/* Avatar */}
              <div style={{
                width: 70, height: 70, borderRadius: "50%",
                backgroundColor: "var(--color-primary)",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: "#fff", fontSize: "1.8rem", fontWeight: 700, flexShrink: 0,
                boxShadow: "0 2px 8px rgba(0,128,60,0.25)",
                overflow: "hidden", position: "relative",
              }}>
                {user.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt="صورة الملف الشخصي"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : initial}
              </div>

              <div style={{ flex: 1 }}>
                <h2 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 700, color: "#1e293b" }}>
                  {user.fullName}
                </h2>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
                  <span style={{
                    backgroundColor: roleBg[user.role] ?? "#f9fafb",
                    color: roleColor[user.role] ?? "#6b7280",
                    padding: "0.2rem 0.75rem",
                    borderRadius: 20,
                    fontSize: "0.78rem",
                    fontWeight: 700,
                  }}>
                    {ROLE_LABELS[user.role] ?? user.role}
                  </span>
                  {user.userCode && (
                    <span style={{
                      backgroundColor: "#f1f5f9", color: "#475569",
                      padding: "0.2rem 0.7rem", borderRadius: 20,
                      fontSize: "0.76rem", fontWeight: 700,
                      fontFamily: "monospace", letterSpacing: "0.05em",
                      direction: "ltr",
                    }}>
                      #{user.userCode}
                    </span>
                  )}
                </div>

                <div style={{ marginTop: "1rem", display: "flex", flexDirection: "column", gap: "0.55rem" }}>
                  <ProfileRow
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>}
                    label={user.email}
                  />
                  {user.phone && (
                    <ProfileRow
                      icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.56 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.14 6.14l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>}
                      label={user.phone}
                      ltr
                    />
                  )}
                  <ProfileRow
                    icon={<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>}
                    label={`انضم ${new Date(user.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })}`}
                  />
                </div>
              </div>
            </div>
          ) : (
            /* ── Edit mode ── */
            <form onSubmit={handleEditSave}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
                <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>تعديل الملف الشخصي</h3>
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.2rem", padding: "0.25rem" }}
                >✕</button>
              </div>

              {editError && (
                <div style={{ backgroundColor: "#fef2f2", border: "1px solid #fecaca", borderRadius: 8, padding: "0.65rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#dc2626" }}>
                  {editError}
                </div>
              )}
              {editSuccess && (
                <div style={{ backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 8, padding: "0.65rem 1rem", marginBottom: "1rem", fontSize: "0.85rem", color: "#16a34a" }}>
                  تم حفظ التغييرات بنجاح ✓
                </div>
              )}

              <div style={{ display: "flex", flexDirection: "column", gap: "0.9rem" }}>

                {/* ── Avatar upload ── */}
                <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "0.25rem" }}>
                  <div style={{
                    width: 64, height: 64, borderRadius: "50%",
                    backgroundColor: "var(--color-primary)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    color: "#fff", fontSize: "1.5rem", fontWeight: 700,
                    overflow: "hidden", flexShrink: 0,
                    boxShadow: "0 2px 6px rgba(0,128,60,0.2)",
                  }}>
                    {editAvatar ? (
                      <img src={editAvatar} alt="preview" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : initial}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <label
                      htmlFor="avatar-upload"
                      style={{
                        cursor: "pointer",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--color-primary)",
                        padding: "0.35rem 0.85rem",
                        borderRadius: 8,
                        border: "1.5px solid var(--color-primary)",
                        backgroundColor: "#fff",
                        display: "inline-block",
                      }}
                    >
                      رفع صورة الملف الشخصي
                    </label>
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/jpeg,image/png,image/webp,image/gif"
                      style={{ display: "none" }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        if (file.size > 3 * 1024 * 1024) {
                          setEditError("حجم الصورة يجب أن لا يتجاوز 3 ميغابايت");
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const dataUrl = ev.target?.result as string;
                          const img = new window.Image();
                          img.onload = () => {
                            const canvas = document.createElement("canvas");
                            const maxSize = 300;
                            let w = img.width, h = img.height;
                            if (w > h) { h = Math.round((h / w) * maxSize); w = maxSize; }
                            else       { w = Math.round((w / h) * maxSize); h = maxSize; }
                            canvas.width = w; canvas.height = h;
                            canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
                            setEditAvatar(canvas.toDataURL("image/jpeg", 0.85));
                          };
                          img.src = dataUrl;
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                    {editAvatar && (
                      <button
                        type="button"
                        onClick={() => setEditAvatar(null)}
                        style={{
                          fontSize: "0.78rem", color: "#dc2626",
                          background: "none", border: "none", cursor: "pointer",
                          padding: "0", textAlign: "right", fontFamily: "inherit",
                        }}
                      >
                        حذف الصورة
                      </button>
                    )}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">الاسم الكامل *</label>
                  <input
                    className="form-input"
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    required
                    minLength={2}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">البريد الإلكتروني *</label>
                  <input
                    className="form-input"
                    type="email"
                    value={editEmail}
                    onChange={e => setEditEmail(e.target.value)}
                    required
                    dir="ltr"
                    placeholder="example@email.com"
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">رقم الهاتف</label>
                  <input
                    className="form-input"
                    value={editPhone}
                    onChange={e => setEditPhone(e.target.value)}
                    placeholder="اختياري"
                    dir="ltr"
                  />
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "0.9rem" }}>
                  <p style={{ margin: "0 0 0.75rem", fontSize: "0.8rem", fontWeight: 600, color: "#64748b" }}>
                    تغيير كلمة المرور (اختياري)
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                    <div className="form-group">
                      <label className="form-label">كلمة المرور الحالية</label>
                      <input
                        className="form-input"
                        type="password"
                        value={editCurPwd}
                        onChange={e => setEditCurPwd(e.target.value)}
                        placeholder="أدخل فقط إن أردت تغيير كلمة المرور"
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">كلمة المرور الجديدة</label>
                      <input
                        className="form-input"
                        type="password"
                        value={editNewPwd}
                        onChange={e => setEditNewPwd(e.target.value)}
                        placeholder="8 أحرف على الأقل"
                        minLength={editNewPwd ? 8 : undefined}
                      />
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "0.75rem", paddingTop: "0.25rem" }}>
                  <button
                    type="submit"
                    className="btn"
                    disabled={editSaving}
                    style={{ flex: 1 }}
                  >
                    {editSaving ? "جاري الحفظ…" : "حفظ التغييرات"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditOpen(false)}
                    style={{
                      padding: "0.6rem 1.2rem",
                      borderRadius: 8,
                      border: "1.5px solid #e2e8f0",
                      backgroundColor: "#fff",
                      cursor: "pointer",
                      fontSize: "0.9rem",
                      fontFamily: "inherit",
                      color: "#64748b",
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </form>
          )}
        </div>

        {/* ── Stats (management roles) ─────────────────────────────────────── */}
        {isManagementRole && (
          <div style={{ marginBottom: "1.25rem" }}>
            <SectionLabel>الإحصائيات</SectionLabel>
            {summaryLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                {[0, 1, 2, 3].map(i => (
                  <div key={i} style={{
                    backgroundColor: "#fff", borderRadius: 12, height: 88,
                    background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                  }} />
                ))}
              </div>
            ) : summary ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <StatCard href="/dashboard/properties" label="العقارات" value={summary.totalProperties}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>}
                />
                <StatCard
                  href={isCompanyOrAdmin ? "/dashboard/projects" : undefined}
                  label="المشاريع" value={summary.totalProjects}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></svg>}
                />
                <StatCard href="/dashboard/requests" label="الطلبات" value={summary.totalRequests}
                  badge={summary.newRequests > 0 ? { count: summary.newRequests, label: "جديد" } : undefined}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>}
                />
                <StatCard href="/dashboard/messages" label="المحادثات" value={summary.totalConversations}
                  badge={summary.unreadMessages > 0 ? { count: summary.unreadMessages, label: "غير مقروء" } : undefined}
                  icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/></svg>}
                />
              </div>
            ) : null}
          </div>
        )}

        {/* ── Admin Section ─────────────────────────────────────────────────── */}
        {user.role === "Admin" && (
          <div style={{ marginBottom: "1.25rem" }}>
            <SectionLabel>إدارة النظام</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              <NavCard href="/dashboard/admin/users" label="إدارة المستخدمين" description="عرض وتفعيل وتعطيل الحسابات"
                icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
              />
              <NavCard href="/dashboard/admin/companies" label="إدارة الشركات" description="عرض الشركات وإدارة التوثيق"
                icon={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><rect x="9" y="14" width="6" height="7"/></>}
              />
              <NavCard href="/dashboard/admin/properties" label="جميع العقارات" description="استعراض وإدارة كل عقارات النظام"
                icon={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
              />
              <NavCard href="/dashboard/admin/projects" label="جميع المشاريع" description="استعراض وإدارة كل المشاريع العقارية"
                icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>}
              />
              <NavCard href="/dashboard/admin/requests" label="جميع الطلبات" description="استعراض وإدارة طلبات العملاء"
                icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
              />
              <NavCard href="/dashboard/admin/listing-types" label="أنواع الإدراج" description="إدارة أنواع الإدراج في نماذج العقارات"
                icon={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>}
              />
            </div>
          </div>
        )}

        {/* ── Management section (CompanyOwner / Agent) ──────────────────────── */}
        {isManagementRole && user.role !== "Admin" && (
          <div style={{ marginBottom: "1.25rem" }}>
            <SectionLabel>إدارة الإعلانات</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {(user.role === "CompanyOwner" || user.role === "Admin") && (
                <QuickActionCard
                  href="/dashboard/properties/new"
                  label="إضافة عقار جديد"
                  description="نشر إعلان عقاري جديد على المنصة"
                  color="var(--color-primary)"
                  icon={<path d="M12 5v14M5 12h14"/>}
                  primary
                />
              )}
              <NavCard href="/dashboard/properties" label="إدارة العقارات" description="عرض وتعديل وحذف عقاراتك المنشورة"
                icon={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
              />
              {isCompanyOrAdmin && (
                <>
                  <QuickActionCard
                    href="/dashboard/projects/new"
                    label="إضافة مشروع عقاري جديد"
                    description="نشر مشروع عقاري جديد للشركة"
                    color="#2563eb"
                    icon={<path d="M12 5v14M5 12h14"/>}
                    primary={false}
                  />
                  <NavCard href="/dashboard/projects" label="إدارة المشاريع" description="عرض وتعديل وحذف مشاريعك العقارية"
                    icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>}
                  />
                </>
              )}
              <NavCard href="/dashboard/requests" label="الطلبات والاستفسارات" description="عرض وإدارة استفسارات العملاء"
                icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
              />
            </div>
          </div>
        )}

        {/* ── Messages (all roles) ───────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.25rem" }}>
          <SectionLabel>التواصل</SectionLabel>
          <NavCard
            href="/dashboard/messages"
            label="المحادثات والرسائل"
            description="تواصل مع المستخدمين الآخرين مباشرةً"
            icon={<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>}
          />
        </div>

      </div>
    </div>
  );
}

// ─── Section Label ─────────────────────────────────────────────────────────────
function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p style={{
      margin: "0 0 0.6rem",
      fontSize: "0.75rem",
      fontWeight: 700,
      color: "#94a3b8",
      textTransform: "uppercase",
      letterSpacing: "0.07em",
    }}>
      {children}
    </p>
  );
}

// ─── Profile Row ───────────────────────────────────────────────────────────────
function ProfileRow({ icon, label, ltr }: { icon: React.ReactNode; label: string; ltr?: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0.55rem", color: "#64748b" }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: "0.875rem", direction: ltr ? "ltr" : undefined }}>{label}</span>
    </div>
  );
}

// ─── Stat Card ─────────────────────────────────────────────────────────────────
function StatCard({
  href, label, value, badge, icon,
}: {
  href?: string;
  label: string;
  value: number;
  badge?: { count: number; label: string };
  icon: React.ReactNode;
}) {
  const inner = (
    <>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.35rem" }}>
        <span style={{ color: "var(--color-primary)", opacity: 0.85 }}>{icon}</span>
        {badge && (
          <span style={{ backgroundColor: "#fef3c7", color: "#92400e", fontSize: "0.65rem", fontWeight: 700, padding: "0.1rem 0.45rem", borderRadius: 20 }}>
            {badge.count} {badge.label}
          </span>
        )}
      </div>
      <p style={{ margin: 0, fontSize: "1.8rem", fontWeight: 800, color: "#1e293b", lineHeight: 1, direction: "ltr", textAlign: "right" }}>
        {value.toLocaleString("ar-SY")}
      </p>
      <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#64748b", fontWeight: 500 }}>
        {label}
      </p>
    </>
  );

  const style: React.CSSProperties = {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: "1rem 1.1rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
    textDecoration: "none",
    color: "inherit",
    display: "block",
    transition: "box-shadow 0.15s",
  };

  if (href) return <Link href={href} style={style}>{inner}</Link>;
  return <div style={style}>{inner}</div>;
}

// ─── Nav Card ──────────────────────────────────────────────────────────────────
function NavCard({
  href, label, description, icon,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        padding: "1rem 1.1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        textDecoration: "none",
        color: "inherit",
        boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
        transition: "box-shadow 0.15s",
      }}
    >
      <div style={{
        width: 42, height: 42, borderRadius: 10,
        backgroundColor: "var(--color-primary-light, #e8f5e9)",
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div style={{ flex: 1 }}>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{label}</p>
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>{description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, transform: "rotate(180deg)" }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ─── Quick Action Card ─────────────────────────────────────────────────────────
function QuickActionCard({
  href, label, description, color, icon, primary,
}: {
  href: string;
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  primary: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        backgroundColor: primary ? color : "#fff",
        border: primary ? "none" : `1.5px dashed ${color}`,
        borderRadius: 12,
        padding: "0.9rem 1.1rem",
        display: "flex",
        alignItems: "center",
        gap: "0.9rem",
        textDecoration: "none",
        color: primary ? "#fff" : color,
        boxShadow: primary ? "0 2px 8px rgba(0,128,60,0.2)" : "none",
      }}
    >
      <div style={{
        width: 36, height: 36, borderRadius: 8,
        backgroundColor: primary ? "rgba(255,255,255,0.2)" : `${color}18`,
        display: "flex", alignItems: "center", justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={primary ? "#fff" : color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700, fontSize: "0.9rem" }}>{label}</p>
        <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", opacity: primary ? 0.85 : 0.9 }}>{description}</p>
      </div>
    </Link>
  );
}

