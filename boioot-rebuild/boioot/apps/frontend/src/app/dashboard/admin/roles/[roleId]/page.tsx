"use client";

import { useState, useEffect, useCallback, useRef, type ReactNode } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { normalizeError } from "@/lib/api";
import {
  rbacApi,
  MODULE_LABELS,
  PERMISSION_LABEL,
  PERMISSION_DESC,
  type RbacRole,
  type RbacPermission,
} from "@/features/admin/rbac/api";

// ─── Role category helper ─────────────────────────────────────────────────────

const STAFF_ROLES = new Set([
  "AdminManager", "CustomerSupport", "TechnicalSupport",
  "ContentEditor", "SeoSpecialist", "MarketingStaff",
]);
const PLATFORM_ROLES = new Set([
  "CompanyOwner", "Broker", "Agent", "Owner", "User",
]);

function getRoleCategory(name: string) {
  if (name === "Admin")             return { label: "مدير النظام", color: "#7c3aed", bg: "#f5f3ff", border: "#ddd6fe" };
  if (STAFF_ROLES.has(name))        return { label: "موظف داخلي",  color: "#0369a1", bg: "#e0f2fe", border: "#bae6fd" };
  if (PLATFORM_ROLES.has(name))     return { label: "منصة",         color: "#0f766e", bg: "#ccfbf1", border: "#99f6e4" };
  return                                   { label: "مخصص",          color: "#6b7280", bg: "#f3f4f6", border: "#e5e7eb" };
}

// ─── Module icons ─────────────────────────────────────────────────────────────

const MODULE_META: Record<string, { color: string; icon: ReactNode }> = {
  dashboard:  { color: "#6366f1", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg> },
  properties: { color: "#16a34a", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg> },
  projects:   { color: "#0ea5e9", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 3h-8l-2 4h12z"/></svg> },
  agents:     { color: "#f59e0b", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg> },
  users:      { color: "#8b5cf6", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg> },
  staff:      { color: "#ec4899", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/><path d="M12 14v7"/></svg> },
  roles:      { color: "#9333ea", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg> },
  companies:  { color: "#0284c7", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><line x1="9" y1="22" x2="9" y2="12"/><line x1="15" y1="22" x2="15" y2="12"/><line x1="9" y1="12" x2="15" y2="12"/></svg> },
  requests:   { color: "#ef4444", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg> },
  blog:       { color: "#10b981", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg> },
  seo:        { color: "#f97316", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/><line x1="11" y1="8" x2="11" y2="14"/><line x1="8" y1="11" x2="14" y2="11"/></svg> },
  marketing:  { color: "#14b8a6", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg> },
  settings:   { color: "#6b7280", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> },
  billing:    { color: "#ca8a04", icon: <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg> },
};

// ─── Toggle Switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  disabled,
  color = "#16a34a",
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
  color?: string;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 40,
        height: 22,
        borderRadius: 99,
        border: "none",
        backgroundColor: checked ? color : "#d1d5db",
        cursor: disabled ? "not-allowed" : "pointer",
        padding: 0,
        position: "relative",
        transition: "background-color 0.2s",
        flexShrink: 0,
        outline: "none",
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3,
        right: checked ? 3 : undefined,
        left: checked ? undefined : 3,
        width: 16,
        height: 16,
        borderRadius: "50%",
        backgroundColor: "#fff",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        transition: "left 0.2s, right 0.2s",
        display: "block",
      }} />
    </button>
  );
}

// ─── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  const isOk = type === "ok";
  return (
    <div style={{
      position: "fixed",
      top: 20,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 9999,
      backgroundColor: isOk ? "#052e16" : "#450a0a",
      color: isOk ? "#bbf7d0" : "#fecaca",
      padding: "0.75rem 1.4rem",
      borderRadius: 10,
      fontSize: "0.84rem",
      fontWeight: 600,
      boxShadow: "0 8px 28px rgba(0,0,0,0.25)",
      display: "flex",
      alignItems: "center",
      gap: "0.6rem",
      maxWidth: 380,
      whiteSpace: "nowrap",
    }}>
      {isOk
        ? <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
        : <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      }
      {msg}
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────

function Skeleton({ w = "100%", h = 18, r = 6 }: { w?: string | number; h?: number; r?: number }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: r,
      backgroundColor: "#f1f5f9",
      animation: "pulse 1.5s ease-in-out infinite",
    }} />
  );
}

