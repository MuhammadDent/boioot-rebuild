"use client";

import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_BADGE_COLOR,
  PERMISSION_GROUPS,
  ROLE_PERMISSIONS,
  PERMISSION_LABELS,
  type StaffRole,
  type Permission,
} from "@/lib/rbac";

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminRolesPage() {
  const { isLoading } = useProtectedRoute({ requiredPermission: "roles.view" });

  if (isLoading) return null;

  return (
    <div style={{ padding: "1.75rem 1.5rem 3rem", direction: "rtl" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
          الأدوار والصلاحيات
        </h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          مصفوفة صلاحيات الأدوار الداخلية — قابلة للتوسع في المراحل القادمة
        </p>
      </div>

      {/* Roles overview cards */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "0.85rem",
        marginBottom: "2rem",
      }}>
        {STAFF_ROLES.map((role: StaffRole) => {
          const perms = ROLE_PERMISSIONS[role];
          return (
            <div
              key={role}
              style={{
                backgroundColor: "#fff",
                border: "1px solid #e8ecf0",
                borderRadius: 12,
                padding: "1rem 1.1rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", marginBottom: "0.6rem" }}>
                <span style={{
                  width: 10, height: 10, borderRadius: "50%",
                  backgroundColor: STAFF_ROLE_BADGE_COLOR[role],
                  flexShrink: 0,
                }} />
                <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>
                  {STAFF_ROLE_LABELS[role]}
                </span>
              </div>
              <div style={{ fontSize: "0.75rem", color: "#64748b", marginBottom: "0.5rem" }}>
                {role === "Admin"
                  ? "صلاحية كاملة على جميع أقسام النظام"
                  : `${perms.length} صلاحية من أصل ${Object.keys(PERMISSION_LABELS).length}`}
              </div>
              <div style={{
                height: 4, borderRadius: 4,
                backgroundColor: "#f1f5f9",
                overflow: "hidden",
              }}>
                <div style={{
                  height: "100%",
                  width: `${Math.round((perms.length / Object.keys(PERMISSION_LABELS).length) * 100)}%`,
                  backgroundColor: STAFF_ROLE_BADGE_COLOR[role],
                  borderRadius: 4,
                }} />
              </div>
            </div>
          );
        })}
      </div>

      {/* Permissions matrix */}
      <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem" }}>
        مصفوفة الصلاحيات
      </h2>

      <div style={{
        backgroundColor: "#fff",
        border: "1px solid #e8ecf0",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        overflowX: "auto",
      }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem" }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc", borderBottom: "2px solid #e8ecf0" }}>
              <th style={{
                padding: "0.75rem 1rem",
                textAlign: "right",
                fontWeight: 700,
                color: "#374151",
                fontSize: "0.78rem",
                minWidth: 160,
                position: "sticky",
                right: 0,
                backgroundColor: "#f8fafc",
                zIndex: 1,
                boxShadow: "-2px 0 6px rgba(0,0,0,0.04)",
              }}>
                الصلاحية
              </th>
              {STAFF_ROLES.map((role) => (
                <th
                  key={role}
                  style={{
                    padding: "0.6rem 0.5rem",
                    textAlign: "center",
                    fontWeight: 700,
                    color: STAFF_ROLE_BADGE_COLOR[role],
                    fontSize: "0.72rem",
                    minWidth: 100,
                    whiteSpace: "nowrap",
                  }}
                >
                  {STAFF_ROLE_LABELS[role]}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PERMISSION_GROUPS.map((group) => (
              <>
                {/* Group header row */}
                <tr key={`group-${group.label}`} style={{ backgroundColor: "#f8fafc" }}>
                  <td
                    colSpan={STAFF_ROLES.length + 1}
                    style={{
                      padding: "0.5rem 1rem",
                      fontSize: "0.72rem",
                      fontWeight: 700,
                      color: "#6b7280",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      borderBottom: "1px solid #e8ecf0",
                      borderTop: "1px solid #e8ecf0",
                    }}
                  >
                    {group.label}
                  </td>
                </tr>
                {/* Permission rows */}
                {group.permissions.map((perm: Permission, idx) => (
                  <tr
                    key={perm}
                    style={{
                      borderBottom: "1px solid #f1f5f9",
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#fafbfc",
                    }}
                  >
                    <td style={{
                      padding: "0.6rem 1rem",
                      color: "#374151",
                      fontWeight: 500,
                      position: "sticky",
                      right: 0,
                      backgroundColor: idx % 2 === 0 ? "#fff" : "#fafbfc",
                      boxShadow: "-2px 0 6px rgba(0,0,0,0.04)",
                    }}>
                      <span style={{
                        display: "inline-block",
                        backgroundColor: "#f1f5f9",
                        color: "#475569",
                        fontSize: "0.7rem",
                        fontFamily: "monospace",
                        padding: "0.1rem 0.5rem",
                        borderRadius: 4,
                        marginLeft: "0.5rem",
                      }}>
                        {perm}
                      </span>
                      <span style={{ color: "#64748b" }}>{PERMISSION_LABELS[perm]}</span>
                    </td>
                    {STAFF_ROLES.map((role: StaffRole) => {
                      const has = ROLE_PERMISSIONS[role].includes(perm);
                      return (
                        <td key={role} style={{ padding: "0.6rem 0.5rem", textAlign: "center" }}>
                          {has ? (
                            <span style={{
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                              width: 22,
                              height: 22,
                              borderRadius: "50%",
                              backgroundColor: "#dcfce7",
                              color: "#16a34a",
                            }}>
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                <polyline points="20 6 9 17 4 12" />
                              </svg>
                            </span>
                          ) : (
                            <span style={{ color: "#e2e8f0", fontSize: "1rem", lineHeight: 1 }}>—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Architecture note */}
      <div style={{
        marginTop: "1.5rem",
        padding: "1rem 1.25rem",
        backgroundColor: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: 12,
        fontSize: "0.82rem",
        color: "#92400e",
        lineHeight: 1.7,
      }}>
        <strong>الخطوات القادمة:</strong> في المرحلة التالية، ستُضاف إمكانية إنشاء موظفين داخليين وتعيين أدوارهم مباشرة من هذه الواجهة، مع ربط كامل بـ API الخلفية لإدارة الصلاحيات ديناميكياً.
      </div>
    </div>
  );
}
