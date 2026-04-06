"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  PLATFORM_ROLE_NAMES,
  ROLE_LABELS,
  ROLE_BADGE,
  getRoleCategory,
  VERIFICATION_STATUS_LABELS,
  VERIFICATION_STATUS_BADGE,
  VERIFICATION_LEVEL_LABELS,
  IDENTITY_VERIFICATION_STATUS_LABELS,
  IDENTITY_VERIFICATION_STATUS_BADGE,
  BUSINESS_VERIFICATION_STATUS_LABELS,
  BUSINESS_VERIFICATION_STATUS_BADGE,
} from "@/features/admin/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import { rbacApi, type RbacRole } from "@/features/admin/rbac/api";
import type { AdminUserResponse, UserAnalyticsResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "users.view" });
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get("role") ?? "";

  // ── Data state ────────────────────────────────────────────────────────────
  const [users, setUsers]             = useState<AdminUserResponse[]>([]);
  const [roles, setRoles]             = useState<RbacRole[]>([]);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");

  const [analytics, setAnalytics]         = useState<UserAnalyticsResponse | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // ── Action state ──────────────────────────────────────────────────────────
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");
  const [actionNotice, setActionNotice]   = useState("");

  // ── Panels ────────────────────────────────────────────────────────────────
  const [viewUser, setViewUser]         = useState<AdminUserResponse | null>(null);
  const [editUser, setEditUser]         = useState<AdminUserResponse | null>(null);
  const [verifyUser, setVerifyUser]     = useState<AdminUserResponse | null>(null);
  const [showCreate, setShowCreate]     = useState(false);

  // ── Filters ───────────────────────────────────────────────────────────────
  const [activeRoleTab, setActiveRoleTab]         = useState(initialRole);
  const [pendingRole, setPendingRole]             = useState(initialRole);
  const [pendingIsActive, setPendingIsActive]     = useState("");
  const [pendingSearch, setPendingSearch]         = useState("");
  const [pendingCreatedAfter, setPendingCreatedAfter]   = useState("");
  const [pendingCreatedBefore, setPendingCreatedBefore] = useState("");
  const [pendingLastLogin, setPendingLastLogin]   = useState("");
  const [showFilters, setShowFilters]             = useState(true);

  const appliedFiltersRef = useRef<AdminUsersParams>({});

  // ── Load data ─────────────────────────────────────────────────────────────

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
      rbacApi.getRoles()
        .then(data => setRoles(data))
        .catch(() => {});
      adminApi.getUserAnalytics()
        .then(setAnalytics)
        .catch(() => {});
    }
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  const platformRoles = roles
    .filter(r => PLATFORM_ROLE_NAMES.has(r.name) && getRoleCategory(r.name) !== "admin")
    .sort((a, b) => {
      const order: Record<string, number> = { User: 0, Owner: 1, Broker: 2, Office: 3, Agent: 4, CompanyOwner: 5 };
      return (order[a.name] ?? 99) - (order[b.name] ?? 99);
    });

  // ── Filter handlers ───────────────────────────────────────────────────────

  function buildParams(): AdminUsersParams {
    const p: AdminUsersParams = {};
    if (pendingRole)            p.role          = pendingRole;
    if (pendingIsActive !== "") p.isActive       = pendingIsActive === "true";
    if (pendingSearch.trim())   p.search         = pendingSearch.trim();
    if (pendingCreatedAfter)    p.createdAfter   = pendingCreatedAfter;
    if (pendingCreatedBefore)   p.createdBefore  = pendingCreatedBefore;
    if (pendingLastLogin)       p.lastLoginAfter = pendingLastLogin;
    return p;
  }

  function handleSearch() {
    const params = buildParams();
    appliedFiltersRef.current = params;
    setActiveRoleTab(pendingRole);
    setActionError("");
    load(1, params);
  }

  function handleReset() {
    setPendingRole(""); setPendingIsActive(""); setPendingSearch("");
    setPendingCreatedAfter(""); setPendingCreatedBefore(""); setPendingLastLogin("");
    setActiveRoleTab("");
    appliedFiltersRef.current = {};
    setActionError("");
    load(1, {});
  }

  function handleRoleTabClick(role: string) {
    setActiveRoleTab(role);
    setPendingRole(role);
    const params: AdminUsersParams = { ...appliedFiltersRef.current, role: role || undefined };
    if (!role) delete params.role;
    appliedFiltersRef.current = params;
    setActionError("");
    load(1, params);
  }

  // ── Panel helpers ─────────────────────────────────────────────────────────

  function openView(u: AdminUserResponse) {
    setViewUser(u);
    setEditUser(null);
    setVerifyUser(null);
    setShowCreate(false);
  }

  function openEdit(u: AdminUserResponse) {
    setEditUser(u);
    setViewUser(null);
    setVerifyUser(null);
    setShowCreate(false);
  }

  function openVerify(u: AdminUserResponse) {
    setVerifyUser(u);
    setViewUser(null);
    setEditUser(null);
    setShowCreate(false);
  }

  // ── Action handlers ───────────────────────────────────────────────────────

  async function handleVerificationSave(
    userId: string,
    data: import("@/types").UpdateUserVerificationRequest,
  ) {
    if (actionLoading) return;
    setActionLoading(`verif-${userId}`);
    setActionError("");
    try {
      const updated = await adminApi.updateUserVerification(userId, data);
      const patch: Partial<AdminUserResponse> = {
        isVerified:                 updated.isVerified,
        verifiedAt:                 updated.verifiedAt,
        verifiedBy:                 updated.verifiedBy,
        verificationStatus:         updated.verificationStatus,
        verificationLevel:          updated.verificationLevel,
        phoneVerified:              updated.phoneVerified,
        emailVerified:              updated.emailVerified,
        identityVerificationStatus: updated.identityVerificationStatus,
        businessVerificationStatus: updated.businessVerificationStatus,
        verificationBadge:          updated.verificationBadge,
        verificationNotes:          updated.verificationNotes,
        rejectionReason:            updated.rejectionReason,
      };
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...patch } : u));
      setVerifyUser(prev => prev ? { ...prev, ...patch } : null);
      if (viewUser?.id === userId) setViewUser(prev => prev ? { ...prev, ...patch } : null);
      showNotice(`تم تحديث التوثيق لـ "${updated.fullName}" بنجاح`);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleToggleStatus(targetId: string, currentIsActive: boolean) {
    if (actionLoading) return;
    setActionLoading(`status-${targetId}`);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(targetId, !currentIsActive);
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, isActive: updated.isActive } : u));
      if (viewUser?.id === updated.id) setViewUser(prev => prev ? { ...prev, isActive: updated.isActive } : null);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleEditSave(
    userId: string,
    data: { fullName: string; email: string; phone: string; isActive: boolean; roleId: string; roleName: string },
    original: AdminUserResponse,
  ) {
    if (actionLoading) return;
    setActionLoading(`edit-${userId}`);
    setActionError("");
    try {
      let updated = await adminApi.updateAdminUser(userId, {
        fullName: data.fullName.trim() || undefined,
        email:    data.email.trim()    || undefined,
        phone:    data.phone.trim()    || undefined,
      });
      if (data.isActive !== original.isActive && userId !== user!.id) {
        const s = await adminApi.updateUserStatus(userId, data.isActive);
        updated = { ...updated, isActive: s.isActive };
      }
      if (data.roleId && data.roleName !== original.role && userId !== user!.id) {
        await rbacApi.assignUserRole(userId, data.roleId);
        updated = { ...updated, role: data.roleName };
      }
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, ...updated } : u));
      setEditUser(null);
      showNotice(`تم حفظ بيانات "${updated.fullName}" بنجاح`);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleCreateUser(data: {
    fullName: string; email: string; password: string; phone: string; role: string;
  }) {
    setActionLoading("create");
    setActionError("");
    try {
      const created = await adminApi.createUser(data);
      setUsers(prev => [created, ...prev]);
      setTotalCount(c => c + 1);
      setShowCreate(false);
      showNotice(`تم إنشاء المستخدم "${created.fullName}" بنجاح`);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  function showNotice(msg: string) {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(""), 4000);
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{
          marginBottom: "1.75rem",
          display: "flex", justifyContent: "space-between",
          alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem",
        }}>
          <div>
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
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            <button
              className="btn"
              style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
              onClick={() => setShowAnalytics(v => !v)}
            >
              {showAnalytics ? "إخفاء الإحصائيات" : "عرض الإحصائيات"}
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}
              onClick={() => { setShowCreate(v => !v); setViewUser(null); setEditUser(null); setActionError(""); }}
            >
              {showCreate ? "✕ إلغاء" : "+ إضافة مستخدم"}
            </button>
          </div>
        </div>

        {/* ── Create form ── */}
        {showCreate && (
          <UserCreateForm
            roles={platformRoles}
            actionLoading={actionLoading === "create"}
            onSave={handleCreateUser}
            onCancel={() => setShowCreate(false)}
          />
        )}

        {/* ── Edit panel ── */}
        {editUser && (
          <UserEditPanel
            userData={editUser}
            isSelf={editUser.id === user.id}
            roles={platformRoles}
            actionLoading={actionLoading}
            onSave={handleEditSave}
            onClose={() => setEditUser(null)}
          />
        )}

        {/* ── Verification panel ── */}
        {verifyUser && (
          <UserVerificationPanel
            userData={verifyUser}
            actionLoading={actionLoading}
            onSave={handleVerificationSave}
            onClose={() => setVerifyUser(null)}
          />
        )}

        {/* ── View panel ── */}
        {viewUser && (
          <UserDetailsPanel
            userData={viewUser}
            isSelf={viewUser.id === user.id}
            actionLoading={actionLoading}
            onToggleStatus={handleToggleStatus}
            onEdit={() => openEdit(viewUser)}
            onOpenVerify={() => openVerify(viewUser)}
            onViewProfile={() => router.push(`/dashboard/admin/users/${viewUser.id}`)}
            onClose={() => setViewUser(null)}
          />
        )}

        {/* ── Analytics ── */}
        {showAnalytics && analytics && (
          <div className="form-card" style={{ marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}>
              <StatPill label="الكل" value={analytics.totalUsers} />
              <StatPill label="نشط" value={analytics.activeUsers} color="#16a34a" />
              <StatPill label="غير نشط" value={analytics.inactiveUsers} color="#dc2626" />
              {Object.entries(analytics.byRole)
                .filter(([r]) => PLATFORM_ROLE_NAMES.has(r) && getRoleCategory(r) !== "admin")
                .map(([r, count]) => (
                  <StatPill key={r} label={ROLE_LABELS[r] ?? r} value={count} />
                ))}
            </div>
          </div>
        )}

        {/* ── Role tabs ── */}
        <div style={{
          display: "flex", gap: "0.35rem", flexWrap: "wrap",
          marginBottom: "1.25rem",
          borderBottom: "2px solid var(--color-border, #e2e8f0)",
          paddingBottom: 0,
        }}>
          {([
            { role: "",             label: "الكل",             count: analytics?.totalUsers },
            { role: "User",         label: "مستخدمون",         count: analytics?.byRole["User"] },
            { role: "Owner",        label: "ملاك عقار",        count: analytics?.byRole["Owner"] },
            { role: "Broker",       label: "وسطاء",            count: analytics?.byRole["Broker"] },
            { role: "Office",       label: "مكاتب عقارية",     count: analytics?.byRole["Office"] },
            { role: "CompanyOwner", label: "شركات تطوير",      count: analytics?.byRole["CompanyOwner"] },
            { role: "Agent",        label: "وكلاء",            count: analytics?.byRole["Agent"] },
          ] as const).map(tab => {
            const isActive = activeRoleTab === tab.role;
            return (
              <button
                key={tab.role || "all"}
                onClick={() => handleRoleTabClick(tab.role)}
                style={{
                  padding: "0.5rem 0.9rem",
                  fontSize: "0.82rem",
                  fontWeight: isActive ? 700 : 500,
                  background: "none",
                  border: "none",
                  borderBottom: isActive
                    ? "2px solid var(--color-primary, #16a34a)"
                    : "2px solid transparent",
                  marginBottom: "-2px",
                  cursor: "pointer",
                  color: isActive
                    ? "var(--color-primary, #16a34a)"
                    : "var(--color-text-secondary, #64748b)",
                  whiteSpace: "nowrap",
                }}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span style={{
                    marginRight: "0.35rem",
                    fontSize: "0.72rem",
                    color: isActive ? "var(--color-primary)" : "var(--color-text-secondary)",
                    opacity: 0.8,
                  }}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Filter bar ── */}
        <div className="form-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: showFilters ? "0.85rem" : 0 }}>
            <span style={{ fontSize: "0.85rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>الفلاتر</span>
            <button
              className="btn"
              style={{ padding: "0.25rem 0.65rem", fontSize: "0.78rem" }}
              onClick={() => setShowFilters(v => !v)}
            >
              {showFilters ? "إخفاء" : "عرض"}
            </button>
          </div>

          {showFilters && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 180px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>بحث بالاسم أو البريد</label>
                <input
                  className="form-input"
                  style={{ padding: "0.45rem 0.75rem" }}
                  placeholder="اسم أو بريد..."
                  value={pendingSearch}
                  onChange={e => setPendingSearch(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleSearch()}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 140px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>الحالة</label>
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

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 140px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>الدور</label>
                <select
                  className="form-input"
                  style={{ padding: "0.45rem 0.75rem" }}
                  value={pendingRole}
                  onChange={e => setPendingRole(e.target.value)}
                >
                  <option value="">الكل</option>
                  {platformRoles.map(r => (
                    <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 140px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>تسجيل بعد</label>
                <input
                  className="form-input"
                  type="date"
                  style={{ padding: "0.45rem 0.75rem" }}
                  value={pendingCreatedAfter}
                  onChange={e => setPendingCreatedAfter(e.target.value)}
                />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", flex: "1 1 140px" }}>
                <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>تسجيل قبل</label>
                <input
                  className="form-input"
                  type="date"
                  style={{ padding: "0.45rem 0.75rem" }}
                  value={pendingCreatedBefore}
                  onChange={e => setPendingCreatedBefore(e.target.value)}
                />
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
          )}
        </div>

        {/* ── Errors / Notices ── */}
        {actionNotice && (
          <div style={{
            marginBottom: "1rem", padding: "0.65rem 1rem",
            background: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: "0.5rem", color: "#16a34a", fontSize: "0.88rem",
          }}>
            ✓ {actionNotice}
          </div>
        )}
        <InlineBanner message={actionError} />
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
                actionLoading={actionLoading}
                activeId={viewUser?.id ?? editUser?.id ?? verifyUser?.id ?? null}
                onOpenVerify={() => openVerify(u)}
                onView={() => openView(u)}
                onEdit={() => openEdit(u)}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <AdminPagination
            page={page}
            totalPages={totalPages}
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
  actionLoading,
  activeId,
  onOpenVerify,
  onView,
  onEdit,
}: {
  userData: AdminUserResponse;
  isSelf: boolean;
  actionLoading: string | null;
  activeId: string | null;
  onOpenVerify: () => void;
  onView: () => void;
  onEdit: () => void;
}) {
  const isActive = activeId === u.id;
  const badgeClass = ROLE_BADGE[u.role] ?? "badge badge-gray";
  const badgeLabel = ROLE_LABELS[u.role] ?? u.role;
  const vsBadge = VERIFICATION_STATUS_BADGE[u.verificationStatus ?? "None"] ?? "badge badge-gray";
  const vsLabel = VERIFICATION_STATUS_LABELS[u.verificationStatus ?? "None"] ?? "غير محدد";

  return (
    <div className="form-card" style={{
      padding: "1rem 1.25rem",
      border: isActive ? "2px solid var(--color-primary)" : undefined,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>

        {/* ── Info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap",
          }}>
            {u.profileImageUrl && (
              <img
                src={u.profileImageUrl} alt={u.fullName}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
              {u.fullName}
              {isSelf && (
                <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", fontWeight: 400, marginRight: "0.4rem" }}>
                  (أنت)
                </span>
              )}
            </p>
            <span className={badgeClass}>{badgeLabel}</span>
            <span className={vsBadge}>{vsLabel}</span>
            {u.verificationLevel > 0 && (
              <span className="badge badge-gray" style={{ fontSize: "0.72rem" }}>
                مستوى {VERIFICATION_LEVEL_LABELS[u.verificationLevel] ?? u.verificationLevel}
              </span>
            )}
            {!u.isActive && <span className="badge badge-red">معطَّل</span>}
            {u.isDeleted && <span className="badge badge-red">محذوف</span>}
          </div>

          {u.email && (
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }} dir="ltr">
              ✉️ {u.email}
            </p>
          )}
          {u.phone && (
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }} dir="ltr">
              📞 {u.phone}
            </p>
          )}
          {u.lastLoginAt && (
            <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              آخر دخول: {new Date(u.lastLoginAt).toLocaleDateString("ar-SY")}
            </p>
          )}
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
          <button
            className="btn"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
            onClick={onView}
          >
            تفاصيل
          </button>
          <button
            className="btn"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
            onClick={onEdit}
          >
            تعديل
          </button>
          <button
            className="btn btn-primary"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
            onClick={onOpenVerify}
          >
            التوثيق
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── User Details Panel ───────────────────────────────────────────────────────

function UserDetailsPanel({
  userData: u,
  isSelf,
  actionLoading,
  onToggleStatus,
  onEdit,
  onOpenVerify,
  onViewProfile,
  onClose,
}: {
  userData: AdminUserResponse;
  isSelf: boolean;
  actionLoading: string | null;
  onToggleStatus: (id: string, current: boolean) => void;
  onEdit: () => void;
  onOpenVerify: () => void;
  onViewProfile: () => void;
  onClose: () => void;
}) {
  const isStatusLoading = actionLoading === `status-${u.id}`;
  const badgeClass = ROLE_BADGE[u.role] ?? "badge badge-gray";
  const badgeLabel = ROLE_LABELS[u.role] ?? u.role;
  const vsBadge = VERIFICATION_STATUS_BADGE[u.verificationStatus ?? "None"] ?? "badge badge-gray";
  const vsLabel = VERIFICATION_STATUS_LABELS[u.verificationStatus ?? "None"] ?? "غير محدد";

  return (
    <div className="form-card" style={{
      marginBottom: "1.25rem",
      border: "2px solid var(--color-primary)",
      padding: "1.5rem",
    }}>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {u.profileImageUrl && (
            <img
              src={u.profileImageUrl} alt={u.fullName}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
            />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {u.fullName}
              {isSelf && <span style={{ fontSize: "0.78rem", fontWeight: 400, color: "var(--color-text-secondary)", marginRight: "0.5rem" }}>(أنت)</span>}
            </h2>
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.3rem", flexWrap: "wrap" }}>
              <span className={badgeClass}>{badgeLabel}</span>
              <span className={vsBadge}>{vsLabel}</span>
              {u.verificationLevel > 0 && (
                <span className="badge badge-gray" style={{ fontSize: "0.72rem" }}>
                  مستوى {VERIFICATION_LEVEL_LABELS[u.verificationLevel] ?? u.verificationLevel}
                </span>
              )}
              {!u.isActive && <span className="badge badge-red">معطَّل</span>}
              {u.isDeleted && <span className="badge badge-red">محذوف</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <DetailField label="البريد الإلكتروني" value={u.email} dir="ltr" />
        <DetailField label="الهاتف" value={u.phone} dir="ltr" />
        <DetailField label="الحالة" value={u.isActive ? "نشط" : "معطَّل"} />
        {u.lastLoginAt && (
          <DetailField label="آخر دخول" value={new Date(u.lastLoginAt).toLocaleDateString("ar-SY")} />
        )}
        <DetailField label="تاريخ التسجيل" value={new Date(u.createdAt).toLocaleDateString("ar-SY")} />
        {u.listingCount !== undefined && (
          <DetailField label="العقارات" value={String(u.listingCount)} />
        )}
        {u.isVerified && u.verifiedAt && (
          <DetailField label="تاريخ التوثيق" value={new Date(u.verifiedAt).toLocaleDateString("ar-SY")} />
        )}
        {u.planName && (
          <DetailField label="الخطة" value={u.planName} />
        )}
      </div>

      {/* actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }}
          onClick={onEdit}
        >
          تعديل البيانات
        </button>
        <button
          className="btn btn-primary"
          style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }}
          onClick={onOpenVerify}
        >
          إدارة التوثيق
        </button>
        {!isSelf && (
          <button
            className="btn"
            style={{
              padding: "0.45rem 1.1rem", fontSize: "0.88rem",
              ...(u.isActive ? {
                backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c",
              } : {}),
            }}
            disabled={isStatusLoading || !!actionLoading}
            onClick={() => onToggleStatus(u.id, u.isActive)}
          >
            {isStatusLoading ? "..." : u.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
          </button>
        )}
        <button
          className="btn"
          style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }}
          onClick={onViewProfile}
        >
          الملف الكامل ←
        </button>
      </div>

    </div>
  );
}

// ─── User Edit Panel ──────────────────────────────────────────────────────────

function UserEditPanel({
  userData: u,
  isSelf,
  roles,
  actionLoading,
  onSave,
  onClose,
}: {
  userData: AdminUserResponse;
  isSelf: boolean;
  roles: RbacRole[];
  actionLoading: string | null;
  onSave: (
    userId: string,
    data: { fullName: string; email: string; phone: string; isActive: boolean; roleId: string; roleName: string },
    original: AdminUserResponse,
  ) => void;
  onClose: () => void;
}) {
  const [fullName, setFullName]   = useState(u.fullName);
  const [email, setEmail]         = useState(u.email);
  const [phone, setPhone]         = useState(u.phone ?? "");
  const [isActive, setIsActive]   = useState(u.isActive);
  const [roleId, setRoleId]       = useState(() => roles.find(r => r.name === u.role)?.id ?? "");

  const isSaving = actionLoading === `edit-${u.id}`;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    const selectedRole = roles.find(r => r.id === roleId);
    onSave(u.id, {
      fullName,
      email,
      phone,
      isActive,
      roleId,
      roleName: selectedRole?.name ?? u.role,
    }, u);
  }

  return (
    <div className="form-card" style={{
      marginBottom: "1.25rem",
      border: "2px solid var(--color-primary)",
      padding: "1.5rem",
    }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          تعديل: {u.fullName}
        </h2>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>

          <FormField label="الاسم الكامل *">
            <input
              className="form-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="الاسم الكامل"
              required
              disabled={isSaving}
            />
          </FormField>

          <FormField label="البريد الإلكتروني *">
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
              required
              disabled={isSaving}
            />
          </FormField>

          <FormField label="رقم الهاتف">
            <input
              className="form-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+963..."
              dir="ltr"
              disabled={isSaving}
            />
          </FormField>

          <FormField label={isSelf ? "نوع الحساب (لا يمكن تعديله)" : "نوع الحساب"}>
            <select
              className="form-input"
              value={roleId}
              onChange={e => setRoleId(e.target.value)}
              disabled={isSaving || isSelf}
            >
              <option value="">اختر النوع...</option>
              {roles.map(r => (
                <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</option>
              ))}
            </select>
          </FormField>

        </div>

        {/* Active checkbox */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
          <input
            type="checkbox"
            id={`edit-active-${u.id}`}
            checked={isActive}
            onChange={e => setIsActive(e.target.checked)}
            disabled={isSaving || isSelf}
            style={{ width: 16, height: 16, cursor: isSelf ? "not-allowed" : "pointer" }}
          />
          <label
            htmlFor={`edit-active-${u.id}`}
            style={{ fontSize: "0.88rem", cursor: isSelf ? "not-allowed" : "pointer" }}
          >
            الحساب نشط
            {isSelf && <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginRight: "0.4rem" }}>(لا يمكن تعديل حسابك الخاص)</span>}
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.45rem 1.25rem", fontSize: "0.88rem" }}
            disabled={isSaving}
          >
            {isSaving ? "جارٍ الحفظ..." : "حفظ التعديلات"}
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: "0.45rem 1rem", fontSize: "0.88rem" }}
            onClick={onClose}
            disabled={isSaving}
          >
            إلغاء
          </button>
        </div>
      </form>

    </div>
  );
}

// ─── User Create Form ─────────────────────────────────────────────────────────

function UserCreateForm({
  roles,
  actionLoading,
  onSave,
  onCancel,
}: {
  roles: RbacRole[];
  actionLoading: boolean;
  onSave: (data: { fullName: string; email: string; password: string; phone: string; role: string }) => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName]     = useState("");
  const [email, setEmail]           = useState("");
  const [password, setPassword]     = useState("");
  const [phone, setPhone]           = useState("");
  const [role, setRole]             = useState("User");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (actionLoading) return;
    onSave({ fullName: fullName.trim(), email: email.trim(), password, phone: phone.trim(), role });
  }

  return (
    <div className="form-card" style={{
      marginBottom: "1.25rem",
      border: "2px solid var(--color-primary)",
      padding: "1.5rem",
    }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          إضافة مستخدم جديد
        </h2>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>

          <FormField label="الاسم الكامل *">
            <input
              className="form-input"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="الاسم الكامل"
              required
              disabled={actionLoading}
            />
          </FormField>

          <FormField label="البريد الإلكتروني *">
            <input
              className="form-input"
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="email@example.com"
              dir="ltr"
              required
              disabled={actionLoading}
            />
          </FormField>

          <FormField label="كلمة المرور *">
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="كلمة المرور"
              dir="ltr"
              required
              disabled={actionLoading}
            />
          </FormField>

          <FormField label="الهاتف">
            <input
              className="form-input"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+963..."
              dir="ltr"
              disabled={actionLoading}
            />
          </FormField>

          <FormField label="نوع الحساب">
            <select
              className="form-input"
              value={role}
              onChange={e => setRole(e.target.value)}
              disabled={actionLoading}
            >
              {roles.map(r => (
                <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>
              ))}
            </select>
          </FormField>

        </div>

        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.45rem 1.25rem", fontSize: "0.88rem" }}
            disabled={actionLoading}
          >
            {actionLoading ? "جارٍ الإنشاء..." : "إنشاء الحساب"}
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: "0.45rem 1rem", fontSize: "0.88rem" }}
            onClick={onCancel}
            disabled={actionLoading}
          >
            إلغاء
          </button>
        </div>
      </form>

    </div>
  );
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function DetailField({ label, value, dir }: { label: string; value?: string | null; dir?: "ltr" | "rtl" }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ margin: "0 0 0.2rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)" }} dir={dir}>
        {value}
      </p>
    </div>
  );
}

function FormField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
      <label style={{ fontSize: "0.82rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
        {label}
      </label>
      {children}
    </div>
  );
}

function StatPill({ label, value, color }: { label: string; value?: number; color?: string }) {
  if (value === undefined) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", minWidth: 52 }}>
      <span style={{ fontSize: "1.25rem", fontWeight: 700, color: color ?? "var(--color-text-primary)" }}>
        {value.toLocaleString("ar")}
      </span>
      <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", marginTop: "0.1rem" }}>
        {label}
      </span>
    </div>
  );
}

// ─── User Verification Panel ──────────────────────────────────────────────────

function UserVerificationPanel({
  userData: u,
  actionLoading,
  onSave,
  onClose,
}: {
  userData: AdminUserResponse;
  actionLoading: string | null;
  onSave: (userId: string, data: import("@/types").UpdateUserVerificationRequest) => void;
  onClose: () => void;
}) {
  const isSaving = actionLoading === `verif-${u.id}`;

  const [verificationStatus,         setVerificationStatus]         = useState(u.verificationStatus ?? "None");
  const [verificationLevel,          setVerificationLevel]          = useState(String(u.verificationLevel ?? 0));
  const [phoneVerified,              setPhoneVerified]              = useState(u.phoneVerified ?? false);
  const [emailVerified,              setEmailVerified]              = useState(u.emailVerified ?? false);
  const [identityVerificationStatus, setIdentityVerificationStatus] = useState(u.identityVerificationStatus ?? "None");
  const [businessVerificationStatus, setBusinessVerificationStatus] = useState(u.businessVerificationStatus ?? "None");
  const [verificationBadge,          setVerificationBadge]          = useState(u.verificationBadge ?? "");
  const [verificationNotes,          setVerificationNotes]          = useState(u.verificationNotes ?? "");
  const [rejectionReason,            setRejectionReason]            = useState(u.rejectionReason ?? "");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isSaving) return;
    onSave(u.id, {
      verificationStatus,
      verificationLevel:          Number(verificationLevel),
      phoneVerified,
      emailVerified,
      identityVerificationStatus,
      businessVerificationStatus,
      verificationBadge:  verificationBadge.trim()  || undefined,
      verificationNotes:  verificationNotes.trim()  || undefined,
      rejectionReason:    rejectionReason.trim()    || undefined,
    });
  }

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.88rem",
    borderRadius: 6, border: "1.5px solid var(--color-border)",
    backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-primary)",
    appearance: "none", cursor: "pointer",
  };

  return (
    <div className="form-card" style={{
      marginBottom: "1.25rem",
      border: "2px solid var(--color-primary)",
      padding: "1.5rem",
    }}>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <div>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
            إدارة التوثيق — {u.fullName}
          </h2>
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
            {ROLE_LABELS[u.role] ?? u.role} · {u.email}
          </p>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>

          {/* Verification Status */}
          <FormField label="حالة التوثيق">
            <select
              style={selectStyle}
              value={verificationStatus}
              onChange={e => setVerificationStatus(e.target.value)}
              disabled={isSaving}
            >
              {Object.entries(VERIFICATION_STATUS_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </FormField>

          {/* Verification Level */}
          <FormField label="مستوى التوثيق">
            <select
              style={selectStyle}
              value={verificationLevel}
              onChange={e => setVerificationLevel(e.target.value)}
              disabled={isSaving}
            >
              {Object.entries(VERIFICATION_LEVEL_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </FormField>

          {/* Identity Verification Status */}
          <FormField label="حالة توثيق الهوية">
            <select
              style={selectStyle}
              value={identityVerificationStatus}
              onChange={e => setIdentityVerificationStatus(e.target.value)}
              disabled={isSaving}
            >
              {Object.entries(IDENTITY_VERIFICATION_STATUS_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </FormField>

          {/* Business Verification Status */}
          <FormField label="حالة توثيق النشاط التجاري">
            <select
              style={selectStyle}
              value={businessVerificationStatus}
              onChange={e => setBusinessVerificationStatus(e.target.value)}
              disabled={isSaving}
            >
              {Object.entries(BUSINESS_VERIFICATION_STATUS_LABELS).map(([val, lbl]) => (
                <option key={val} value={val}>{lbl}</option>
              ))}
            </select>
          </FormField>

          {/* Verification Badge */}
          <FormField label="شارة التوثيق (نص)">
            <input
              className="form-input"
              value={verificationBadge}
              onChange={e => setVerificationBadge(e.target.value)}
              placeholder="مثال: وسيط موثوق"
              disabled={isSaving}
            />
          </FormField>

          {/* Checkboxes */}
          <FormField label="التحقق من الاتصال">
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem", paddingTop: "0.3rem" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={phoneVerified}
                  onChange={e => setPhoneVerified(e.target.checked)}
                  disabled={isSaving}
                />
                الهاتف موثَّق
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.88rem", cursor: "pointer" }}>
                <input
                  type="checkbox"
                  checked={emailVerified}
                  onChange={e => setEmailVerified(e.target.checked)}
                  disabled={isSaving}
                />
                البريد موثَّق
              </label>
            </div>
          </FormField>

        </div>

        {/* Notes & Rejection Reason */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1.25rem" }}>
          <FormField label="ملاحظات داخلية (للمشرفين)">
            <textarea
              className="form-input"
              value={verificationNotes}
              onChange={e => setVerificationNotes(e.target.value)}
              placeholder="ملاحظات داخلية..."
              rows={3}
              disabled={isSaving}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </FormField>
          <FormField label="سبب الرفض (إن وُجد)">
            <textarea
              className="form-input"
              value={rejectionReason}
              onChange={e => setRejectionReason(e.target.value)}
              placeholder="سبب رفض التوثيق..."
              rows={3}
              disabled={isSaving}
              style={{ resize: "vertical", fontFamily: "inherit" }}
            />
          </FormField>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="submit"
            className="btn btn-primary"
            style={{ padding: "0.45rem 1.2rem", fontSize: "0.88rem" }}
            disabled={isSaving}
          >
            {isSaving ? "جارٍ الحفظ..." : "حفظ التوثيق"}
          </button>
          <button
            type="button"
            className="btn"
            style={{ padding: "0.45rem 1rem", fontSize: "0.88rem" }}
            onClick={onClose}
            disabled={isSaving}
          >
            إلغاء
          </button>
        </div>

      </form>

    </div>
  );
}