// ─── Module Accordion ─────────────────────────────────────────────────────────

function ModuleAccordion({
  module,
  perms,
  checked,
  onToggle,
  onToggleModule,
  defaultOpen,
}: {
  module: string;
  perms: RbacPermission[];
  checked: Set<string>;
  onToggle: (key: string) => void;
  onToggleModule: (keys: string[]) => void;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const keys = perms.map(p => p.key);
  const activeCount = keys.filter(k => checked.has(k)).length;
  const allOn = activeCount === keys.length;
  const someOn = activeCount > 0 && !allOn;
  const label = MODULE_LABELS[module] ?? module;
  const meta = MODULE_META[module] ?? { color: "#6b7280", icon: null };

  const headerCheckRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (headerCheckRef.current) {
      headerCheckRef.current.indeterminate = someOn;
    }
  }, [someOn]);

  return (
    <div style={{
      backgroundColor: "#fff",
      border: "1px solid #e8ecf0",
      borderRadius: 14,
      overflow: "hidden",
      boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
    }}>
      {/* ── Accordion Header ── */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.85rem",
          padding: "1rem 1.25rem",
          cursor: "pointer",
          userSelect: "none",
          borderBottom: open ? "1px solid #f0f4f8" : "none",
          transition: "background-color 0.1s",
        }}
        onClick={() => setOpen(v => !v)}
      >
        {/* Module icon pill */}
        <div style={{
          width: 36,
          height: 36,
          borderRadius: 10,
          backgroundColor: `${meta.color}18`,
          color: meta.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}>
          {meta.icon}
        </div>

        {/* Module title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.93rem", color: "#1e293b" }}>{label}</div>
          <div style={{ fontSize: "0.72rem", color: "#94a3b8", marginTop: "0.1rem" }}>
            {activeCount} من {keys.length} صلاحية مفعّلة
          </div>
        </div>

        {/* Progress pill */}
        <div style={{
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
          flexShrink: 0,
        }}>
          {/* Mini progress bar */}
          <div style={{
            width: 56,
            height: 5,
            backgroundColor: "#f1f5f9",
            borderRadius: 99,
            overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${keys.length ? (activeCount / keys.length) * 100 : 0}%`,
              backgroundColor: meta.color,
              borderRadius: 99,
              transition: "width 0.25s",
            }} />
          </div>

          {/* Select-all toggle */}
          <div
            onClick={e => { e.stopPropagation(); onToggleModule(keys); }}
            style={{ position: "relative", cursor: "pointer", padding: "0.2rem" }}
            title={allOn ? "إلغاء تحديد الكل" : "تحديد الكل"}
          >
            <input
              ref={headerCheckRef}
              type="checkbox"
              checked={allOn}
              onChange={() => onToggleModule(keys)}
              onClick={e => e.stopPropagation()}
              style={{
                width: 16, height: 16,
                cursor: "pointer",
                accentColor: meta.color,
              }}
            />
          </div>

          {/* Chevron */}
          <svg
            width={16} height={16} viewBox="0 0 24 24"
            fill="none" stroke="#94a3b8" strokeWidth="2.5"
            style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.2s", flexShrink: 0 }}
          >
            <polyline points="9 18 15 12 9 6" />
          </svg>
        </div>
      </div>

      {/* ── Permission List ── */}
      {open && (
        <div style={{
          padding: "1rem 1.25rem",
          display: "flex",
          flexDirection: "column",
          gap: "0.5rem",
        }}>
          {perms.map(p => {
            const isOn = checked.has(p.key);
            return (
              <div
                key={p.key}
                onClick={() => onToggle(p.key)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "1rem",
                  padding: "0.8rem 1rem",
                  borderRadius: 10,
                  backgroundColor: isOn ? `${meta.color}08` : "#fafafa",
                  border: `1px solid ${isOn ? `${meta.color}30` : "#f1f5f9"}`,
                  cursor: "pointer",
                  transition: "all 0.15s",
                }}
              >
                {/* Text */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: "0.87rem",
                    fontWeight: 600,
                    color: "#1e293b",
                    marginBottom: "0.2rem",
                  }}>
                    {PERMISSION_LABEL[p.key] ?? p.key}
                  </div>
                  {PERMISSION_DESC[p.key] && (
                    <div style={{
                      fontSize: "0.75rem",
                      color: "#94a3b8",
                      lineHeight: 1.5,
                    }}>
                      {PERMISSION_DESC[p.key]}
                    </div>
                  )}
                  <code style={{
                    fontSize: "0.65rem",
                    color: "#cbd5e1",
                    fontFamily: "monospace",
                    marginTop: "0.3rem",
                    display: "block",
                  }}>
                    {p.key}
                  </code>
                </div>

                {/* Toggle */}
                <ToggleSwitch
                  checked={isOn}
                  onChange={() => onToggle(p.key)}
                  color={meta.color}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function RoleDetailPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "roles.view" });
  const params = useParams();
  const router = useRouter();
  const roleId = params?.roleId as string;

  const [role,     setRole]     = useState<RbacRole | null>(null);
  const [allPerms, setAllPerms] = useState<RbacPermission[]>([]);
  const [checked,  setChecked]  = useState<Set<string>>(new Set());
  const [original, setOriginal] = useState<Set<string>>(new Set());
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [toast,    setToast]    = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [toastKey, setToastKey] = useState(0);

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setToastKey(k => k + 1);
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toastKey]);

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
  const coveragePct = allPerms.length > 0 ? Math.round((checked.size / allPerms.length) * 100) : 0;

  return (
    <>
      {/* Pulse animation */}
      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }`}</style>

      <div style={{ padding: "1.75rem 1.5rem 7rem", direction: "rtl", minHeight: "100vh", backgroundColor: "#f8fafc" }}>
        {toast && <Toast key={toastKey} msg={toast.msg} type={toast.type} />}

        {/* ── Breadcrumb ── */}
        <button
          onClick={() => router.push("/dashboard/admin/roles")}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.4rem",
            fontSize: "0.8rem", color: "#94a3b8",
            background: "none", border: "none",
            cursor: "pointer", padding: 0,
            marginBottom: "1.5rem", fontFamily: "inherit",
          }}
        >
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          <span>الأدوار والصلاحيات</span>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <polyline points="9 18 15 12 9 6" />
          </svg>
          {loading
            ? <span style={{ width: 80, height: 14, backgroundColor: "#f1f5f9", borderRadius: 4, display: "inline-block" }} />
            : <span style={{ color: "#475569", fontWeight: 600 }}>{role?.name ?? "—"}</span>
          }
        </button>

        {/* ── Role Header Card ── */}
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid #e8ecf0",
          borderRadius: 16,
          padding: "1.5rem 1.75rem",
          marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
        }}>
          {loading ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              <Skeleton h={24} w="40%" />
              <Skeleton h={14} w="60%" />
              <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.5rem" }}>
                <Skeleton h={64} w={120} r={12} />
                <Skeleton h={64} w={120} r={12} />
                <Skeleton h={64} w={120} r={12} />
              </div>
            </div>
          ) : role ? (
            <>
              {/* Title row */}
              <div style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "1.25rem",
                marginBottom: "1.25rem",
                flexWrap: "wrap",
              }}>
                {/* Icon */}
                <div style={{
                  width: 52, height: 52, borderRadius: 14,
                  backgroundColor: category?.bg ?? "#f3f4f6",
                  border: `1.5px solid ${category?.border ?? "#e5e7eb"}`,
                  color: category?.color ?? "#6b7280",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}>
                  <svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </div>

                {/* Name + badges */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.45rem" }}>
                    <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#0f172a", letterSpacing: "-0.01em" }}>
                      {role.name}
                    </h1>
                    {category && (
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700,
                        padding: "0.2rem 0.65rem", borderRadius: 20,
                        color: category.color, backgroundColor: category.bg,
                        border: `1px solid ${category.border}`,
                      }}>
                        {category.label}
                      </span>
                    )}
                    {role.isSystem && (
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700,
                        padding: "0.2rem 0.65rem", borderRadius: 20,
                        color: "#6366f1", backgroundColor: "#eef2ff",
                        border: "1px solid #c7d2fe",
                      }}>
                        نظام
                      </span>
                    )}
                    {isDirty && (
                      <span style={{
                        fontSize: "0.7rem", fontWeight: 700,
                        padding: "0.2rem 0.65rem", borderRadius: 20,
                        color: "#b45309", backgroundColor: "#fffbeb",
                        border: "1px solid #fde68a",
                      }}>
                        غير محفوظ
                      </span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: "0.8rem", color: "#94a3b8" }}>
                    إدارة الصلاحيات الممنوحة لهذا الدور وضبطها بدقة
                  </p>
                </div>
              </div>

              {/* Stats row */}
              <div style={{ display: "flex", gap: "0.85rem", flexWrap: "wrap" }}>
                {/* Permission count */}
                <div style={{
                  flex: 1, minWidth: 110,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e8ecf0",
                  borderRadius: 12,
                  padding: "0.85rem 1.1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a", letterSpacing: "-0.03em" }}>
                    {checked.size}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>صلاحية مفعّلة</div>
                </div>

                {/* User count */}
                <div style={{
                  flex: 1, minWidth: 110,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e8ecf0",
                  borderRadius: 12,
                  padding: "0.85rem 1.1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#0ea5e9", letterSpacing: "-0.03em" }}>
                    {role.userCount}
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>مستخدم معيّن</div>
                </div>

                {/* Coverage */}
                <div style={{
                  flex: 1, minWidth: 110,
                  backgroundColor: "#f8fafc",
                  border: "1px solid #e8ecf0",
                  borderRadius: 12,
                  padding: "0.85rem 1.1rem",
                  display: "flex",
                  flexDirection: "column",
                  gap: "0.15rem",
                }}>
                  <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#8b5cf6", letterSpacing: "-0.03em" }}>
                    {coveragePct}%
                  </div>
                  <div style={{ fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>نسبة التغطية</div>
                </div>
              </div>

              {/* Coverage progress bar */}
              <div style={{ marginTop: "1rem" }}>
                <div style={{
                  display: "flex",
                  justifyContent: "space-between",
                  fontSize: "0.74rem",
                  color: "#94a3b8",
                  marginBottom: "0.4rem",
                }}>
                  <span>تغطية الصلاحيات</span>
                  <span>{checked.size} / {allPerms.length}</span>
                </div>
                <div style={{ height: 7, backgroundColor: "#f1f5f9", borderRadius: 99, overflow: "hidden" }}>
                  <div style={{
                    height: "100%",
                    width: `${coveragePct}%`,
                    borderRadius: 99,
                    transition: "width 0.35s ease",
                    background: coveragePct === 100
                      ? "linear-gradient(90deg,#16a34a,#22d3ee)"
                      : coveragePct > 60
                        ? "#16a34a"
                        : coveragePct > 30
                          ? "#f59e0b"
                          : "#ef4444",
                  }} />
                </div>
              </div>
            </>
          ) : (
            <div style={{ textAlign: "center", padding: "3rem 1rem", color: "#94a3b8" }}>
              الدور غير موجود
            </div>
          )}
        </div>

        {/* ── Permission Modules ── */}
        {!loading && role && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>

            {/* Section title */}
            <div style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: "0.4rem",
            }}>
              <h2 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
                مصفوفة الصلاحيات
              </h2>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={() => {
                    const all = allPerms.map(p => p.key);
                    setChecked(new Set(all));
                  }}
                  style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    padding: "0.3rem 0.75rem", borderRadius: 8,
                    border: "1px solid #d1fae5",
                    backgroundColor: "#f0fdf4", color: "#16a34a",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  تحديد الكل
                </button>
                <button
                  onClick={() => setChecked(new Set())}
                  style={{
                    fontSize: "0.75rem", fontWeight: 600,
                    padding: "0.3rem 0.75rem", borderRadius: 8,
                    border: "1px solid #fee2e2",
                    backgroundColor: "#fef2f2", color: "#dc2626",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  إلغاء الكل
                </button>
              </div>
            </div>

            {/* Module accordions */}
            {Object.entries(grouped).map(([module, perms], i) => (
              <ModuleAccordion
                key={module}
                module={module}
                perms={perms}
                checked={checked}
                onToggle={toggle}
                onToggleModule={toggleModule}
                defaultOpen={i === 0}
              />
            ))}
          </div>
        )}

        {/* ── Loading skeleton for modules ── */}
        {loading && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} style={{
                backgroundColor: "#fff",
                border: "1px solid #e8ecf0",
                borderRadius: 14,
                padding: "1rem 1.25rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
                  <Skeleton w={36} h={36} r={10} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    <Skeleton h={14} w="30%" />
                    <Skeleton h={11} w="20%" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

      </div>

      {/* ── Sticky Save Bar ── */}
      {!loading && role && (
        <div style={{
          position: "fixed",
          bottom: 0,
          right: 232,
          left: 0,
          backgroundColor: "#fff",
          borderTop: "1px solid #e8ecf0",
          padding: "0.9rem 1.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
          zIndex: 100,
          boxShadow: "0 -4px 20px rgba(0,0,0,0.06)",
        }}>
          {/* Status indicator */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            {saving ? (
              <>
                <div style={{
                  width: 8, height: 8, borderRadius: "50%",
                  backgroundColor: "#f59e0b",
                  animation: "pulse 1s ease-in-out infinite",
                }} />
                <span style={{ fontSize: "0.82rem", color: "#92400e", fontWeight: 600 }}>
                  جاري الحفظ…
                </span>
              </>
            ) : isDirty ? (
              <>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#f59e0b" }} />
                <span style={{ fontSize: "0.82rem", color: "#92400e", fontWeight: 600 }}>
                  يوجد تعديلات غير محفوظة
                </span>
              </>
            ) : (
              <>
                <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#22c55e" }} />
                <span style={{ fontSize: "0.82rem", color: "#15803d", fontWeight: 600 }}>
                  محفوظ
                </span>
              </>
            )}
          </div>

          {/* Action buttons */}
          <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
            <button
              onClick={handleReset}
              disabled={saving || !isDirty}
              style={{
                padding: "0.55rem 1.2rem",
                fontSize: "0.83rem",
                fontWeight: 600,
                borderRadius: 9,
                border: "1px solid #e5e7eb",
                backgroundColor: "#f9fafb",
                color: "#6b7280",
                cursor: saving || !isDirty ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: saving || !isDirty ? 0.5 : 1,
                transition: "opacity 0.15s",
              }}
            >
              إعادة تعيين
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !isDirty}
              style={{
                padding: "0.58rem 1.75rem",
                fontSize: "0.85rem",
                fontWeight: 700,
                borderRadius: 9,
                border: "none",
                background: saving || !isDirty
                  ? "#d1fae5"
                  : "linear-gradient(135deg, #16a34a, #15803d)",
                color: "#fff",
                cursor: saving || !isDirty ? "not-allowed" : "pointer",
                fontFamily: "inherit",
                opacity: saving || !isDirty ? 0.7 : 1,
                boxShadow: saving || !isDirty ? "none" : "0 2px 8px rgba(22,163,74,0.3)",
                transition: "all 0.15s",
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              {saving ? (
                <>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: "pulse 1s infinite" }}>
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  جاري الحفظ…
                </>
              ) : (
                <>
                  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                  حفظ الصلاحيات
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
