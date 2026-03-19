"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { normalizeError } from "@/lib/api";
import {
  rbacApi,
  MODULE_LABELS,
  PERMISSION_LABEL,
  type RbacRole,
  type RbacPermission,
} from "@/features/admin/rbac/api";

// ── Design tokens ────────────────────────────────────────────────────────────

const S = {
  card: {
    backgroundColor: "#fff",
    border: "1px solid #e8ecf0",
    borderRadius: 12,
    padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  } as React.CSSProperties,

  badge: (color: string, bg: string): React.CSSProperties => ({
    display: "inline-flex",
    alignItems: "center",
    fontSize: "0.7rem",
    fontWeight: 700,
    padding: "0.18rem 0.6rem",
    borderRadius: 20,
    color,
    backgroundColor: bg,
    letterSpacing: "0.02em",
  }),

  btn: (color = "#16a34a", bg = "#f0fdf4", border = "#bbf7d0"): React.CSSProperties => ({
    padding: "0.5rem 1.25rem",
    fontSize: "0.83rem",
    fontWeight: 600,
    borderRadius: 8,
    border: `1px solid ${border}`,
    backgroundColor: bg,
    color,
    cursor: "pointer",
    fontFamily: "inherit",
    transition: "opacity 0.15s",
    whiteSpace: "nowrap" as const,
  }),

  counter: (active: boolean): React.CSSProperties => ({
    display: "inline-block",
    fontSize: "0.72rem",
    fontWeight: 700,
    padding: "0.15rem 0.55rem",
    borderRadius: 20,
    backgroundColor: active ? "#dcfce7" : "#f1f5f9",
    color: active ? "#15803d" : "#64748b",
  }),
};

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 24, zIndex: 9999,
      backgroundColor: type === "ok" ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${type === "ok" ? "#bbf7d0" : "#fecaca"}`,
      color: type === "ok" ? "#15803d" : "#dc2626",
      padding: "0.7rem 1.2rem",
      borderRadius: 10,
      fontSize: "0.83rem",
      fontWeight: 600,
      boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
      maxWidth: 320,
    }}>
      {msg}
    </div>
  );
}

// ── Role type helpers ─────────────────────────────────────────────────────────

const STAFF_ROLES = new Set([
  "AdminManager", "CustomerSupport", "TechnicalSupport",
  "ContentEditor", "SeoSpecialist", "MarketingStaff",
]);
const PLATFORM_ROLES = new Set([
  "CompanyOwner", "Broker", "Agent", "Owner", "User",
]);

function getRoleCategory(name: string): { label: string; color: string; bg: string } {
  if (name === "Admin") return { label: "مدير النظام", color: "#9333ea", bg: "#f5f3ff" };
  if (STAFF_ROLES.has(name))    return { label: "موظف داخلي", color: "#0369a1", bg: "#e0f2fe" };
  if (PLATFORM_ROLES.has(name)) return { label: "منصة", color: "#0f766e", bg: "#ccfbf1" };
  return { label: "مخصص", color: "#6b7280", bg: "#f3f4f6" };
}

// ── Module icon (simple colored circle) ───────────────────────────────────────

const MODULE_COLOR: Record<string, string> = {
  dashboard:  "#6366f1",
  properties: "#16a34a",
  projects:   "#0ea5e9",
  agents:     "#f59e0b",
  users:      "#8b5cf6",
  staff:      "#ec4899",
  roles:      "#9333ea",
  companies:  "#0284c7",
  requests:   "#ef4444",
  blog:       "#10b981",
  seo:        "#f97316",
  marketing:  "#14b8a6",
  settings:   "#6b7280",
  billing:    "#84cc16",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function RoleDetailPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "roles.view" });
  const params = useParams();
  const router = useRouter();
  const roleId = params?.roleId as string;

  const [role,      setRole]      = useState<RbacRole | null>(null);
  const [allPerms,  setAllPerms]  = useState<RbacPermission[]>([]);
  const [checked,   setChecked]   = useState<Set<string>>(new Set());
  const [original,  setOriginal]  = useState<Set<string>>(new Set());
  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [toast,     setToast]     = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [toastKey,  setToastKey]  = useState(0);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setToastKey(k => k + 1);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toastKey]);

  // Load role + permissions
  const load = useCallback(async () => {
    if (!roleId) return;
    setLoading(true);
    try {
      const [roles, allP, rolePerms] = await Promise.all([
        rbacApi.getRoles(),
        rbacApi.getPermissions(),
        rbacApi.getRolePermissions(roleId),
      ]);
      const found = roles.find(r => r.id === roleId) ?? null;
      setRole(found);
      setAllPerms(allP);
      const keys = new Set(rolePerms.permissions);
      setChecked(keys);
      setOriginal(new Set(keys));
    } catch (e) {
      showToast(normalizeError(e), "err");
    } finally {
      setLoading(false);
    }
  }, [roleId]);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  // Group permissions by module
  const grouped = allPerms.reduce<Record<string, RbacPermission[]>>((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});

  const toggle = (key: string) => {
    setChecked(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const toggleModule = (keys: string[]) => {
    const allOn = keys.every(k => checked.has(k));
    setChecked(prev => {
      const next = new Set(prev);
      allOn ? keys.forEach(k => next.delete(k)) : keys.forEach(k => next.add(k));
      return next;
    });
  };

  const handleSave = async () => {
    if (!roleId) return;
    setSaving(true);
    try {
      const result = await rbacApi.setRolePermissions(roleId, [...checked]);
      setOriginal(new Set(checked));
      if (role) setRole({ ...role, permissionCount: result.permissionCount });
      showToast(`تم حفظ ${result.permissionCount} صلاحية بنجاح`);
    } catch (e) {
      showToast(normalizeError(e), "err");
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChecked(new Set(original));
    showToast("تم إعادة التعيين إلى الحالة المحفوظة");
  };

  const isDirty = [...checked].some(k => !original.has(k)) || [...original].some(k => !checked.has(k));

  if (authLoading) return null;

  const category = role ? getRoleCategory(role.name) : null;

  return (
    <div style={{ padding: "1.75rem 1.5rem 6rem", direction: "rtl" }}>
      {toast && <Toast key={toastKey} msg={toast.msg} type={toast.type} />}

      {/* ── Back nav ── */}
      <button
        onClick={() => router.push("/dashboard/admin/roles")}
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          fontSize: "0.82rem", color: "#64748b", background: "none",
          border: "none", cursor: "pointer", padding: 0, marginBottom: "1.25rem",
          fontFamily: "inherit",
        }}
      >
        <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <polyline points="9 18 15 12 9 6" />
        </svg>
        الأدوار والصلاحيات
      </button>

      {/* ── Header card ── */}
      {loading ? (
        <div style={{ ...S.card, marginBottom: "1rem", minHeight: 100, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span style={{ color: "#94a3b8", fontSize: "0.85rem" }}>جاري التحميل…</span>
        </div>
      ) : role ? (
        <div style={{ ...S.card, marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>

            {/* Role icon */}
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              backgroundColor: category?.bg ?? "#f3f4f6",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke={category?.color ?? "#6b7280"} strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>

            {/* Role info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
                <h1 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#1e293b" }}>
                  {role.name}
                </h1>
                {category && (
                  <span style={S.badge(category.color, category.bg)}>{category.label}</span>
                )}
                {role.isSystem && (
                  <span style={S.badge("#6366f1", "#eef2ff")}>نظام</span>
                )}
              </div>
              <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  <strong style={{ color: "#374151" }}>{checked.size}</strong> صلاحية محددة
                  {isDirty && <span style={{ color: "#f59e0b", marginRight: "0.4rem" }}>(غير محفوظ)</span>}
                </span>
                <span style={{ fontSize: "0.8rem", color: "#64748b" }}>
                  <strong style={{ color: "#374151" }}>{role.userCount}</strong> مستخدم
                </span>
              </div>
            </div>

            {/* Stats badges */}
            <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
              <div style={{
                ...S.card,
                padding: "0.5rem 1rem",
                textAlign: "center",
                minWidth: 80,
                boxShadow: "none",
              }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#16a34a" }}>{checked.size}</div>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.1rem" }}>صلاحية</div>
              </div>
              <div style={{
                ...S.card,
                padding: "0.5rem 1rem",
                textAlign: "center",
                minWidth: 80,
                boxShadow: "none",
              }}>
                <div style={{ fontSize: "1.3rem", fontWeight: 800, color: "#0ea5e9" }}>{role.userCount}</div>
                <div style={{ fontSize: "0.65rem", color: "#94a3b8", marginTop: "0.1rem" }}>مستخدم</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div style={{ ...S.card, marginBottom: "1rem", textAlign: "center", color: "#94a3b8", padding: "3rem" }}>
          الدور غير موجود
        </div>
      )}

      {/* ── Permission Matrix ── */}
      {!loading && role && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>

          {/* Progress bar */}
          <div style={{ ...S.card, padding: "0.85rem 1.25rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.5rem" }}>
              <span style={{ fontSize: "0.78rem", fontWeight: 600, color: "#374151" }}>نسبة تغطية الصلاحيات</span>
              <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
                {checked.size} / {allPerms.length}
              </span>
            </div>
            <div style={{ height: 6, backgroundColor: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
              <div style={{
                height: "100%",
                width: `${allPerms.length > 0 ? (checked.size / allPerms.length) * 100 : 0}%`,
                backgroundColor: "#16a34a",
                borderRadius: 99,
                transition: "width 0.3s",
              }} />
            </div>
          </div>

          {/* Module sections */}
          {Object.entries(grouped).map(([module, perms]) => {
            const keys = perms.map(p => p.key);
            const activeCount = keys.filter(k => checked.has(k)).length;
            const allOn = activeCount === keys.length;
            const someOn = activeCount > 0 && !allOn;
            const label = MODULE_LABELS[module] ?? module;
            const color = MODULE_COLOR[module] ?? "#6b7280";

            return (
              <div key={module} style={S.card}>
                {/* Module header */}
                <div
                  onClick={() => toggleModule(keys)}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.75rem",
                    marginBottom: perms.length > 0 ? "1rem" : 0,
                    cursor: "pointer",
                    paddingBottom: "0.85rem",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  {/* Colored dot */}
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    backgroundColor: color, flexShrink: 0,
                  }} />

                  {/* Checkbox */}
                  <input
                    type="checkbox"
                    checked={allOn}
                    ref={el => { if (el) el.indeterminate = someOn; }}
                    onChange={() => toggleModule(keys)}
                    onClick={e => e.stopPropagation()}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#16a34a", flexShrink: 0 }}
                  />

                  <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b", flex: 1 }}>
                    {label}
                  </span>

                  <span style={S.counter(activeCount > 0)}>
                    {activeCount} / {keys.length}
                  </span>
                </div>

                {/* Permission rows */}
                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                  gap: "0.5rem",
                }}>
                  {perms.map(p => (
                    <label
                      key={p.key}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                        cursor: "pointer",
                        padding: "0.45rem 0.65rem",
                        borderRadius: 8,
                        backgroundColor: checked.has(p.key) ? "#f0fdf4" : "#fafafa",
                        border: `1px solid ${checked.has(p.key) ? "#bbf7d0" : "#f1f5f9"}`,
                        transition: "all 0.12s",
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked.has(p.key)}
                        onChange={() => toggle(p.key)}
                        style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#16a34a", flexShrink: 0 }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151", lineHeight: 1.3 }}>
                          {PERMISSION_LABEL[p.key] ?? p.key}
                        </div>
                        <div style={{ fontSize: "0.67rem", color: "#94a3b8", fontFamily: "monospace", marginTop: "0.1rem" }}>
                          {p.key}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Sticky save bar ── */}
      {!loading && role && (
        <div style={{
          position: "fixed",
          bottom: 0,
          right: 232,
          left: 0,
          backgroundColor: "#fff",
          borderTop: "1px solid #e8ecf0",
          padding: "0.85rem 1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          zIndex: 100,
          boxShadow: "0 -4px 16px rgba(0,0,0,0.06)",
        }}>
          <span style={{ fontSize: "0.82rem", color: "#64748b" }}>
            {isDirty
              ? <span style={{ color: "#f59e0b", fontWeight: 600 }}>⚠ يوجد تعديلات غير محفوظة</span>
              : <span style={{ color: "#16a34a", fontWeight: 600 }}>✓ محفوظ</span>
            }
          </span>
          <div style={{ display: "flex", gap: "0.65rem", alignItems: "center" }}>
            <button
              style={S.btn("#6b7280", "#f9fafb", "#e5e7eb")}
              onClick={handleReset}
              disabled={saving || !isDirty}
            >
              إعادة تعيين
            </button>
            <button
              style={{
                ...S.btn(),
                opacity: saving || !isDirty ? 0.6 : 1,
                padding: "0.55rem 1.75rem",
              }}
              onClick={handleSave}
              disabled={saving || !isDirty}
            >
              {saving ? "جاري الحفظ…" : "حفظ الصلاحيات"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
