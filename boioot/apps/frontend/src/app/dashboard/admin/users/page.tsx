"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import {
  adminApi,
  type AdminUsersParams,
} from "@/features/admin/api";
import {
  ADMIN_PAGE_SIZE,
  ROLE_LABELS,
  ROLE_BADGE,
} from "@/features/admin/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import { rbacApi, type RbacRole } from "@/features/admin/rbac/api";
import type { AdminUserResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "users.view" });

  const [users, setUsers]           = useState<AdminUserResponse[]>([]);
  const [roles, setRoles]           = useState<RbacRole[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");
  const [roleNotice, setRoleNotice]       = useState("");

  // Pending filter values (UI state — not yet applied)
  const [pendingRole, setPendingRole]         = useState("");
  const [pendingIsActive, setPendingIsActive] = useState("");

  // Applied filter params stored in ref so pagination can reuse them
  const appliedFiltersRef = useRef<AdminUsersParams>({});

  const load = useCallback(async (p: number, params: AdminUsersParams = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getUsers(p, ADMIN_PAGE_SIZE, params);
      setUsers(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setPage(p);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) {
      load(1, {});
      rbacApi.getRoles().then(setRoles).catch(() => {});
    }
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleSearch() {
    const params: AdminUsersParams = {};
    if (pendingRole)       params.role     = pendingRole;
    if (pendingIsActive !== "") params.isActive = pendingIsActive === "true";
    appliedFiltersRef.current = params;
    setActionError("");
    load(1, params);
  }

  function handleReset() {
    setPendingRole("");
    setPendingIsActive("");
    appliedFiltersRef.current = {};
    setActionError("");
    load(1, {});
  }

  async function handleToggleStatus(targetId: string, currentIsActive: boolean) {
    if (actionLoading) return;
    setActionLoading(targetId);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(targetId, !currentIsActive);
      setUsers(prev => prev.map(u => u.id === updated.id ? updated : u));
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRoleChange(userId: string, roleId: string, roleName: string) {
    setActionLoading(userId);
    setActionError("");
    try {
      await rbacApi.assignUserRole(userId, roleId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: roleName } : u));
      setRoleNotice(`تم تغيير الدور إلى "${ROLE_LABELS[roleName] ?? roleName}"`);
      setTimeout(() => setRoleNotice(""), 3000);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            إدارة المستخدمين
          </h1>
          {totalCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {totalCount} مستخدم
            </p>
          )}
        </div>

        {/* ── Filter bar ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 140 }}>
            <label className="form-label" style={{ margin: 0 }}>الدور</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingRole}
              onChange={e => setPendingRole(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="Admin">مدير النظام</option>
              <option value="CompanyOwner">مالك شركة</option>
              <option value="Agent">وكيل عقاري</option>
              <option value="User">مستخدم</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 140 }}>
            <label className="form-label" style={{ margin: 0 }}>الحالة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingIsActive}
              onChange={e => setPendingIsActive(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem" }} onClick={handleSearch}>
              بحث
            </button>
            <button className="btn" style={{ padding: "0.45rem 1rem" }} onClick={handleReset}>
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* ── Action error ── */}
        <InlineBanner message={actionError} />

        {/* ── Role change notice ── */}
        {roleNotice && (
          <div style={{
            marginBottom: "0.75rem",
            padding: "0.65rem 1rem",
            backgroundColor: "#f0fdf4",
            border: "1px solid #bbf7d0",
            borderRadius: 8,
            fontSize: "0.83rem",
            color: "#15803d",
            fontWeight: 600,
          }}>
            ✓ {roleNotice}
          </div>
        )}

        {/* ── Fetch error ── */}
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && <LoadingRow />}

        {/* ── Empty ── */}
        {!fetching && !fetchError && users.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا يوجد مستخدمون مطابقون لهذه المعايير.
            </p>
          </div>
        )}

        {/* ── Users list ── */}
        {!fetching && users.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {users.map(u => (
              <UserRow
                key={u.id}
                userData={u}
                isSelf={u.id === user.id}
                roles={roles}
                actionLoading={actionLoading}
                onToggle={handleToggleStatus}
                onRoleChange={handleRoleChange}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <AdminPagination
            page={page} totalPages={totalPages}
            onPrev={() => load(page - 1, appliedFiltersRef.current)}
            onNext={() => load(page + 1, appliedFiltersRef.current)}
          />
        )}

      </div>
    </div>
  );
}

// ─── User Row ─────────────────────────────────────────────────────────────────

function UserRow({
  userData: u,
  isSelf,
  roles,
  actionLoading,
  onToggle,
  onRoleChange,
}: {
  userData: AdminUserResponse;
  isSelf: boolean;
  roles: RbacRole[];
  actionLoading: string | null;
  onToggle: (id: string, current: boolean) => void;
  onRoleChange: (userId: string, roleId: string, roleName: string) => void;
}) {
  const [showRoleEdit, setShowRoleEdit] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const isThisLoading = actionLoading === u.id;

  function handleRoleSubmit() {
    if (!selectedRoleId) return;
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;
    onRoleChange(u.id, selectedRoleId, role.name);
    setShowRoleEdit(false);
    setSelectedRoleId("");
  }

  return (
    <div className="form-card" style={{ padding: "1rem 1.25rem" }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>

        {/* ── Info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "0.5rem", marginBottom: "0.45rem", flexWrap: "wrap",
          }}>
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
              {u.fullName}
            </p>
            <span className={ROLE_BADGE[u.role] ?? "badge badge-gray"}>
              {ROLE_LABELS[u.role] ?? u.role}
            </span>
            <span className={u.isActive ? "badge badge-green" : "badge badge-red"}>
              {u.isActive ? "نشط" : "غير نشط"}
            </span>
            {u.isDeleted && (
              <span className="badge badge-red">محذوف</span>
            )}
            {isSelf && (
              <span className="badge badge-gray">أنت</span>
            )}
          </div>

          <p style={{ margin: "0 0 0.2rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            {u.email}
          </p>
          {u.phone && (
            <p style={{ margin: "0 0 0.2rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {u.phone}
            </p>
          )}
          <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
            انضم في: {new Date(u.createdAt).toLocaleDateString("en-GB", {
              year: "numeric", month: "numeric", day: "numeric",
            })}
          </p>

          {/* ── Inline role editor ── */}
          {showRoleEdit && (
            <div style={{
              marginTop: "0.75rem",
              padding: "0.75rem",
              backgroundColor: "#f8fafc",
              border: "1px solid #e8ecf0",
              borderRadius: 8,
              display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap",
            }}>
              <select
                style={{
                  padding: "0.4rem 0.65rem",
                  fontSize: "0.82rem",
                  border: "1px solid #d1d5db",
                  borderRadius: 6,
                  fontFamily: "inherit",
                  direction: "rtl",
                  cursor: "pointer",
                  flex: 1,
                  minWidth: 180,
                }}
                value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
                disabled={isThisLoading}
              >
                <option value="">— اختر الدور الجديد —</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>
                    {ROLE_LABELS[r.name] ?? r.name}
                  </option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                onClick={handleRoleSubmit}
                disabled={!selectedRoleId || isThisLoading}
              >
                {isThisLoading ? "..." : "تأكيد"}
              </button>
              <button
                className="btn"
                style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem" }}
                onClick={() => { setShowRoleEdit(false); setSelectedRoleId(""); }}
                disabled={isThisLoading}
              >
                إلغاء
              </button>
            </div>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem", flexShrink: 0 }}>
          {/* Role change button */}
          {!isSelf && roles.length > 0 && (
            <button
              className="btn"
              style={{
                padding: "0.4rem 1rem", fontSize: "0.82rem",
                backgroundColor: showRoleEdit ? "#eef2ff" : undefined,
                color: showRoleEdit ? "#4f46e5" : undefined,
                borderColor: showRoleEdit ? "#c7d2fe" : undefined,
              }}
              disabled={isThisLoading}
              onClick={() => { setShowRoleEdit(v => !v); setSelectedRoleId(""); }}
            >
              تغيير الدور
            </button>
          )}
          {/* Status toggle button */}
          <button
            className={u.isActive ? "btn" : "btn btn-primary"}
            style={{
              padding: "0.4rem 1rem", fontSize: "0.85rem",
              ...(!u.isActive ? {} : {
                border: "1.5px solid var(--color-error)",
                backgroundColor: "transparent",
                color: "var(--color-error)",
              }),
            }}
            disabled={isThisLoading || !!actionLoading || isSelf}
            onClick={() => onToggle(u.id, u.isActive)}
            title={isSelf ? "لا يمكنك تعطيل حسابك الخاص" : undefined}
          >
            {isThisLoading ? "..." : u.isActive ? "تعطيل" : "تفعيل"}
          </button>
        </div>

      </div>
    </div>
  );
}

