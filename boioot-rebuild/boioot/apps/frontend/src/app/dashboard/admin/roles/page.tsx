"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { normalizeError } from "@/lib/api";
import {
  rbacApi,
  MODULE_LABELS,
  PERMISSION_LABEL,
  type RbacRole,
  type RbacPermission,
} from "@/features/admin/rbac/api";
import { ROLE_TEMPLATES, type RoleTemplate } from "@/features/admin/rbac/templates";
import type { AdminUserResponse } from "@/types";

// ── Role category helpers ────────────────────────────────────────────────────

const STAFF_ROLES = new Set([
  "AdminManager", "CustomerSupport", "TechnicalSupport",
  "ContentEditor", "SeoSpecialist", "MarketingStaff",
]);
const PLATFORM_ROLES = new Set([
  "CompanyOwner", "Broker", "Agent", "Owner", "User",
]);

function getRoleCategory(name: string): { label: string; color: string; bg: string } {
  if (name === "Admin") return { label: "مدير النظام", color: "#9333ea", bg: "#f5f3ff" };
  if (STAFF_ROLES.has(name))    return { label: "موظف", color: "#0369a1", bg: "#e0f2fe" };
  if (PLATFORM_ROLES.has(name)) return { label: "منصة", color: "#0f766e", bg: "#ccfbf1" };
  return { label: "مخصص", color: "#6b7280", bg: "#f3f4f6" };
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const card: React.CSSProperties = {
  backgroundColor: "#fff",
  border: "1px solid #e8ecf0",
  borderRadius: 12,
  padding: "1.25rem",
  boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
};

const btn = (color = "#16a34a", bg = "#f0fdf4", border = "#bbf7d0"): React.CSSProperties => ({
  padding: "0.45rem 1rem",
  fontSize: "0.8rem",
  fontWeight: 600,
  borderRadius: 8,
  border: `1px solid ${border}`,
  backgroundColor: bg,
  color,
  cursor: "pointer",
  transition: "opacity 0.15s",
  fontFamily: "inherit",
  whiteSpace: "nowrap" as const,
});

const inputStyle: React.CSSProperties = {
  padding: "0.5rem 0.75rem",
  fontSize: "0.85rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontFamily: "inherit",
  width: "100%",
  boxSizing: "border-box" as const,
  direction: "rtl",
};

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", top: 20, right: 24, zIndex: 9999,
      backgroundColor: type === "ok" ? "#f0fdf4" : "#fef2f2",
      border: `1px solid ${type === "ok" ? "#bbf7d0" : "#fecaca"}`,
      color: type === "ok" ? "#15803d" : "#dc2626",
      padding: "0.65rem 1.1rem",
      borderRadius: 10,
      fontSize: "0.83rem",
      fontWeight: 600,
      boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
    }}>
      {msg}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Template Card component
// ════════════════════════════════════════════════════════════════════════════════

function TemplateCard({
  tpl,
  selected,
  onSelect,
}: {
  tpl: RoleTemplate;
  selected: boolean;
  onSelect: (t: RoleTemplate) => void;
}) {
  return (
    <button
      onClick={() => onSelect(tpl)}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
        padding: "1rem",
        borderRadius: 12,
        border: selected
          ? `2px solid ${tpl.color}`
          : `1.5px solid ${tpl.border}`,
        backgroundColor: selected ? tpl.bg : "#fff",
        cursor: "pointer",
        textAlign: "right",
        fontFamily: "inherit",
        transition: "all 0.15s",
        boxShadow: selected
          ? `0 0 0 3px ${tpl.color}22`
          : "0 1px 3px rgba(0,0,0,0.04)",
        position: "relative",
        minHeight: 120,
      }}
    >
      {/* Selected tick */}
      {selected && (
        <div style={{
          position: "absolute",
          top: 10,
          left: 10,
          width: 20,
          height: 20,
          borderRadius: "50%",
          backgroundColor: tpl.color,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}>
          <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      )}

      {/* Icon */}
      <div style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: `${tpl.color}18`,
        color: tpl.color,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}>
        <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d={tpl.iconPath} />
        </svg>
      </div>

      {/* Name + description */}
      <div>
        <div style={{ fontSize: "0.86rem", fontWeight: 700, color: "#1e293b", marginBottom: "0.2rem" }}>
          {tpl.name}
        </div>
        <div style={{ fontSize: "0.72rem", color: "#94a3b8", lineHeight: 1.5 }}>
          {tpl.description}
        </div>
      </div>

      {/* Permission count badge */}
      {tpl.permissions.length > 0 && (
        <div style={{
          marginTop: "auto",
          display: "inline-flex",
          alignItems: "center",
          gap: "0.3rem",
          fontSize: "0.68rem",
          fontWeight: 700,
          color: tpl.color,
          backgroundColor: `${tpl.color}14`,
          padding: "0.18rem 0.55rem",
          borderRadius: 20,
          width: "fit-content",
        }}>
          <svg width={9} height={9} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
          {tpl.permissions.length} صلاحية
        </div>
      )}
    </button>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Permission Preview (inside create panel)
