"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { useAuth } from "@/context/AuthContext";
import { dashboardSummaryApi } from "@/features/dashboard/summary/api";
import { authApi } from "@/features/auth/api";
import { favoritesApi } from "@/features/favorites/api";
import { messagingApi } from "@/features/dashboard/messages/api";
import { ROLE_LABELS } from "@/features/admin/constants";
import { normalizeError } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import { formatPrice, LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/features/properties/constants";
import type { DashboardSummary, DashboardAnalytics, FavoriteResponse } from "@/types";

const SUMMARY_ROLES = ["Admin", "CompanyOwner", "Broker", "Agent"] as const;
type SummaryRole = (typeof SUMMARY_ROLES)[number];
function canSeeSummary(role: string): role is SummaryRole {
  return (SUMMARY_ROLES as readonly string[]).includes(role);
}

export default function DashboardPage() {
  const { user, isLoading } = useProtectedRoute();
  const { setUser } = useAuth();

  const [summary, setSummary]             = useState<DashboardSummary | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [analytics, setAnalytics]         = useState<DashboardAnalytics | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

  const [favorites, setFavorites]       = useState<FavoriteResponse[]>([]);
  const [favLoading, setFavLoading]     = useState(true);

  const [unreadMessages, setUnreadMessages] = useState(0);

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

  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const data = await dashboardSummaryApi.getAnalytics();
      setAnalytics(data);
    } catch {
      /* silent */
    } finally {
      setAnalyticsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!user) return;
    if (canSeeSummary(user.role)) {
      loadSummary();
      loadAnalytics();
    } else {
      setSummaryLoading(false);
      setAnalyticsLoading(false);
    }
  }, [user, loadSummary, loadAnalytics]);

  useEffect(() => {
    if (!user) return;
    setFavLoading(true);
    favoritesApi.list()
      .then(setFavorites)
      .catch(() => setFavorites([]))
      .finally(() => setFavLoading(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    messagingApi.getUnreadCount()
      .then(d => setUnreadMessages(d.total))
      .catch(() => setUnreadMessages(0));
  }, [user]);

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
  // "projects.create" → CompanyOwner, Admin (PLATFORM_ROLE_PERMISSIONS)
  const isCompanyOrAdmin = hasPermission(user, "projects.create");
  // "agents.manage" → Broker, CompanyOwner, Admin (PLATFORM_ROLE_PERMISSIONS)
  const canManageAgents  = hasPermission(user, "agents.manage");

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
    Broker:       "#7c3aed",
    Agent:        "#d97706",
    Owner:        "#059669",
    User:         "#6b7280",
  };
  const roleBg: Record<string, string> = {
    Admin:        "#fef2f2",
    CompanyOwner: "#eff6ff",
    Broker:       "#f5f3ff",
    Agent:        "#fffbeb",
    Owner:        "#ecfdf5",
    User:         "#f9fafb",
  };

  const initial = user.fullName.charAt(0).toUpperCase();

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f0f4f0", direction: "rtl" }}>


      {/* ══ Body ═════════════════════════════════════════════════════════════ */}
      <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.5rem 1rem 3rem" }}>

        {/* ── Page Title ───────────────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{
            margin: 0,
            fontSize: "1.9rem",
            fontWeight: 900,
            letterSpacing: "-0.03em",
            color: "var(--color-primary)",
            lineHeight: 1.15,
            fontFamily: "system-ui, -apple-system, sans-serif",
          }}>
            لوحة التحكم
          </h1>
          <div style={{
            marginTop: "0.45rem",
            width: "3rem",
            height: "4px",
            borderRadius: 99,
            backgroundColor: "var(--color-primary)",
            opacity: 0.35,
          }} />
        </div>

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
                    label={`انضم ${new Date(user.createdAt).toLocaleDateString("en-GB", { year: "numeric", month: "numeric", day: "numeric" })}`}
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

        {/* ════════════════════════════════════════════════════════════
            مؤشرات الأداء الرئيسية KPIs  (management roles only)
            ════════════════════════════════════════════════════════════ */}
        {isManagementRole && (
          <div style={{ marginBottom: "1.75rem" }}>
            <SectionLabel>مؤشرات الأداء</SectionLabel>

            {analyticsLoading ? (
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                {[0,1,2,3,4,5].map(i => (
                  <div key={i} style={{
                    height: 78, borderRadius: 12,
                    background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                  }} />
                ))}
              </div>
            ) : analytics ? (
              <>
                {/* ── Row 1: Listings KPIs ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem", marginBottom: "0.65rem" }}>
                  <KpiCard
                    label="إجمالي الإعلانات"
                    value={analytics.totalListings}
                    color="#1e293b"
                    accent="#e2e8f0"
                    href="/dashboard/listings"
                    icon={<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>}
                  />
                  <KpiCard
                    label="الإعلانات النشطة"
                    value={analytics.activeListings}
                    color="#059669"
                    accent="#d1fae5"
                    href="/dashboard/listings"
                    icon={<><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></>}
                  />
                  <KpiCard
                    label="غير نشطة"
                    value={analytics.inactiveListings}
                    color="#d97706"
                    accent="#fef3c7"
                    icon={<><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></>}
                  />
                  <KpiCard
                    label="المشاهدات"
                    value={analytics.totalViews}
                    color="#2563eb"
                    accent="#dbeafe"
                    icon={<><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></>}
                  />
                </div>

                {/* ── Row 2: Business + Engagement KPIs ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "0.65rem", marginBottom: "0.65rem" }}>
                  <KpiCard
                    label="المشاريع"
                    value={analytics.totalProjects}
                    color="#7c3aed"
                    accent="#f5f3ff"
                    href={isCompanyOrAdmin ? "/dashboard/projects" : undefined}
                    icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>}
                    small
                  />
                  <KpiCard
                    label="الوكلاء"
                    value={analytics.totalAgents}
                    color="#0891b2"
                    accent="#cffafe"
                    href={canManageAgents ? "/dashboard/agents" : undefined}
                    icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/></>}
                    small
                  />
                  <KpiCard
                    label="الطلبات الجديدة"
                    value={analytics.newRequests}
                    color="#dc2626"
                    accent="#fee2e2"
                    href="/dashboard/requests"
                    icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
                    small
                    highlight={analytics.newRequests > 0}
                  />
                </div>

                {/* ── إجمالي الطلبات + المحادثات ── */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.65rem" }}>
                  <KpiCard
                    label="إجمالي الطلبات"
                    value={analytics.totalRequests}
                    color="#374151"
                    accent="#f3f4f6"
                    href="/dashboard/requests"
                    icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></>}
                  />
                  {summary && (
                    <KpiCard
                      label="المحادثات"
                      value={summary.totalConversations}
                      color="#374151"
                      accent="#f3f4f6"
                      href="/dashboard/messages"
                      badge={summary.unreadMessages > 0 ? `${summary.unreadMessages} غير مقروء` : undefined}
                      icon={<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>}
                    />
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            الرسوم البيانية — Charts
            ════════════════════════════════════════════════════════════ */}
        {isManagementRole && analytics && (
          <div style={{ marginBottom: "1.75rem" }}>
            <SectionLabel>تحليلات الأداء</SectionLabel>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>

              {/* Listings trend */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 12,
                padding: "1rem 1.1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
                  الإعلانات — آخر 6 أشهر
                </p>
                <MiniBarChart data={analytics.monthlyListings} color="var(--color-primary)" />
              </div>

              {/* Requests trend */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 12,
                padding: "1rem 1.1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}>
                <p style={{ margin: "0 0 0.75rem", fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
                  الطلبات — آخر 6 أشهر
                </p>
                <MiniBarChart data={analytics.monthlyRequests} color="#2563eb" />
              </div>

              {/* Listings by status */}
              <div style={{
                backgroundColor: "#fff", borderRadius: 12,
                padding: "1rem 1.1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                gridColumn: "1 / -1",
              }}>
                <p style={{ margin: "0 0 0.85rem", fontSize: "0.78rem", fontWeight: 700, color: "#64748b" }}>
                  توزيع الإعلانات حسب الحالة
                </p>
                <StatusDistribution
                  total={analytics.totalListings}
                  active={analytics.activeListings}
                  inactive={analytics.inactiveListings}
                  sold={analytics.soldListings}
                  rented={analytics.rentedListings}
                />
              </div>

            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            رؤى وتوصيات — Insights
            ════════════════════════════════════════════════════════════ */}
        {isManagementRole && analytics && (
          <>
            {/* Top listings */}
            {analytics.topListings.length > 0 && (
              <div style={{ marginBottom: "1.75rem" }}>
                <SectionLabel>الإعلانات الأكثر مشاهدةً</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {analytics.topListings.map((listing, idx) => (
                    <Link
                      key={listing.id}
                      href={`/dashboard/properties/${listing.id}/edit`}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        backgroundColor: "#fff", borderRadius: 10, padding: "0.75rem 1rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textDecoration: "none", color: "inherit",
                      }}
                    >
                      <span style={{
                        width: 24, height: 24, borderRadius: "50%", flexShrink: 0,
                        backgroundColor: idx === 0 ? "#fef3c7" : "#f1f5f9",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "0.7rem", fontWeight: 800,
                        color: idx === 0 ? "#92400e" : "#64748b",
                      }}>
                        {idx + 1}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {listing.title}
                        </p>
                        <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                          📍 {listing.city}
                        </p>
                      </div>
                      <div style={{ textAlign: "left", flexShrink: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                          {listing.views.toLocaleString("en")}
                        </p>
                        <p style={{ margin: 0, fontSize: "0.68rem", color: "#94a3b8" }}>مشاهدة</p>
                      </div>
                      {listing.requestCount > 0 && (
                        <span style={{
                          backgroundColor: "#d1fae5", color: "#065f46",
                          fontSize: "0.68rem", fontWeight: 700,
                          padding: "0.15rem 0.5rem", borderRadius: 20, flexShrink: 0,
                        }}>
                          {listing.requestCount} طلب
                        </span>
                      )}
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Attention listings */}
            {analytics.attentionListings.length > 0 && (
              <div style={{ marginBottom: "1.75rem" }}>
                <SectionLabel>تحتاج إلى اهتمام</SectionLabel>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                  {analytics.attentionListings.map(listing => (
                    <Link
                      key={listing.id}
                      href={`/dashboard/properties/${listing.id}/edit`}
                      style={{
                        display: "flex", alignItems: "center", gap: "0.75rem",
                        backgroundColor: "#fff", borderRadius: 10, padding: "0.75rem 1rem",
                        boxShadow: "0 1px 3px rgba(0,0,0,0.06)", textDecoration: "none", color: "inherit",
                        borderRight: "3px solid #f59e0b",
                      }}
                    >
                      <span style={{ fontSize: "1.1rem", flexShrink: 0 }}>⚠️</span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "0.85rem", fontWeight: 600, color: "#1e293b", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {listing.title}
                        </p>
                        <p style={{ margin: "0.1rem 0 0", fontSize: "0.75rem", color: "#d97706", fontWeight: 500 }}>
                          {listing.issue}
                        </p>
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Admin Section — visible to Admin role or users with roles.manage ── */}
        {(user.role === "Admin" || hasPermission(user, "roles.manage")) && (
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
              <NavCard href="/dashboard/admin/listing-types" label="أنواع الإدراج" description="إدارة أنواع الإدراج (بيع / إيجار / ...)"
                icon={<><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></>}
              />
              <NavCard href="/dashboard/admin/property-types" label="أنواع العقارات" description="إدارة أنواع العقارات (شقة / فيلا / مكتب / ...)"
                icon={<><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 3v18M3 9h18"/></>}
              />
              <NavCard href="/dashboard/admin/ownership-types" label="أنواع الملكية" description="إدارة أنواع الملكية (طابو أخضر / حكم محكمة / ...)"
                icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>}
              />
              <NavCard href="/dashboard/admin/billing/invoices" label="فواتير الدفع" description="مراجعة وتأكيد أو رفض طلبات الدفع اليدوي"
                icon={<><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></>}
              />
              <NavCard href="/dashboard/admin/plans" label="خطط الاشتراك" description="إدارة الخطط والحدود والميزات ديناميكياً"
                icon={<><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></>}
              />
              <NavCard href="/dashboard/admin/blog" label="إدارة المدونة" description="إنشاء وتحرير ونشر مقالات المدونة"
                icon={<><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></>}
              />
              <NavCard href="/dashboard/admin/blog/categories" label="تصنيفات المدونة" description="إنشاء وتعديل تصنيفات مقالات المدونة"
                icon={<><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></>}
              />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            القسم 1 — إدارة الإعلانات  (الإجراءات الأساسية — الأولوية القصوى)
            ════════════════════════════════════════════════════════════ */}
        {user.role !== "Admin" && !hasPermission(user, "roles.manage") && (
          <div style={{ marginBottom: "1.75rem" }}>
            <SectionLabel>إدارة الإعلانات</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {hasPermission(user, "properties.create") && (
                <QuickActionCard
                  href="/dashboard/properties/new"
                  label="إضافة إعلان جديد"
                  description="نشر إعلان عقاري جديد على المنصة"
                  color="var(--color-primary)"
                  icon={<path d="M12 5v14M5 12h14"/>}
                  primary
                />
              )}
              <NavCard
                href="/dashboard/listings"
                label="إعلاناتي"
                description="عرض جميع إعلاناتك العقارية وتعديلها وحذفها"
                icon={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></>}
              />
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            القسم 2 — إدارة الأعمال  (الشركات والوكلاء فقط)
            ════════════════════════════════════════════════════════════ */}
        {(isCompanyOrAdmin || canManageAgents) && user.role !== "Admin" && !hasPermission(user, "roles.manage") && (
          <div style={{ marginBottom: "1.75rem" }}>
            <SectionLabel>إدارة الأعمال</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
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
                  <NavCard
                    href="/dashboard/projects"
                    label="إدارة المشاريع"
                    description="عرض وتعديل وحذف مشاريعك العقارية"
                    icon={<><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/></>}
                  />
                </>
              )}
              {canManageAgents && (
                <NavCard
                  href="/dashboard/agents"
                  label="إدارة الوكلاء"
                  description="إنشاء وإدارة الوكلاء التابعين للمكتب أو الشركة"
                  icon={<><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></>}
                />
              )}
            </div>
          </div>
        )}

        {/* ════════════════════════════════════════════════════════════
            القسم 3 — التواصل والعملاء  (جميع الأدوار)
            ════════════════════════════════════════════════════════════ */}
        {user.role !== "Admin" && !hasPermission(user, "roles.manage") && (
          <div style={{ marginBottom: "1.75rem" }}>
            <SectionLabel>التواصل والعملاء</SectionLabel>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {isManagementRole && (
                <NavCard
                  href="/dashboard/requests"
                  label="الطلبات والاستفسارات"
                  description="عرض وإدارة استفسارات العملاء الواردة"
                  icon={<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>}
                />
              )}
              <NavCard
                href="/dashboard/my-requests"
                label="طلباتي"
                description="الطلبات والاستفسارات التي أرسلتها عن العقارات"
                icon={<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></>}
              />
              <NavCard
                href="/dashboard/messages"
                label="المحادثات والرسائل"
                description="تواصل مع المستخدمين الآخرين مباشرةً"
                badge={unreadMessages}
                icon={<path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"/>}
              />
            </div>
          </div>
        )}

        {/* ── Favorites (all roles) ──────────────────────────────────────────── */}
        <div style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.6rem" }}>
            <SectionLabel>المفضلة</SectionLabel>
            {favorites.length > 0 && (
              <span style={{ fontSize: "0.75rem", color: "#94a3b8", fontWeight: 600 }}>
                {favorites.length} عقار
              </span>
            )}
          </div>

          {favLoading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {[0, 1].map(i => (
                <div key={i} style={{
                  height: 80, borderRadius: 12,
                  background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                  backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                }} />
              ))}
            </div>
          ) : favorites.length === 0 ? (
            <div style={{
              backgroundColor: "#fff", borderRadius: 12, padding: "1.5rem",
              textAlign: "center", color: "#94a3b8",
              boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
            }}>
              <div style={{ fontSize: "2rem", marginBottom: "0.5rem" }}>🤍</div>
              <p style={{ margin: 0, fontSize: "0.85rem" }}>لا توجد عقارات في المفضلة بعد</p>
              <Link href="/" style={{ fontSize: "0.82rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600, display: "inline-block", marginTop: "0.6rem" }}>
                تصفح العقارات
              </Link>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {favorites.map(fav => (
                <div key={fav.favoriteId} style={{
                  backgroundColor: "#fff",
                  borderRadius: 12,
                  boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
                  overflow: "hidden",
                  display: "flex",
                  gap: "0",
                }}>
                  {/* Thumbnail */}
                  <Link href={`/properties/${fav.propertyId}`} style={{
                    width: 90, minHeight: 80, flexShrink: 0,
                    backgroundColor: "#f1f5f9", display: "block", textDecoration: "none",
                  }}>
                    {fav.thumbnailUrl ? (
                      <img src={fav.thumbnailUrl} alt={fav.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "1.5rem" }}>🏠</div>
                    )}
                  </Link>

                  {/* Info */}
                  <div style={{ flex: 1, padding: "0.7rem 0.85rem", minWidth: 0 }}>
                    <Link href={`/properties/${fav.propertyId}`} style={{ textDecoration: "none", color: "#1e293b" }}>
                      <p style={{ margin: "0 0 0.25rem", fontWeight: 700, fontSize: "0.88rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {fav.title}
                      </p>
                    </Link>
                    <p style={{ margin: "0 0 0.35rem", fontSize: "0.82rem", color: "var(--color-primary)", fontWeight: 700 }}>
                      {formatPrice(fav.price, fav.currency)}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "0.75rem", color: "#64748b" }}>📍 {fav.city}</span>
                      {fav.listingType && (
                        <span className="badge badge-green" style={{ fontSize: "0.7rem", padding: "0.1rem 0.5rem" }}>
                          {LISTING_TYPE_LABELS[fav.listingType] ?? fav.listingType}
                        </span>
                      )}
                      {fav.area > 0 && (
                        <span className="badge badge-blue" style={{ fontSize: "0.7rem", padding: "0.1rem 0.5rem" }}>
                          {fav.area} م²
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Remove button */}
                  <button
                    onClick={async () => {
                      await favoritesApi.toggle(fav.propertyId);
                      setFavorites(prev => prev.filter(f => f.favoriteId !== fav.favoriteId));
                    }}
                    title="إزالة من المفضلة"
                    style={{
                      background: "none", border: "none", cursor: "pointer",
                      padding: "0.75rem 0.85rem", color: "#ef4444",
                      display: "flex", alignItems: "center", flexShrink: 0,
                    }}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="#ef4444" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
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
        {value.toLocaleString("en")}
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
  href, label, description, icon, badge,
}: {
  href: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  badge?: number;
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
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>{label}</p>
          {badge && badge > 0 && (
            <span style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              minWidth: 20, height: 20, borderRadius: 10,
              backgroundColor: "#ef4444", color: "#fff",
              fontSize: "0.68rem", fontWeight: 700, padding: "0 5px",
            }}>
              {badge > 99 ? "99+" : badge}
            </span>
          )}
        </div>
        <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>{description}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, transform: "rotate(180deg)" }}>
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </Link>
  );
}

// ─── KPI Card ──────────────────────────────────────────────────────────────────
function KpiCard({
  href, label, value, badge, color, accent, icon, small, highlight,
}: {
  href?: string;
  label: string;
  value: number;
  badge?: string;
  color: string;
  accent: string;
  icon: React.ReactNode;
  small?: boolean;
  highlight?: boolean;
}) {
  const inner = (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 12,
      padding: small ? "0.8rem 0.9rem" : "1rem 1.1rem",
      boxShadow: highlight
        ? `0 0 0 2px ${color}40, 0 1px 3px rgba(0,0,0,0.06)`
        : "0 1px 3px rgba(0,0,0,0.06)",
      display: "flex",
      flexDirection: "column",
      gap: "0.25rem",
      textDecoration: "none",
      color: "inherit",
      transition: "box-shadow 0.15s",
      cursor: href ? "pointer" : "default",
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{
          width: small ? 30 : 34, height: small ? 30 : 34, borderRadius: 8,
          backgroundColor: accent,
          display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          <svg width={small ? 15 : 17} height={small ? 15 : 17} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {icon}
          </svg>
        </div>
        {badge && (
          <span style={{
            backgroundColor: "#fee2e2", color: "#dc2626",
            fontSize: "0.6rem", fontWeight: 700,
            padding: "0.1rem 0.45rem", borderRadius: 20,
          }}>
            {badge}
          </span>
        )}
      </div>
      <p style={{
        margin: "0.3rem 0 0",
        fontSize: small ? "1.45rem" : "1.75rem",
        fontWeight: 800,
        color: "#1e293b",
        lineHeight: 1,
        direction: "ltr",
        textAlign: "right",
      }}>
        {value.toLocaleString("en")}
      </p>
      <p style={{ margin: 0, fontSize: small ? "0.72rem" : "0.78rem", color: "#64748b", fontWeight: 500 }}>
        {label}
      </p>
    </div>
  );

  if (href) return <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  return inner;
}

// ─── Mini Bar Chart ────────────────────────────────────────────────────────────
function MiniBarChart({ data, color = "var(--color-primary)" }: {
  data: { label: string; count: number }[];
  color?: string;
}) {
  const max = Math.max(...data.map(d => d.count), 1);
  return (
    <div style={{ display: "flex", alignItems: "flex-end", gap: "0.3rem", height: 72 }}>
      {data.map((d, i) => (
        <div key={i} style={{
          flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "0.2rem",
        }}>
          <div style={{
            width: "100%",
            height: `${Math.max((d.count / max) * 52, d.count === 0 ? 0 : 3)}px`,
            backgroundColor: color,
            borderRadius: "3px 3px 0 0",
            opacity: d.count === 0 ? 0.2 : 1,
          }} />
          <span style={{ fontSize: "0.6rem", color: "#94a3b8", whiteSpace: "nowrap" }}>
            {d.label}
          </span>
        </div>
      ))}
    </div>
  );
}

// ─── Status Distribution ────────────────────────────────────────────────────────
function StatusDistribution({ total, active, inactive, sold, rented }: {
  total: number;
  active: number;
  inactive: number;
  sold: number;
  rented: number;
}) {
  if (total === 0) {
    return <p style={{ margin: 0, fontSize: "0.82rem", color: "#94a3b8" }}>لا توجد إعلانات بعد</p>;
  }
  const items = [
    { label: "نشط", value: active,   color: "#059669" },
    { label: "غير نشط", value: inactive, color: "#d97706" },
    { label: "مُباع", value: sold,    color: "#7c3aed" },
    { label: "مُؤجَّر", value: rented,  color: "#2563eb" },
  ].filter(i => i.value > 0);

  return (
    <div>
      {/* Bar */}
      <div style={{ display: "flex", borderRadius: 6, overflow: "hidden", height: 10, marginBottom: "0.65rem", backgroundColor: "#f1f5f9" }}>
        {items.map((item, i) => (
          <div key={i} style={{
            width: `${(item.value / total) * 100}%`,
            backgroundColor: item.color,
            transition: "width 0.4s ease",
          }} />
        ))}
      </div>
      {/* Legend */}
      <div style={{ display: "flex", gap: "0.9rem", flexWrap: "wrap" }}>
        {items.map((item, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
            <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.color, flexShrink: 0 }} />
            <span style={{ fontSize: "0.72rem", color: "#64748b" }}>
              {item.label}: <strong style={{ color: "#1e293b" }}>{item.value}</strong>
            </span>
          </div>
        ))}
      </div>
    </div>
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

