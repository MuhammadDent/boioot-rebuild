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
  DIRECT_CUSTOMER_ROLES,
  SUBORDINATE_ROLES,
  ROLE_LABELS,
  ROLE_BADGE,
  getRoleCategory,
} from "@/features/admin/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import { rbacApi, type RbacRole } from "@/features/admin/rbac/api";
import type { AdminUserResponse, UserAnalyticsResponse } from "@/types";

// ─── Saved Segments (localStorage) ─────────────────────────────────────────

const SEGMENTS_KEY = "boioot_admin_user_segments";

interface SavedSegment {
  name: string;
  filters: AdminUsersParams;
}

function loadSegments(): SavedSegment[] {
  try {
    return JSON.parse(localStorage.getItem(SEGMENTS_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function saveSegments(segs: SavedSegment[]) {
  localStorage.setItem(SEGMENTS_KEY, JSON.stringify(segs));
}

// ─── CSV Export Helper ───────────────────────────────────────────────────────

function exportToCsv(users: AdminUserResponse[]) {
  const header = ["الاسم", "البريد الإلكتروني", "الهاتف", "الدور", "الحالة", "الخطة", "المقاطع", "آخر دخول", "تاريخ الإنشاء"];
  const rows = users.map(u => [
    u.fullName,
    u.email,
    u.phone ?? "",
    ROLE_LABELS[u.role] ?? u.role,
    u.isActive ? "نشط" : "غير نشط",
    u.planName ?? "مجاني",
    u.listingCount,
    u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString("ar-SY") : "—",
    new Date(u.createdAt).toLocaleDateString("ar-SY"),
  ]);
  const csv = [header, ...rows]
    .map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href = url;
  a.download = `users-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "users.view" });
  const router = useRouter();
  const searchParams = useSearchParams();

  // Read initial role from URL query (?role=Broker etc.)
  const initialRole = searchParams.get("role") ?? "";

  const [users, setUsers]             = useState<AdminUserResponse[]>([]);
  const [roles, setRoles]             = useState<RbacRole[]>([]);
  const [rolesLoading, setRolesLoading] = useState(true);
  const [page, setPage]               = useState(1);
  const [totalPages, setTotalPages]   = useState(1);
  const [totalCount, setTotalCount]   = useState(0);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");

  // Analytics
  const [analytics, setAnalytics]   = useState<UserAnalyticsResponse | null>(null);
  const [showAnalytics, setShowAnalytics] = useState(true);

  // Action state
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");
  const [actionNotice, setActionNotice]   = useState("");

  // Role quick-filter tabs
  const [activeRoleTab, setActiveRoleTab] = useState(initialRole);

  // Filters (pending = UI, applied = last search)
  const [pendingRole, setPendingRole]           = useState(initialRole);
  const [pendingIsActive, setPendingIsActive]   = useState("");
  const [pendingSearch, setPendingSearch]       = useState("");
  const [pendingCreatedAfter, setPendingCreatedAfter]   = useState("");
  const [pendingCreatedBefore, setPendingCreatedBefore] = useState("");
  const [pendingLastLogin, setPendingLastLogin] = useState("");
  const [pendingTag, setPendingTag]             = useState("");
  const [showFilters, setShowFilters]           = useState(true);

  const appliedFiltersRef = useRef<AdminUsersParams>({});

  // Segments
  const [segments, setSegments]   = useState<SavedSegment[]>([]);
  const [segmentName, setSegmentName] = useState("");
  const [showSaveSegment, setShowSaveSegment] = useState(false);

  // All tags (for filter dropdown)
  const [allTags, setAllTags] = useState<string[]>([]);

  // Bulk selection
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);

  // Create user panel
  const [showCreate, setShowCreate]         = useState(false);
  const [createFullName, setCreateFullName] = useState("");
  const [createEmail, setCreateEmail]       = useState("");
  const [createPassword, setCreatePassword] = useState("");
  const [createPhone, setCreatePhone]       = useState("");
  const [createRole, setCreateRole]         = useState("User");
  const [createLoading, setCreateLoading]   = useState(false);
  const [createError, setCreateError]       = useState("");

  // ── Data loading ──────────────────────────────────────────────────────────

  const load = useCallback(async (p: number, params: AdminUsersParams = {}) => {
    setFetching(true);
    setFetchError("");
    setSelected(new Set());
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
        .then(data => {
          console.log("[AdminUsers] roles fetched from API:", data.map(r => r.name));
          console.log("[AdminUsers] platform roles (filtered):", data.filter(r => PLATFORM_ROLE_NAMES.has(r.name)).map(r => r.name));
          setRoles(data);
        })
        .catch(() => {})
        .finally(() => setRolesLoading(false));
      adminApi.getUserAnalytics()
        .then(data => {
          console.log("[AdminUsers] analytics byRole:", data.byRole);
          setAnalytics(data);
        })
        .catch(() => {});
      adminApi.getAllTags()
        .then(setAllTags)
        .catch(() => {});
      setSegments(loadSegments());
    }
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  // ── Role groups ───────────────────────────────────────────────────────────

  // Customer roles only — Admin/staff never appear on this page.
  // Internal accounts are managed in Team Management and Roles sections.
  const platformRoles = roles
    .filter(r => PLATFORM_ROLE_NAMES.has(r.name) && getRoleCategory(r.name) !== "admin")
    .sort((a, b) => {
      const order: Record<string, number> = { User: 0, Owner: 1, Broker: 2, Office: 3, Agent: 4, CompanyOwner: 5 };
      return (order[a.name] ?? 99) - (order[b.name] ?? 99);
    });
  // Direct individual customers (User only — shown in own optgroup)
  const userOnlyRoles = platformRoles.filter(r => r.name === "User");
  // Business customer roles + subordinate agents — shown together under "الأعمال العقارية"
  const businessRoles = platformRoles.filter(r =>
    (getRoleCategory(r.name) === "customer" && r.name !== "User") ||
    getRoleCategory(r.name) === "subordinate"
  );

  // ── Filter handlers ───────────────────────────────────────────────────────

  function buildParams(): AdminUsersParams {
    const p: AdminUsersParams = {};
    if (pendingRole)                 p.role          = pendingRole;
    if (pendingIsActive !== "")      p.isActive       = pendingIsActive === "true";
    if (pendingSearch.trim())        p.search         = pendingSearch.trim();
    if (pendingCreatedAfter)         p.createdAfter   = pendingCreatedAfter;
    if (pendingCreatedBefore)        p.createdBefore  = pendingCreatedBefore;
    if (pendingLastLogin)            p.lastLoginAfter = pendingLastLogin;
    if (pendingTag)                  p.tag            = pendingTag;
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
    setPendingCreatedAfter(""); setPendingCreatedBefore("");
    setPendingLastLogin(""); setPendingTag("");
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

  function applySegment(seg: SavedSegment) {
    const f = seg.filters;
    setPendingRole(f.role ?? "");
    setActiveRoleTab(f.role ?? "");
    setPendingIsActive(f.isActive !== undefined ? String(f.isActive) : "");
    setPendingSearch(f.search ?? "");
    setPendingCreatedAfter(f.createdAfter ?? "");
    setPendingCreatedBefore(f.createdBefore ?? "");
    setPendingLastLogin(f.lastLoginAfter ?? "");
    setPendingTag(f.tag ?? "");
    appliedFiltersRef.current = f;
    load(1, f);
  }

  function handleSaveSegment() {
    if (!segmentName.trim()) return;
    const newSeg: SavedSegment = { name: segmentName.trim(), filters: buildParams() };
    const updated = [...segments.filter(s => s.name !== newSeg.name), newSeg];
    setSegments(updated);
    saveSegments(updated);
    setSegmentName("");
    setShowSaveSegment(false);
    showNotice("تم حفظ الشريحة");
  }

  function handleDeleteSegment(name: string) {
    const updated = segments.filter(s => s.name !== name);
    setSegments(updated);
    saveSegments(updated);
  }

  // ── Bulk actions ──────────────────────────────────────────────────────────

  function toggleSelect(id: string) {
    setSelected(prev => {
      const n = new Set(prev);
      n.has(id) ? n.delete(id) : n.add(id);
      return n;
    });
  }

  function toggleSelectAll() {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map(u => u.id)));
    }
  }

  async function handleBulkAction(action: "activate" | "deactivate" | "export") {
    if (selected.size === 0 || bulkLoading) return;
    setBulkLoading(true);
    setActionError("");
    try {
      const result = await adminApi.bulkUserAction(action, Array.from(selected));
      if (action === "export" && result.exportData) {
        exportToCsv(result.exportData);
        showNotice(`تم تصدير ${result.exportData.length} مستخدم`);
      } else {
        showNotice(result.message);
        await load(page, appliedFiltersRef.current);
      }
      setSelected(new Set());
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setBulkLoading(false);
    }
  }

  // ── Per-user actions ──────────────────────────────────────────────────────

  async function handleToggleStatus(targetId: string, currentIsActive: boolean) {
    if (actionLoading) return;
    setActionLoading(targetId);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(targetId, !currentIsActive);
      setUsers(prev => prev.map(u => u.id === updated.id ? { ...u, isActive: updated.isActive } : u));
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
      showNotice(`تم تغيير الدور إلى "${ROLE_LABELS[roleName] ?? roleName}"`);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleAddTag(userId: string, tag: string) {
    if (!tag.trim()) return;
    setActionLoading(`tag-${userId}`);
    try {
      await adminApi.addUserTag(userId, tag.trim());
      setUsers(prev => prev.map(u =>
        u.id === userId && !u.tags.includes(tag.trim())
          ? { ...u, tags: [...u.tags, tag.trim()] }
          : u
      ));
      if (!allTags.includes(tag.trim())) setAllTags(prev => [...prev, tag.trim()].sort());
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleRemoveTag(userId: string, tag: string) {
    setActionLoading(`tag-${userId}`);
    try {
      await adminApi.removeUserTag(userId, tag);
      setUsers(prev => prev.map(u =>
        u.id === userId ? { ...u, tags: u.tags.filter(t => t !== tag) } : u
      ));
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  // ── Create user ───────────────────────────────────────────────────────────

  function handleOpenCreate() {
    setShowCreate(v => !v);
    setCreateFullName(""); setCreateEmail("");
    setCreatePassword(""); setCreatePhone("");
    setCreateRole("User"); setCreateError("");
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    if (createLoading) return;
    setCreateLoading(true); setCreateError("");
    try {
      const created = await adminApi.createUser({
        fullName: createFullName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        phone: createPhone.trim() || undefined,
        role: createRole,
      });
      setUsers(prev => [created, ...prev]);
      setTotalCount(c => c + 1);
      setShowCreate(false);
      showNotice(`تم إنشاء المستخدم "${created.fullName}" بنجاح`);
    } catch (e) {
      setCreateError(normalizeError(e));
    } finally {
      setCreateLoading(false);
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────

  function showNotice(msg: string) {
    setActionNotice(msg);
    setTimeout(() => setActionNotice(""), 4000);
  }

  const hasActiveFilters = !!(
    pendingRole || pendingIsActive || pendingSearch ||
    pendingCreatedAfter || pendingCreatedBefore || pendingLastLogin || pendingTag
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 1040, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{
          marginBottom: "1.5rem",
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
              style={{ padding: "0.5rem 1rem", fontSize: "0.82rem" }}
              onClick={() => setShowAnalytics(v => !v)}
            >
              {showAnalytics ? "إخفاء الإحصائيات" : "عرض الإحصائيات"}
            </button>
            <button
              className="btn btn-primary"
              style={{ padding: "0.55rem 1.25rem" }}
              onClick={handleOpenCreate}
            >
              {showCreate ? "✕ إلغاء" : "+ إضافة مستخدم"}
            </button>
          </div>
        </div>

        {/* ── Role Quick-Filter Tabs ── */}
        <div style={{
          display: "flex", gap: "0.35rem", flexWrap: "wrap",
          marginBottom: "1.25rem",
          borderBottom: "2px solid var(--color-border, #e2e8f0)",
          paddingBottom: "0",
        }}>
          {([
            { role: "",             label: "الكل",               count: analytics?.totalUsers,               subordinate: false },
            { role: "User",         label: "مستخدمون",           count: analytics?.byRole["User"],           subordinate: false },
            { role: "Owner",        label: "ملاك عقار",          count: analytics?.byRole["Owner"],          subordinate: false },
            { role: "Broker",       label: "وسطاء عقاريون",      count: analytics?.byRole["Broker"],         subordinate: false },
            { role: "Office",       label: "مكاتب عقارية",       count: analytics?.byRole["Office"],         subordinate: false },
            { role: "CompanyOwner", label: "شركات تطوير",        count: analytics?.byRole["CompanyOwner"],   subordinate: false },
            { role: "Agent",        label: "وكلاء عقاريون",      count: analytics?.byRole["Agent"],          subordinate: true  },
          ] as const).map((tab, i, arr) => {
            const isActive = activeRoleTab === tab.role;
            // Separator before Agent (subordinate group)
            const prevTab = arr[i - 1];
            const showSeparator = tab.subordinate && prevTab && !prevTab.subordinate;
            return (
              <span key={tab.role || "all"} style={{ display: "contents" }}>
                {showSeparator && (
                  <span style={{
                    alignSelf: "center",
                    width: 1, height: 20,
                    background: "var(--color-border, #e2e8f0)",
                    margin: "0 0.1rem",
                    flexShrink: 0,
                  }} />
                )}
                <button
                  onClick={() => handleRoleTabClick(tab.role)}
                  style={{
                    padding: "0.5rem 0.9rem",
                    fontSize: "0.82rem",
                    fontWeight: isActive ? 700 : 500,
                    background: "none",
                    border: "none",
                    borderBottom: isActive
                      ? `2px solid ${tab.subordinate ? "#d97706" : "var(--color-primary, #16a34a)"}`
                      : "2px solid transparent",
                    marginBottom: "-2px",
                    cursor: "pointer",
                    color: isActive
                      ? (tab.subordinate ? "#d97706" : "var(--color-primary, #16a34a)")
                      : tab.subordinate
                      ? "#94a3b8"
                      : "var(--color-text-secondary, #64748b)",
                    whiteSpace: "nowrap",
                    transition: "color 0.15s, border-color 0.15s",
                    display: "flex", alignItems: "center", gap: "0.35rem",
                  }}
                >
                  {tab.subordinate && !isActive && (
                    <span style={{ fontSize: "0.65rem", opacity: 0.6 }}>↳</span>
                  )}
                  {tab.label}
                  {tab.count != null && (
                    <span style={{
                      fontSize: "0.72rem",
                      padding: "0.1rem 0.4rem",
                      borderRadius: 99,
                      background: isActive
                        ? (tab.subordinate ? "#d97706" : "var(--color-primary, #16a34a)")
                        : tab.subordinate ? "#fef3c7" : "#e2e8f0",
                      color: isActive ? "#fff" : tab.subordinate ? "#92400e" : "#64748b",
                      fontWeight: 600,
                      minWidth: 18,
                      textAlign: "center",
                    }}>
                      {tab.count}
                    </span>
                  )}
                </button>
              </span>
            );
          })}
        </div>

        {/* ── Analytics Panel ── */}
        {showAnalytics && analytics && (
          <div style={{
            marginBottom: "1.25rem",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "0.75rem",
          }}>
            {[
              { label: "إجمالي المستخدمين", value: analytics.totalUsers, color: "#2563eb" },
              { label: "مستخدمون نشطون", value: analytics.activeUsers, color: "#16a34a" },
              { label: "غير نشطين", value: analytics.inactiveUsers, color: "#dc2626" },
              { label: "جدد هذا الشهر", value: analytics.newThisMonth, color: "#7c3aed" },
              { label: "جدد هذا الأسبوع", value: analytics.newThisWeek, color: "#d97706" },
              { label: "نشطون (30 يوم)", value: analytics.loggedInLast30Days, color: "#0891b2" },
            ].map(stat => (
              <div
                key={stat.label}
                className="form-card"
                style={{ padding: "0.9rem 1rem", textAlign: "center" }}
              >
                <div style={{ fontSize: "1.7rem", fontWeight: 700, color: stat.color }}>
                  {stat.value}
                </div>
                <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Role distribution mini-chart ── */}
        {showAnalytics && analytics && Object.keys(analytics.byRole).length > 0 && (
          <div className="form-card" style={{ marginBottom: "1.25rem", padding: "1rem 1.25rem" }}>
            <div style={{ fontSize: "0.85rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--color-text-primary)" }}>
              توزيع المستخدمين حسب الدور
            </div>

            {/* Direct customers */}
            <div style={{ marginBottom: "0.6rem" }}>
              <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#16a34a", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                عملاء مباشرون
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                {Object.entries(analytics.byRole)
                  .filter(([role]) => DIRECT_CUSTOMER_ROLES.has(role))
                  .sort(([a], [b]) => {
                    const order: Record<string, number> = { User: 0, Owner: 1, Broker: 2, Office: 3, CompanyOwner: 4 };
                    return (order[a] ?? 9) - (order[b] ?? 9);
                  })
                  .map(([role, count]) => (
                    <button
                      key={role}
                      onClick={() => handleRoleTabClick(role)}
                      className={ROLE_BADGE[role] ?? "badge badge-gray"}
                      style={{ fontSize: "0.78rem", cursor: "pointer", border: "none" }}
                    >
                      {ROLE_LABELS[role] ?? role}: {count}
                    </button>
                  ))}
              </div>
            </div>

            {/* Subordinate accounts */}
            {Object.entries(analytics.byRole).some(([role]) => SUBORDINATE_ROLES.has(role)) && (
              <div style={{ marginBottom: "0.6rem" }}>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#d97706", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  حسابات تابعة (تحت مكتب / شركة)
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {Object.entries(analytics.byRole)
                    .filter(([role]) => SUBORDINATE_ROLES.has(role))
                    .map(([role, count]) => (
                      <button
                        key={role}
                        onClick={() => handleRoleTabClick(role)}
                        className={ROLE_BADGE[role] ?? "badge badge-gray"}
                        style={{ fontSize: "0.78rem", cursor: "pointer", border: "none", opacity: 0.85 }}
                      >
                        {ROLE_LABELS[role] ?? role}: {count}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {/* Other roles (Admin, Staff) */}
            {Object.entries(analytics.byRole).some(([role]) => !DIRECT_CUSTOMER_ROLES.has(role) && !SUBORDINATE_ROLES.has(role)) && (
              <div>
                <div style={{ fontSize: "0.7rem", fontWeight: 600, color: "#64748b", marginBottom: "0.35rem", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  أخرى
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
                  {Object.entries(analytics.byRole)
                    .filter(([role]) => !DIRECT_CUSTOMER_ROLES.has(role) && !SUBORDINATE_ROLES.has(role))
                    .map(([role, count]) => (
                      <span key={role} className={ROLE_BADGE[role] ?? "badge badge-gray"} style={{ fontSize: "0.78rem" }}>
                        {ROLE_LABELS[role] ?? role}: {count}
                      </span>
                    ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Create User Panel ── */}
        {showCreate && (
          <div className="form-card" style={{ marginBottom: "1.5rem", padding: "1.5rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1.25rem", color: "var(--color-text-primary)" }}>
              إضافة مستخدم جديد
            </h2>
            {createError && (
              <div style={{
                marginBottom: "1rem", padding: "0.65rem 1rem",
                backgroundColor: "#fef2f2", border: "1px solid #fecaca",
                borderRadius: 8, fontSize: "0.83rem", color: "#b91c1c",
              }}>
                {createError}
              </div>
            )}
            <form onSubmit={handleCreateUser}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "0.9rem", marginBottom: "1rem" }}>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>الاسم الكامل *</label>
                  <input
                    className="form-input"
                    placeholder="أحمد محمد"
                    value={createFullName}
                    onChange={e => setCreateFullName(e.target.value)}
                    required
                    disabled={createLoading}
                    style={{ padding: "0.5rem 0.75rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>البريد الإلكتروني *</label>
                  <input
                    className="form-input"
                    type="email"
                    placeholder="example@email.com"
                    value={createEmail}
                    onChange={e => setCreateEmail(e.target.value)}
                    required
                    disabled={createLoading}
                    style={{ padding: "0.5rem 0.75rem", direction: "ltr", textAlign: "right" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>كلمة المرور *</label>
                  <input
                    className="form-input"
                    type="password"
                    placeholder="8 أحرف على الأقل"
                    value={createPassword}
                    onChange={e => setCreatePassword(e.target.value)}
                    required
                    minLength={8}
                    disabled={createLoading}
                    style={{ padding: "0.5rem 0.75rem" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>رقم الهاتف</label>
                  <input
                    className="form-input"
                    type="tel"
                    placeholder="+963..."
                    value={createPhone}
                    onChange={e => setCreatePhone(e.target.value)}
                    disabled={createLoading}
                    style={{ padding: "0.5rem 0.75rem", direction: "ltr", textAlign: "right" }}
                  />
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem" }}>
                  <label className="form-label" style={{ margin: 0 }}>الدور</label>
                  <select
                    className="form-input"
                    value={createRole}
                    onChange={e => setCreateRole(e.target.value)}
                    disabled={createLoading || rolesLoading}
                    style={{ padding: "0.5rem 0.75rem" }}
                  >
                    {rolesLoading ? (
                      <option>جارٍ التحميل...</option>
                    ) : (
                      <>
                        {userOnlyRoles.length > 0 && (
                          <optgroup label="المستخدمون">
                            {userOnlyRoles.map(r => <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>)}
                          </optgroup>
                        )}
                        {businessRoles.length > 0 && (
                          <optgroup label="الأعمال العقارية">
                            {businessRoles.map(r => <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>)}
                          </optgroup>
                        )}
                      </>
                    )}
                  </select>
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  type="submit"
                  className="btn btn-primary"
                  style={{ padding: "0.55rem 1.5rem" }}
                  disabled={createLoading}
                >
                  {createLoading ? "جارٍ الإنشاء..." : "إنشاء المستخدم"}
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: "0.55rem 1rem" }}
                  onClick={handleOpenCreate}
                  disabled={createLoading}
                >
                  إلغاء
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Filter Panel ── */}
        <div className="form-card" style={{ marginBottom: "1.25rem" }}>
          <div
            style={{
              display: "flex", justifyContent: "space-between",
              alignItems: "center", padding: "0.75rem 1.25rem",
              cursor: "pointer", userSelect: "none",
            }}
            onClick={() => setShowFilters(v => !v)}
          >
            <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
              الفلاتر {hasActiveFilters && <span style={{ color: "#2563eb" }}>●</span>}
            </span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              {showFilters ? "▲ إخفاء" : "▼ عرض"}
            </span>
          </div>

          {showFilters && (
            <div style={{ padding: "0 1.25rem 1.25rem" }}>

              {/* Filter fields */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "0.75rem", marginBottom: "0.75rem" }}>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>بحث</label>
                  <input
                    className="form-input"
                    placeholder="اسم أو بريد أو هاتف"
                    value={pendingSearch}
                    onChange={e => setPendingSearch(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSearch()}
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>الدور</label>
                  <select
                    className="form-input"
                    value={pendingRole}
                    onChange={e => setPendingRole(e.target.value)}
                    disabled={rolesLoading}
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                  >
                    <option value="">الكل</option>
                    {userOnlyRoles.map(r => <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>)}
                    {businessRoles.map(r => <option key={r.id} value={r.name}>{ROLE_LABELS[r.name] ?? r.name}</option>)}
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>الحالة</label>
                  <select
                    className="form-input"
                    value={pendingIsActive}
                    onChange={e => setPendingIsActive(e.target.value)}
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                  >
                    <option value="">الكل</option>
                    <option value="true">نشط</option>
                    <option value="false">غير نشط</option>
                  </select>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>تاريخ الإنشاء (من)</label>
                  <input
                    className="form-input"
                    type="date"
                    value={pendingCreatedAfter}
                    onChange={e => setPendingCreatedAfter(e.target.value)}
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>تاريخ الإنشاء (إلى)</label>
                  <input
                    className="form-input"
                    type="date"
                    value={pendingCreatedBefore}
                    onChange={e => setPendingCreatedBefore(e.target.value)}
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>آخر دخول (بعد)</label>
                  <input
                    className="form-input"
                    type="date"
                    value={pendingLastLogin}
                    onChange={e => setPendingLastLogin(e.target.value)}
                    style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                  />
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
                  <label className="form-label" style={{ margin: 0, fontSize: "0.8rem" }}>التاج</label>
                  {allTags.length > 0 ? (
                    <select
                      className="form-input"
                      value={pendingTag}
                      onChange={e => setPendingTag(e.target.value)}
                      style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                    >
                      <option value="">الكل</option>
                      {allTags.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  ) : (
                    <input
                      className="form-input"
                      placeholder="اكتب تاجاً..."
                      value={pendingTag}
                      onChange={e => setPendingTag(e.target.value)}
                      style={{ padding: "0.4rem 0.65rem", fontSize: "0.83rem" }}
                    />
                  )}
                </div>

              </div>

              {/* Filter actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem", fontSize: "0.83rem" }} onClick={handleSearch}>
                  بحث
                </button>
                <button className="btn" style={{ padding: "0.45rem 1rem", fontSize: "0.83rem" }} onClick={handleReset}>
                  إعادة ضبط
                </button>

                <div style={{ marginRight: "auto", display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
                  {/* Saved segments dropdown */}
                  {segments.length > 0 && (
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center", flexWrap: "wrap" }}>
                      {segments.map(seg => (
                        <span
                          key={seg.name}
                          style={{
                            display: "inline-flex", alignItems: "center", gap: "0.3rem",
                            padding: "0.25rem 0.6rem", borderRadius: 999,
                            backgroundColor: "#eff6ff", border: "1px solid #bfdbfe",
                            fontSize: "0.78rem", cursor: "pointer",
                            color: "#1d4ed8",
                          }}
                          title={`تطبيق: ${seg.name}`}
                        >
                          <span onClick={() => applySegment(seg)}>{seg.name}</span>
                          <span
                            onClick={() => handleDeleteSegment(seg.name)}
                            title="حذف"
                            style={{ color: "#dc2626", cursor: "pointer", fontWeight: 700, marginRight: "0.2rem" }}
                          >×</span>
                        </span>
                      ))}
                    </div>
                  )}
                  {/* Save segment toggle */}
                  {!showSaveSegment ? (
                    <button
                      className="btn"
                      style={{ padding: "0.35rem 0.8rem", fontSize: "0.78rem" }}
                      onClick={() => setShowSaveSegment(true)}
                    >
                      + حفظ شريحة
                    </button>
                  ) : (
                    <div style={{ display: "flex", gap: "0.4rem", alignItems: "center" }}>
                      <input
                        className="form-input"
                        placeholder="اسم الشريحة..."
                        value={segmentName}
                        onChange={e => setSegmentName(e.target.value)}
                        onKeyDown={e => e.key === "Enter" && handleSaveSegment()}
                        style={{ padding: "0.35rem 0.6rem", fontSize: "0.78rem", width: 140 }}
                        autoFocus
                      />
                      <button className="btn btn-primary" style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem" }} onClick={handleSaveSegment}>
                        حفظ
                      </button>
                      <button className="btn" style={{ padding: "0.35rem 0.5rem", fontSize: "0.78rem" }} onClick={() => setShowSaveSegment(false)}>
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Notices ── */}
        {actionNotice && (
          <div style={{
            marginBottom: "0.75rem", padding: "0.65rem 1rem",
            backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
            borderRadius: 8, fontSize: "0.83rem", color: "#15803d", fontWeight: 600,
          }}>
            ✓ {actionNotice}
          </div>
        )}
        <InlineBanner message={actionError} />
        <InlineBanner message={fetchError} />

        {/* ── Bulk Actions Bar ── */}
        {selected.size > 0 && (
          <div style={{
            marginBottom: "0.75rem", padding: "0.75rem 1.25rem",
            backgroundColor: "#eff6ff", border: "1px solid #bfdbfe",
            borderRadius: 10, display: "flex", alignItems: "center",
            gap: "0.75rem", flexWrap: "wrap",
          }}>
            <span style={{ fontWeight: 700, fontSize: "0.88rem", color: "#1d4ed8" }}>
              {selected.size} مستخدم محدد
            </span>
            <button
              className="btn btn-primary"
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.8rem", backgroundColor: "#16a34a" }}
              onClick={() => handleBulkAction("activate")}
              disabled={bulkLoading}
            >
              تفعيل
            </button>
            <button
              className="btn"
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.8rem", backgroundColor: "#fef2f2", borderColor: "#fecaca", color: "#b91c1c" }}
              onClick={() => handleBulkAction("deactivate")}
              disabled={bulkLoading}
            >
              تعطيل
            </button>
            <button
              className="btn"
              style={{ padding: "0.35rem 0.9rem", fontSize: "0.8rem" }}
              onClick={() => handleBulkAction("export")}
              disabled={bulkLoading}
            >
              تصدير CSV
            </button>
            <button
              className="btn"
              style={{ padding: "0.35rem 0.7rem", fontSize: "0.78rem", marginRight: "auto" }}
              onClick={() => setSelected(new Set())}
            >
              إلغاء التحديد
            </button>
          </div>
        )}

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

        {/* ── Select All row ── */}
        {!fetching && users.length > 1 && (
          <div style={{
            display: "flex", alignItems: "center", gap: "0.5rem",
            padding: "0.4rem 0.5rem", marginBottom: "0.35rem",
            fontSize: "0.8rem", color: "var(--color-text-secondary)",
          }}>
            <input
              type="checkbox"
              checked={selected.size === users.length && users.length > 0}
              onChange={toggleSelectAll}
              style={{ cursor: "pointer", width: 16, height: 16 }}
            />
            <span>تحديد الكل ({users.length})</span>
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
                isSelected={selected.has(u.id)}
                onSelect={() => toggleSelect(u.id)}
                onToggle={handleToggleStatus}
                onRoleChange={handleRoleChange}
                onAddTag={handleAddTag}
                onRemoveTag={handleRemoveTag}
                onViewProfile={() => router.push(`/dashboard/admin/users/${u.id}`)}
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
  roles,
  actionLoading,
  isSelected,
  onSelect,
  onToggle,
  onRoleChange,
  onAddTag,
  onRemoveTag,
  onViewProfile,
}: {
  userData: AdminUserResponse;
  isSelf: boolean;
  roles: RbacRole[];
  actionLoading: string | null;
  isSelected: boolean;
  onSelect: () => void;
  onToggle: (id: string, current: boolean) => void;
  onRoleChange: (userId: string, roleId: string, roleName: string) => void;
  onAddTag: (userId: string, tag: string) => void;
  onRemoveTag: (userId: string, tag: string) => void;
  onViewProfile: () => void;
}) {
  const [showRoleEdit, setShowRoleEdit] = useState(false);
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [showTagInput, setShowTagInput] = useState(false);
  const [newTag, setNewTag] = useState("");
  const isThisLoading = actionLoading === u.id;
  const isTagLoading  = actionLoading === `tag-${u.id}`;

  function handleRoleSubmit() {
    if (!selectedRoleId) return;
    const role = roles.find(r => r.id === selectedRoleId);
    if (!role) return;
    onRoleChange(u.id, selectedRoleId, role.name);
    setShowRoleEdit(false);
    setSelectedRoleId("");
  }

  function handleTagSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!newTag.trim()) return;
    onAddTag(u.id, newTag.trim());
    setNewTag("");
    setShowTagInput(false);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
  }

  return (
    <div
      className="form-card"
      style={{
        padding: "0.9rem 1.1rem",
        borderRight: isSelected ? "3px solid #2563eb" : "3px solid transparent",
        transition: "border-color 0.15s",
      }}
    >
      <div style={{ display: "flex", gap: "0.75rem", alignItems: "flex-start" }}>

        {/* Checkbox */}
        <input
          type="checkbox"
          checked={isSelected}
          onChange={onSelect}
          style={{ cursor: "pointer", marginTop: "0.25rem", width: 16, height: 16, flexShrink: 0 }}
        />

        {/* Content */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Top row: name + badges */}
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.3rem" }}>
            <span
              onClick={onViewProfile}
              role="button"
              title={`عرض ملف ${u.fullName}`}
              style={{
                fontWeight: 700, fontSize: "0.95rem",
                color: "var(--color-primary)",
                textDecoration: "underline", textDecorationStyle: "dotted",
                cursor: "pointer",
              }}
            >
              {u.fullName}
            </span>
            <span className={ROLE_BADGE[u.role] ?? "badge badge-gray"}>
              {ROLE_LABELS[u.role] ?? u.role}
            </span>
            <span className={u.isActive ? "badge badge-green" : "badge badge-red"}>
              {u.isActive ? "نشط" : "غير نشط"}
            </span>
            {u.isDeleted && <span className="badge badge-red">محذوف</span>}
            {isSelf && <span className="badge badge-gray">أنت</span>}
            {u.planName && (
              <span className="badge badge-blue" style={{ fontSize: "0.72rem" }}>
                {u.planName}
              </span>
            )}
          </div>

          {/* Email + meta row */}
          <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginBottom: "0.25rem" }}>
            <span style={{ direction: "ltr", display: "inline-block" }}>{u.email}</span>
            {u.phone && <span style={{ marginRight: "0.75rem" }}>· {u.phone}</span>}
          </div>

          {/* Stats row */}
          <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", fontSize: "0.75rem", color: "var(--color-text-secondary)", marginBottom: "0.4rem" }}>
            <span>تسجيل: {formatDate(u.createdAt)}</span>
            {u.lastLoginAt && <span>آخر دخول: {formatDate(u.lastLoginAt)}</span>}
            {u.listingCount > 0 && <span>عقارات: {u.listingCount}</span>}
          </div>

          {/* Tags */}
          {(u.tags.length > 0 || showTagInput) && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginBottom: "0.4rem", alignItems: "center" }}>
              {u.tags.map(tag => (
                <span
                  key={tag}
                  style={{
                    display: "inline-flex", alignItems: "center", gap: "0.2rem",
                    padding: "0.15rem 0.5rem", borderRadius: 999,
                    backgroundColor: "#fef3c7", border: "1px solid #fde68a",
                    fontSize: "0.73rem", color: "#92400e",
                  }}
                >
                  {tag}
                  <button
                    onClick={() => onRemoveTag(u.id, tag)}
                    disabled={isTagLoading}
                    style={{ background: "none", border: "none", cursor: "pointer", color: "#92400e", padding: 0, lineHeight: 1, fontSize: "0.7rem", marginRight: "0.1rem" }}
                    title="حذف التاج"
                  >×</button>
                </span>
              ))}
              {showTagInput && (
                <form onSubmit={handleTagSubmit} style={{ display: "flex", gap: "0.25rem" }}>
                  <input
                    className="form-input"
                    placeholder="تاج جديد..."
                    value={newTag}
                    onChange={e => setNewTag(e.target.value)}
                    autoFocus
                    style={{ padding: "0.15rem 0.5rem", fontSize: "0.75rem", width: 110 }}
                  />
                  <button type="submit" className="btn btn-primary" style={{ padding: "0.15rem 0.5rem", fontSize: "0.72rem" }}>
                    إضافة
                  </button>
                  <button type="button" className="btn" style={{ padding: "0.15rem 0.4rem", fontSize: "0.72rem" }} onClick={() => setShowTagInput(false)}>
                    ✕
                  </button>
                </form>
              )}
            </div>
          )}

          {/* Role editor */}
          {showRoleEdit && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem", flexWrap: "wrap" }}>
              <select
                className="form-input"
                value={selectedRoleId}
                onChange={e => setSelectedRoleId(e.target.value)}
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem", minWidth: 160 }}
              >
                <option value="">اختر الدور...</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{ROLE_LABELS[r.name] ?? r.name}</option>
                ))}
              </select>
              <button
                className="btn btn-primary"
                style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                onClick={handleRoleSubmit}
                disabled={!selectedRoleId || isThisLoading}
              >
                تأكيد
              </button>
              <button
                className="btn"
                style={{ padding: "0.35rem 0.6rem", fontSize: "0.8rem" }}
                onClick={() => { setShowRoleEdit(false); setSelectedRoleId(""); }}
              >
                إلغاء
              </button>
            </div>
          )}

        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flexShrink: 0, alignItems: "flex-start" }}>
          <button
            className="btn"
            style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
            onClick={() => { setShowTagInput(v => !v); setShowRoleEdit(false); }}
            disabled={isTagLoading}
            title="إضافة تاج"
          >
            🏷
          </button>
          <button
            className="btn"
            style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
            onClick={() => { setShowRoleEdit(v => !v); setShowTagInput(false); }}
            disabled={isThisLoading}
          >
            تغيير الدور
          </button>
          {!isSelf && (
            <button
              className={u.isActive ? "btn" : "btn btn-primary"}
              style={{
                padding: "0.3rem 0.65rem", fontSize: "0.75rem",
                backgroundColor: u.isActive ? "#fef2f2" : undefined,
                borderColor: u.isActive ? "#fecaca" : undefined,
                color: u.isActive ? "#b91c1c" : undefined,
              }}
              onClick={() => onToggle(u.id, u.isActive)}
              disabled={isThisLoading}
            >
              {isThisLoading ? "..." : (u.isActive ? "تعطيل" : "تفعيل")}
            </button>
          )}
          <button
            className="btn"
            style={{ padding: "0.3rem 0.65rem", fontSize: "0.75rem" }}
            onClick={onViewProfile}
          >
            عرض
          </button>
        </div>

      </div>
    </div>
  );
}
