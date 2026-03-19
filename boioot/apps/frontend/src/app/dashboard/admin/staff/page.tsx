"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import {
  STAFF_ROLES,
  STAFF_ROLE_LABELS,
  STAFF_ROLE_BADGE_COLOR,
  STAFF_ROLE_BADGE_BG,
  isStaffRole,
  type StaffRole,
} from "@/lib/rbac";
import type { AdminUserResponse } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────
function Avatar({ name }: { name: string }) {
  return (
    <div style={{
      width: 36, height: 36, borderRadius: "50%",
      backgroundColor: "#2e7d32",
      display: "flex", alignItems: "center", justifyContent: "center",
      color: "#fff", fontSize: "0.85rem", fontWeight: 700, flexShrink: 0,
    }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  const label = isStaffRole(role) ? STAFF_ROLE_LABELS[role] : role;
  const color = isStaffRole(role) ? STAFF_ROLE_BADGE_COLOR[role] : "#6b7280";
  const bg    = isStaffRole(role) ? STAFF_ROLE_BADGE_BG[role]    : "#f9fafb";
  return (
    <span style={{
      backgroundColor: bg, color, fontSize: "0.72rem", fontWeight: 700,
      padding: "0.2rem 0.65rem", borderRadius: 20,
    }}>
      {label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: "0.3rem",
      fontSize: "0.72rem", fontWeight: 600,
      color: active ? "#166534" : "#991b1b",
      backgroundColor: active ? "#f0fdf4" : "#fef2f2",
      padding: "0.2rem 0.6rem", borderRadius: 20,
    }}>
      <span style={{
        width: 6, height: 6, borderRadius: "50%",
        backgroundColor: active ? "#22c55e" : "#dc2626",
        display: "inline-block",
      }} />
      {active ? "نشط" : "معطّل"}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function AdminStaffPage() {
  const { isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [allUsers, setAllUsers]         = useState<AdminUserResponse[]>([]);
  const [fetching, setFetching]         = useState(true);
  const [fetchError, setFetchError]     = useState("");
  const [search, setSearch]             = useState("");
  const [filterRole, setFilterRole]     = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  const loadStaff = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      // Fetch all pages to get all staff (staff count is typically small)
      const result = await adminApi.getUsers(1, 200, {});
      // Filter: show only users whose role is a StaffRole
      const staff = result.items.filter((u) => isStaffRole(u.role));
      setAllUsers(staff);
    } catch (err) {
      setFetchError(normalizeError(err));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    loadStaff();
  }, [loadStaff]);

  if (isLoading) return null;

  // Client-side filter
  const filtered = allUsers.filter((u) => {
    const q = search.trim().toLowerCase();
    const matchSearch = !q
      || u.fullName.toLowerCase().includes(q)
      || u.email.toLowerCase().includes(q);
    const matchRole = !filterRole || u.role === filterRole;
    const matchStatus =
      filterStatus === ""
        ? true
        : filterStatus === "active"
        ? u.isActive
        : !u.isActive;
    return matchSearch && matchRole && matchStatus;
  });

  return (
    <div style={{ padding: "1.75rem 1.5rem 3rem", direction: "rtl" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <h1 style={{ margin: "0 0 0.3rem", fontSize: "1.3rem", fontWeight: 700, color: "#1e293b" }}>
          إدارة الفريق الداخلي
        </h1>
        <p style={{ margin: 0, fontSize: "0.85rem", color: "#64748b" }}>
          موظفو النظام الداخليون المصنّفون بأدوار الإدارة — منفصلون عن مستخدمي المنصة
        </p>
      </div>

      {/* Info banner */}
      <div style={{
        backgroundColor: "#f0f9ff",
        border: "1px solid #bae6fd",
        borderRadius: 10,
        padding: "0.75rem 1rem",
        marginBottom: "1.25rem",
        fontSize: "0.82rem",
        color: "#0369a1",
        lineHeight: 1.6,
      }}>
        <strong>ملاحظة:</strong> في هذه المرحلة، الفريق الداخلي هم المستخدمون ذوو أدوار الإدارة.
        دعم تعيين الأدوار المتقدمة (AdminManager، ContentEditor...) سيُتاح في المرحلة القادمة.
      </div>

      {/* Filters */}
      <div style={{
        display: "flex", flexWrap: "wrap", gap: "0.75rem",
        marginBottom: "1.25rem", alignItems: "center",
      }}>
        <input
          type="search"
          placeholder="بحث بالاسم أو البريد..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{
            flex: "1 1 220px",
            padding: "0.55rem 0.85rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: "0.875rem",
            backgroundColor: "#fff",
            fontFamily: "inherit",
            outline: "none",
          }}
        />
        <select
          value={filterRole}
          onChange={(e) => setFilterRole(e.target.value)}
          style={{
            padding: "0.55rem 0.85rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: "0.875rem",
            backgroundColor: "#fff",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          <option value="">جميع الأدوار</option>
          {STAFF_ROLES.map((r) => (
            <option key={r} value={r}>{STAFF_ROLE_LABELS[r]}</option>
          ))}
        </select>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          style={{
            padding: "0.55rem 0.85rem",
            borderRadius: 8,
            border: "1px solid #d1d5db",
            fontSize: "0.875rem",
            backgroundColor: "#fff",
            fontFamily: "inherit",
            cursor: "pointer",
          }}
        >
          <option value="">جميع الحالات</option>
          <option value="active">نشط</option>
          <option value="inactive">معطّل</option>
        </select>
        <div style={{ fontSize: "0.8rem", color: "#94a3b8", marginRight: "auto" }}>
          {filtered.length} موظف
        </div>
      </div>

      {/* Error */}
      {fetchError && (
        <div style={{
          backgroundColor: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 8, padding: "0.75rem 1rem",
          marginBottom: "1rem", fontSize: "0.85rem", color: "#dc2626",
        }}>
          {fetchError}
        </div>
      )}

      {/* Table card */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 12,
        border: "1px solid #e8ecf0",
        overflow: "hidden",
        boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
      }}>
        {fetching ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8" }}>
            جاري التحميل…
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: "3rem", textAlign: "center", color: "#94a3b8", fontSize: "0.9rem" }}>
            {allUsers.length === 0
              ? "لا يوجد أعضاء فريق داخلي حتى الآن — الحساب الحالي (Admin) هو الأول."
              : "لا توجد نتائج مطابقة للبحث"}
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ backgroundColor: "#f8fafc", borderBottom: "1px solid #e8ecf0" }}>
                  <th style={thStyle}>الموظف</th>
                  <th style={thStyle}>البريد الإلكتروني</th>
                  <th style={thStyle}>الدور</th>
                  <th style={thStyle}>الحالة</th>
                  <th style={thStyle}>تاريخ الانضمام</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((u, idx) => (
                  <tr
                    key={u.id}
                    style={{
                      borderBottom: idx < filtered.length - 1 ? "1px solid #f1f5f9" : "none",
                    }}
                  >
                    <td style={tdStyle}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.7rem" }}>
                        <Avatar name={u.fullName} />
                        <div>
                          <div style={{ fontWeight: 600, color: "#1e293b" }}>{u.fullName}</div>
                          {u.phone && (
                            <div style={{ fontSize: "0.72rem", color: "#94a3b8", direction: "ltr" }}>
                              {u.phone}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td style={{ ...tdStyle, direction: "ltr", color: "#475569", fontSize: "0.82rem" }}>
                      {u.email}
                    </td>
                    <td style={tdStyle}>
                      <RoleBadge role={u.role} />
                    </td>
                    <td style={tdStyle}>
                      <StatusBadge active={u.isActive} />
                    </td>
                    <td style={{ ...tdStyle, color: "#94a3b8", fontSize: "0.8rem" }}>
                      {new Date(u.createdAt).toLocaleDateString("ar-SY", {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Roles reference */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "0.8rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.07em", margin: "0 0 1rem" }}>
          أدوار الفريق المتاحة
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "0.6rem",
        }}>
          {STAFF_ROLES.map((role: StaffRole) => (
            <div
              key={role}
              style={{
                padding: "0.75rem 1rem",
                backgroundColor: "#fff",
                border: "1px solid #e8ecf0",
                borderRadius: 10,
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
              }}
            >
              <span style={{
                width: 10, height: 10, borderRadius: "50%",
                backgroundColor: STAFF_ROLE_BADGE_COLOR[role],
                flexShrink: 0,
              }} />
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
                {STAFF_ROLE_LABELS[role]}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const thStyle: React.CSSProperties = {
  padding: "0.75rem 1rem",
  textAlign: "right",
  fontSize: "0.75rem",
  fontWeight: 700,
  color: "#64748b",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.85rem 1rem",
  verticalAlign: "middle",
};
