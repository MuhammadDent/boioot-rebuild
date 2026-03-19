"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { normalizeError } from "@/lib/api";
import {
  rbacApi,
  MODULE_LABELS,
  PERMISSION_LABEL,
  type RbacRole,
  type RbacPermission,
} from "@/features/admin/rbac/api";
import type { AdminUserResponse } from "@/types";

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
// TAB 1 — Roles Management
// ════════════════════════════════════════════════════════════════════════════════

function RolesTab({ toast }: { toast: (m: string, t?: "ok" | "err") => void }) {
  const [roles, setRoles]         = useState<RbacRole[]>([]);
  const [loading, setLoading]     = useState(true);
  const [newName, setNewName]     = useState("");
  const [creating, setCreating]   = useState(false);
  const [editId, setEditId]       = useState<string | null>(null);
  const [editName, setEditName]   = useState("");
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);

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

  const handleCreate = async () => {
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const role = await rbacApi.createRole(newName.trim());
      setRoles(r => [...r, role].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      toast("تم إنشاء الدور بنجاح");
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

      {/* Create role */}
      <div style={{ ...card, display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <input
          style={{ ...inputStyle, maxWidth: 280 }}
          placeholder="اسم الدور الجديد"
          value={newName}
          onChange={e => setNewName(e.target.value)}
          onKeyDown={e => e.key === "Enter" && handleCreate()}
          disabled={creating}
        />
        <button
          style={btn()}
          onClick={handleCreate}
          disabled={creating || !newName.trim()}
        >
          {creating ? "..." : "+ إنشاء دور"}
        </button>
      </div>

      {/* Roles table */}
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
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                        <span style={{ fontWeight: 600, color: "#1e293b" }}>{role.name}</span>
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
                      <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center" }}>
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