// ════════════════════════════════════════════════════════════════════════════════

function PermissionPreview({ permissions }: { permissions: string[] }) {
  if (permissions.length === 0) return null;

  const grouped = permissions.reduce<Record<string, string[]>>((acc, key) => {
    const module = key.split(".")[0];
    (acc[module] ||= []).push(key);
    return acc;
  }, {});

  return (
    <div style={{
      backgroundColor: "#f8fafc",
      border: "1px solid #e8ecf0",
      borderRadius: 10,
      padding: "1rem",
    }}>
      <div style={{
        fontSize: "0.75rem",
        fontWeight: 700,
        color: "#64748b",
        marginBottom: "0.75rem",
        display: "flex",
        alignItems: "center",
        gap: "0.4rem",
      }}>
        <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
        </svg>
        معاينة الصلاحيات المضمّنة
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
        {Object.entries(grouped).map(([module, keys]) => (
          <div key={module}>
            <div style={{
              fontSize: "0.69rem",
              fontWeight: 700,
              color: "#94a3b8",
              textTransform: "uppercase",
              letterSpacing: "0.06em",
              marginBottom: "0.3rem",
            }}>
              {MODULE_LABELS[module] ?? module}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem" }}>
              {keys.map(k => (
                <span key={k} style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "#374151",
                  backgroundColor: "#fff",
                  border: "1px solid #e5e7eb",
                  padding: "0.18rem 0.55rem",
                  borderRadius: 6,
                }}>
                  {PERMISSION_LABEL[k] ?? k}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 1 — Roles Management
// ════════════════════════════════════════════════════════════════════════════════

function RolesTab({ toast }: { toast: (m: string, t?: "ok" | "err") => void }) {
  const router = useRouter();

  const [roles, setRoles]         = useState<RbacRole[]>([]);
  const [loading, setLoading]     = useState(true);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editName, setEditName]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

  // Create panel state
  const [showCreate, setShowCreate]     = useState(false);
  const [selectedTpl, setSelectedTpl]   = useState<RoleTemplate>(ROLE_TEMPLATES[0]);
  const [newName, setNewName]           = useState("");
  const [creating, setCreating]         = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRoles(await rbacApi.getRoles());
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // When template selection changes, auto-fill suggested role name if field is empty or was auto-filled
  const handleSelectTemplate = (tpl: RoleTemplate) => {
    setSelectedTpl(tpl);
    if (!newName || newName === selectedTpl.suggestedRoleName) {
      setNewName(tpl.suggestedRoleName);
    }
  };

  const handleCreate = async () => {
    const name = newName.trim();
    if (!name) return;
    setCreating(true);
    try {
      const role = await rbacApi.createRole(name);
      // Apply template permissions if any
      if (selectedTpl.permissions.length > 0) {
        await rbacApi.setRolePermissions(role.id, selectedTpl.permissions);
      }
      toast(`تم إنشاء الدور "${name}" بنجاح`);
      // Navigate to role detail page for further customisation
      router.push(`/dashboard/admin/roles/${role.id}`);
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setCreating(false);
    }
  };

  const handleRename = async (id: string) => {
    if (!editName.trim()) return;
    setSaving(true);
    try {
      await rbacApi.renameRole(id, editName.trim());
      setRoles(r => r.map(x => x.id === id ? { ...x, name: editName.trim() } : x));
      setEditId(null);
      toast("تم تعديل اسم الدور");
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (role: RbacRole) => {
    if (!confirm(`حذف دور "${role.name}"؟ لا يمكن التراجع.`)) return;
    setDeleting(role.id);
    try {
      await rbacApi.deleteRole(role.id);
      setRoles(r => r.filter(x => x.id !== role.id));
      toast("تم حذف الدور");
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* ── Create role button / panel ── */}
      {!showCreate ? (
        <div style={{ display: "flex", justifyContent: "flex-start" }}>
          <button
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.5rem",
              padding: "0.6rem 1.25rem",
              fontSize: "0.85rem", fontWeight: 700,
              borderRadius: 10,
              border: "none",
              background: "linear-gradient(135deg,#16a34a,#15803d)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: "inherit",
              boxShadow: "0 2px 8px rgba(22,163,74,0.3)",
            }}
            onClick={() => setShowCreate(true)}
          >
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            إنشاء دور جديد
          </button>
        </div>
      ) : (
        /* ── Create panel ── */
        <div style={{
          backgroundColor: "#fff",
          border: "1px solid #e8ecf0",
          borderRadius: 16,
          padding: "1.5rem",
          boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
        }}>

          {/* Panel header */}
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "1.25rem",
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
                إنشاء دور جديد
              </h3>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.78rem", color: "#94a3b8" }}>
                اختر نقطة البداية ثم اضبط الصلاحيات
              </p>
            </div>
            <button
              onClick={() => { setShowCreate(false); setNewName(""); setSelectedTpl(ROLE_TEMPLATES[0]); }}
              style={{
                background: "none", border: "none",
                cursor: "pointer", color: "#94a3b8",
                padding: "0.25rem",
                display: "flex", alignItems: "center",
              }}
            >
              <svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>

          {/* Step 1: Template selection */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontSize: "0.75rem", fontWeight: 700,
              color: "#64748b", marginBottom: "0.75rem",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 18, height: 18, borderRadius: "50%",
                backgroundColor: "#1e293b", color: "#fff",
                fontSize: "0.65rem", fontWeight: 800, flexShrink: 0,
              }}>1</span>
              اختر القالب
            </div>
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))",
              gap: "0.65rem",
            }}>
              {ROLE_TEMPLATES.map(tpl => (
                <TemplateCard
                  key={tpl.id}
                  tpl={tpl}
                  selected={selectedTpl.id === tpl.id}
                  onSelect={handleSelectTemplate}
                />
              ))}
            </div>
          </div>

          {/* Permission preview */}
          {selectedTpl.permissions.length > 0 && (
            <div style={{ marginBottom: "1.25rem" }}>
              <PermissionPreview permissions={selectedTpl.permissions} />
            </div>
          )}

          {/* Step 2: Role name */}
          <div style={{ marginBottom: "1.25rem" }}>
            <div style={{
              fontSize: "0.75rem", fontWeight: 700,
              color: "#64748b", marginBottom: "0.6rem",
              display: "flex", alignItems: "center", gap: "0.4rem",
            }}>
              <span style={{
                display: "inline-flex", alignItems: "center", justifyContent: "center",
                width: 18, height: 18, borderRadius: "50%",
                backgroundColor: "#1e293b", color: "#fff",
                fontSize: "0.65rem", fontWeight: 800, flexShrink: 0,
              }}>2</span>
              اسم الدور
            </div>
            <div style={{ display: "flex", gap: "0.65rem", alignItems: "center", flexWrap: "wrap" }}>
              <input
                style={{
                  ...inputStyle,
                  maxWidth: 320,
                  border: "1.5px solid #d1d5db",
                  borderRadius: 10,
                  padding: "0.65rem 0.9rem",
                  fontSize: "0.88rem",
                }}
                placeholder="مثال: MarketingManager"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === "Enter" && handleCreate()}
                disabled={creating}
                autoFocus
              />
              <button
                style={{
                  padding: "0.65rem 1.75rem",
                  fontSize: "0.86rem",
                  fontWeight: 700,
                  borderRadius: 10,
                  border: "none",
                  background: !newName.trim() || creating
                    ? "#d1fae5"
                    : "linear-gradient(135deg,#16a34a,#15803d)",
                  color: "#fff",
                  cursor: !newName.trim() || creating ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  opacity: !newName.trim() || creating ? 0.7 : 1,
                  boxShadow: !newName.trim() || creating ? "none" : "0 2px 8px rgba(22,163,74,0.3)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.4rem",
                }}
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
              >
                {creating ? (
                  "جاري الإنشاء…"
                ) : (
                  <>
                    <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    إنشاء وتخصيص الصلاحيات
                  </>
                )}
              </button>
            </div>
            {selectedTpl.permissions.length > 0 && (
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.73rem", color: "#94a3b8" }}>
                سيتم تطبيق {selectedTpl.permissions.length} صلاحية تلقائياً — يمكنك التعديل بعد الإنشاء
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Roles table ── */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e8ecf0" }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "#374151" }}>
                الدور
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 700, color: "#374151", width: 110 }}>
                الصلاحيات
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 700, color: "#374151", width: 110 }}>
                المستخدمون
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 700, color: "#374151", width: 140 }}>
                إجراءات
              </th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>جاري التحميل…</td></tr>
            ) : roles.length === 0 ? (
              <tr><td colSpan={4} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>لا توجد أدوار</td></tr>
            ) : (
              roles.map((role, i) => (
                <tr key={role.id} style={{
                  borderBottom: "1px solid #f1f5f9",
                  backgroundColor: i % 2 === 0 ? "#fff" : "#fafbfc",
                }}>
                  <td style={{ padding: "0.65rem 1rem" }}>
                    {editId === role.id ? (
                      <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                        <input
                          style={{ ...inputStyle, maxWidth: 200 }}
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === "Enter") handleRename(role.id);
                            if (e.key === "Escape") setEditId(null);
                          }}
                          autoFocus
                          disabled={saving}
                        />
                        <button style={btn()} onClick={() => handleRename(role.id)} disabled={saving}>
                          حفظ
                        </button>
                        <button style={btn("#6b7280", "#f9fafb", "#e5e7eb")} onClick={() => setEditId(null)}>
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{role.name}</span>
                        {(() => {
                          const cat = getRoleCategory(role.name);
                          return (
                            <span style={{
                              fontSize: "0.65rem", fontWeight: 700,
                              color: cat.color, backgroundColor: cat.bg,
                              padding: "0.1rem 0.45rem", borderRadius: 20,
                            }}>
                              {cat.label}
                            </span>
                          );
                        })()}
                        {role.isSystem && (
                          <span style={{
                            fontSize: "0.65rem", fontWeight: 700, color: "#6366f1",
                            backgroundColor: "#eef2ff", padding: "0.1rem 0.45rem", borderRadius: 20,
                          }}>
                            نظام
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      backgroundColor: "#f1f5f9",
                      color: "#475569",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: 20,
                    }}>
                      {role.permissionCount}
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                    <span style={{
                      display: "inline-block",
                      backgroundColor: role.userCount > 0 ? "#f0fdf4" : "#f8fafc",
                      color: role.userCount > 0 ? "#15803d" : "#94a3b8",
                      fontSize: "0.75rem",
                      fontWeight: 700,
                      padding: "0.2rem 0.6rem",
                      borderRadius: 20,
                    }}>
                      {role.userCount}
                    </span>
                  </td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                    {editId !== role.id && (
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                        <Link
                          href={`/dashboard/admin/roles/${role.id}`}
                          style={{
                            ...btn("#16a34a", "#f0fdf4", "#bbf7d0"),
                            textDecoration: "none",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.3rem",
                          }}
                        >
                          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" />
                          </svg>
                          إدارة الصلاحيات
                        </Link>
                        {!role.isSystem && (
                          <>
                            <button
                              style={btn("#2563eb", "#eff6ff", "#bfdbfe")}
                              onClick={() => { setEditId(role.id); setEditName(role.name); }}
                            >
                              تعديل
                            </button>
                            <button
                              style={btn("#dc2626", "#fef2f2", "#fecaca")}
                              onClick={() => handleDelete(role)}
                              disabled={deleting === role.id}
                            >
                              {deleting === role.id ? "..." : "حذف"}
                            </button>
                          </>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 2 — Permissions Assignment
// ════════════════════════════════════════════════════════════════════════════════

function PermissionsTab({ toast }: { toast: (m: string, t?: "ok" | "err") => void }) {
  const [roles, setRoles]             = useState<RbacRole[]>([]);
  const [allPerms, setAllPerms]       = useState<RbacPermission[]>([]);
  const [selectedRole, setSelectedRole] = useState<string>("");
  const [checked, setChecked]         = useState<Set<string>>(new Set());
  const [loadingPerms, setLoadingPerms] = useState(false);
  const [saving, setSaving]           = useState(false);
  const [initDone, setInitDone]       = useState(false);

  // Group permissions by module
  const grouped = allPerms.reduce<Record<string, RbacPermission[]>>((acc, p) => {
    (acc[p.module] ||= []).push(p);
    return acc;
  }, {});

  useEffect(() => {
    Promise.all([rbacApi.getRoles(), rbacApi.getPermissions()])
      .then(([r, p]) => { setRoles(r); setAllPerms(p); })
      .catch(e => toast(normalizeError(e), "err"))
      .finally(() => setInitDone(true));
  }, []);

  const handleRoleChange = async (roleId: string) => {
    setSelectedRole(roleId);
    if (!roleId) { setChecked(new Set()); return; }
    setLoadingPerms(true);
    try {
      const data = await rbacApi.getRolePermissions(roleId);
      setChecked(new Set(data.permissions));
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setLoadingPerms(false);
    }
  };

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
    if (!selectedRole) return;
    setSaving(true);
    try {
      const result = await rbacApi.setRolePermissions(selectedRole, [...checked]);
      toast(`تم حفظ ${result.permissionCount} صلاحية`);
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setSaving(false);
    }
  };

  if (!initDone) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>جاري التحميل…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Role selector + save */}
      <div style={{ ...card, display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
        <select
          style={{ ...inputStyle, maxWidth: 260, cursor: "pointer" }}
          value={selectedRole}
          onChange={e => handleRoleChange(e.target.value)}
          disabled={loadingPerms}
        >
          <option value="">— اختر دوراً —</option>
          {roles.map(r => (
            <option key={r.id} value={r.id}>{r.name}</option>
          ))}
        </select>
        {selectedRole && (
          <button style={btn()} onClick={handleSave} disabled={saving || loadingPerms}>
            {saving ? "جاري الحفظ…" : "حفظ الصلاحيات"}
          </button>
        )}
        {selectedRole && (
          <span style={{ fontSize: "0.78rem", color: "#64748b" }}>
            {checked.size} / {allPerms.length} صلاحية محددة
          </span>
        )}
      </div>

      {/* Permissions grid */}
      {selectedRole && !loadingPerms && Object.entries(grouped).map(([module, perms]) => {
        const keys = perms.map(p => p.key);
        const allOn = keys.every(k => checked.has(k));
        const someOn = keys.some(k => checked.has(k));
        const label = MODULE_LABELS[module] ?? module;

        return (
          <div key={module} style={card}>
            {/* Module header */}
            <div
              style={{
                display: "flex", alignItems: "center", gap: "0.65rem",
                marginBottom: "0.85rem", cursor: "pointer",
              }}
              onClick={() => toggleModule(keys)}
            >
              <input
                type="checkbox"
                checked={allOn}
                ref={el => { if (el) el.indeterminate = someOn && !allOn; }}
                onChange={() => toggleModule(keys)}
                style={{ width: 16, height: 16, cursor: "pointer", accentColor: "#16a34a" }}
                onClick={e => e.stopPropagation()}
              />
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#374151" }}>{label}</span>
              <span style={{ fontSize: "0.72rem", color: "#94a3b8", fontFamily: "monospace" }}>
                ({keys.filter(k => checked.has(k)).length}/{keys.length})
              </span>
            </div>

            {/* Permission checkboxes */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
              gap: "0.45rem 1rem",
            }}>
              {perms.map(p => (
                <label
                  key={p.key}
                  style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    cursor: "pointer", padding: "0.3rem 0.4rem", borderRadius: 6,
                    backgroundColor: checked.has(p.key) ? "#f0fdf4" : "transparent",
                    border: `1px solid ${checked.has(p.key) ? "#bbf7d0" : "transparent"}`,
                    transition: "background 0.1s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked.has(p.key)}
                    onChange={() => toggle(p.key)}
                    style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#16a34a", flexShrink: 0 }}
                  />
                  <span style={{ fontSize: "0.8rem", color: "#374151" }}>
                    {PERMISSION_LABEL[p.key] ?? p.key}
                  </span>
                  <span style={{
                    fontSize: "0.65rem", color: "#94a3b8", fontFamily: "monospace",
                    marginRight: "auto",
                  }}>
                    {p.key}
                  </span>
                </label>
              ))}
            </div>
          </div>
        );
      })}

      {selectedRole && loadingPerms && (
        <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>جاري التحميل…</div>
      )}

      {!selectedRole && (
        <div style={{
          ...card,
          textAlign: "center",
          padding: "3rem",
          color: "#94a3b8",
          fontSize: "0.9rem",
        }}>
          اختر دوراً من القائمة أعلاه لعرض صلاحياته وتعديلها
        </div>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// TAB 3 — Assign Users to Roles
// ════════════════════════════════════════════════════════════════════════════════

function AssignUsersTab({ toast }: { toast: (m: string, t?: "ok" | "err") => void }) {
  const [roles, setRoles]       = useState<RbacRole[]>([]);
  const [users, setUsers]       = useState<AdminUserResponse[]>([]);
  const [search, setSearch]     = useState("");
  const [selUser, setSelUser]   = useState<string>("");
  const [selRole, setSelRole]   = useState<string>("");
  const [saving, setSaving]     = useState(false);
  const [initDone, setInitDone] = useState(false);

  useEffect(() => {
    Promise.all([rbacApi.getRoles(), rbacApi.getUsers(1, 200)])
      .then(([r, u]) => { setRoles(r); setUsers(u.items); })
      .catch(e => toast(normalizeError(e), "err"))
      .finally(() => setInitDone(true));
  }, []);

  const filtered = users.filter(u =>
    !search ||
    u.fullName.toLowerCase().includes(search.toLowerCase()) ||
    u.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleAssign = async () => {
    if (!selUser || !selRole) return;
    setSaving(true);
    try {
      const result = await rbacApi.assignUserRole(selUser, selRole);
      // Update user list to reflect new role
      setUsers(prev => prev.map(u =>
        u.id === selUser ? { ...u, role: result.roleName } : u
      ));
      toast(`تم تعيين الدور "${result.roleName}" للمستخدم`);
      setSelUser("");
      setSelRole("");
    } catch (e) {
      toast(normalizeError(e), "err");
    } finally {
      setSaving(false);
    }
  };

  if (!initDone) {
    return <div style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>جاري التحميل…</div>;
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

      {/* Assignment form */}
      <div style={{ ...card }}>
        <h3 style={{ margin: "0 0 1rem", fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
          تعيين دور لمستخدم
        </h3>
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}>
          <div style={{ flex: 1, minWidth: 220 }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.35rem", fontWeight: 600 }}>
              المستخدم
            </label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={selUser}
              onChange={e => setSelUser(e.target.value)}
            >
              <option value="">— اختر مستخدماً —</option>
              {filtered.map(u => (
                <option key={u.id} value={u.id}>
                  {u.fullName} ({u.email}) — {u.role}
                </option>
              ))}
            </select>
          </div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <label style={{ display: "block", fontSize: "0.75rem", color: "#64748b", marginBottom: "0.35rem", fontWeight: 600 }}>
              الدور
            </label>
            <select
              style={{ ...inputStyle, cursor: "pointer" }}
              value={selRole}
              onChange={e => setSelRole(e.target.value)}
            >
              <option value="">— اختر دوراً —</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <button
            style={{ ...btn(), alignSelf: "flex-end", padding: "0.5rem 1.25rem" }}
            onClick={handleAssign}
            disabled={saving || !selUser || !selRole}
          >
            {saving ? "جاري التعيين…" : "تعيين الدور"}
          </button>
        </div>
      </div>

      {/* Users table */}
      <div style={{ ...card, padding: 0, overflow: "hidden" }}>
        {/* Search bar */}
        <div style={{ padding: "0.85rem 1rem", borderBottom: "1px solid #f1f5f9" }}>
          <input
            style={{ ...inputStyle, maxWidth: 300 }}
            placeholder="بحث بالاسم أو البريد"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.82rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e8ecf0" }}>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "#374151" }}>
                المستخدم
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "right", fontWeight: 700, color: "#374151", width: 180 }}>
                البريد الإلكتروني
              </th>
              <th style={{ padding: "0.75rem 1rem", textAlign: "center", fontWeight: 700, color: "#374151", width: 140 }}>
                الدور الحالي
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan={3} style={{ padding: "2rem", textAlign: "center", color: "#64748b" }}>لا توجد نتائج</td></tr>
            ) : (
              filtered.slice(0, 50).map((u, i) => (
                <tr
                  key={u.id}
                  style={{
                    borderBottom: "1px solid #f1f5f9",
                    backgroundColor: selUser === u.id ? "#f0fdf4" : i % 2 === 0 ? "#fff" : "#fafbfc",
                    cursor: "pointer",
                  }}
                  onClick={() => setSelUser(u.id === selUser ? "" : u.id)}
                >
                  <td style={{ padding: "0.65rem 1rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: "50%",
                        backgroundColor: "#2e7d32",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        color: "#fff", fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
                      }}>
                        {u.fullName.charAt(0)}
                      </div>
                      <span style={{ fontWeight: 600, color: "#1e293b" }}>{u.fullName}</span>
                    </div>
                  </td>
                  <td style={{ padding: "0.65rem 1rem", color: "#475569", direction: "ltr", textAlign: "left" }}>
                    {u.email}
                  </td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "center" }}>
                    <span style={{
                      fontSize: "0.72rem", fontWeight: 700,
                      padding: "0.2rem 0.65rem", borderRadius: 20,
                      backgroundColor: "#f1f5f9", color: "#475569",
                    }}>
                      {u.role}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════════════
// Main Page
// ════════════════════════════════════════════════════════════════════════════════

type Tab = "roles" | "permissions" | "users";

export default function AdminRolesPage() {
  const { isLoading } = useProtectedRoute({ requiredPermission: "roles.view" });

  const [tab, setTab]             = useState<Tab>("roles");
  const [toastMsg, setToastMsg]   = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [toastKey, setToastKey]   = useState(0);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToastMsg(msg);
    setToastType(type);
    setToastKey(k => k + 1);
  }, []);

  useEffect(() => {
    if (!toastMsg) return;
    const t = setTimeout(() => setToastMsg(""), 3500);
    return () => clearTimeout(t);
  }, [toastKey]);

  if (isLoading) return null;

  const tabs: { id: Tab; label: string }[] = [
    { id: "roles",       label: "إدارة الأدوار" },
    { id: "permissions", label: "الصلاحيات" },
    { id: "users",       label: "تعيين المستخدمين" },
  ];

  return (
    <div style={{ padding: "1.75rem 1.5rem 3rem", direction: "rtl" }}>
      {toastMsg && <Toast msg={toastMsg} type={toastType} key={toastKey} />}

      {/* Page header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
          الأدوار والصلاحيات
        </h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          إدارة أدوار النظام وصلاحياتها وتعيين المستخدمين
        </p>
      </div>

      {/* Tabs */}
      <div style={{
        display: "flex",
        gap: "0.25rem",
        borderBottom: "2px solid #e8ecf0",
        marginBottom: "1.25rem",
      }}>
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              padding: "0.6rem 1.25rem",
              fontSize: "0.83rem",
              fontWeight: tab === t.id ? 700 : 500,
              color: tab === t.id ? "#16a34a" : "#64748b",
              backgroundColor: "transparent",
              border: "none",
              borderBottom: tab === t.id ? "2px solid #16a34a" : "2px solid transparent",
              marginBottom: -2,
              cursor: "pointer",
              fontFamily: "inherit",
              transition: "color 0.15s",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {tab === "roles"       && <RolesTab       toast={showToast} />}
      {tab === "permissions" && <PermissionsTab  toast={showToast} />}
      {tab === "users"       && <AssignUsersTab  toast={showToast} />}
    </div>
  );
}
