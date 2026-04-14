"use client";

// ─────────────────────────────────────────────────────────────────────────────
// AppSidebar — THE ONLY sidebar used across ALL dashboards and ALL roles.
//
// Config lives entirely in sidebar.config.ts (single source of truth).
// This component handles rendering, UX, permissions and mobile drawer only.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { usePlan } from "@/context/SubscriptionContext";
import { getSidebarGroups, ROLE_DISPLAY } from "@/features/sidebar/sidebar.config";
import type { FeatureKey } from "@/features/plan/types";

// ── Icon: chevron ────────────────────────────────────────────────────────────

function ChevronDown({ open }: { open: boolean }) {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{
        flexShrink: 0,
        transition: "transform 0.2s",
        transform: open ? "rotate(180deg)" : "rotate(0deg)",
        opacity: 0.35,
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ── Logout icon ──────────────────────────────────────────────────────────────

const LogoutIcon = (
  <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" y1="12" x2="9" y2="12" />
  </svg>
);

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
  headerHeight?: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function AppSidebar({
  isOpen = false,
  onClose,
  headerHeight = 52,
}: AppSidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const { user, logout, hasPermission } = useAuth();
  const { canAccess, isAdminBypass }    = usePlan();

  // ── Build groups from config ────────────────────────────────────────────

  const groups = getSidebarGroups(user?.role, user?.accountType);

  // Debug log (requirement 9)
  useEffect(() => {
    if (user?.role) {
      console.log("Sidebar rendered for role:", user.role);
    }
  }, [user?.role]);

  // ── Active group detection ──────────────────────────────────────────────

  function findActiveGroupId(): string {
    for (const group of groups) {
      for (const item of group.items) {
        const matched = item.exact
          ? pathname === item.href
          : pathname === item.href || pathname.startsWith(item.href + "/");
        if (matched) return group.id;
      }
    }
    return groups[0]?.id ?? "overview";
  }

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const active = findActiveGroupId();
    const init: Record<string, boolean> = {};
    for (const g of groups) {
      init[g.id] = !!g.alwaysOpen || g.id === active;
    }
    return init;
  });

  // Auto-expand when route changes
  useEffect(() => {
    const active = findActiveGroupId();
    setOpenGroups((prev) => ({ ...prev, [active]: true }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  // ── Permission helper (RBAC) ────────────────────────────────────────────

  function can(permission?: string): boolean {
    if (!permission) return true;
    return hasPermission(permission);
  }

  // ── Plan feature helper (PBAC) ──────────────────────────────────────────
  // Admin / Staff bypass is handled inside canAccess() in SubscriptionContext.

  function canFeature(feature?: FeatureKey): boolean {
    if (!feature) return true;
    if (isAdminBypass) return true;
    return canAccess(feature);
  }

  function isActive(href: string, exact?: boolean): boolean {
    if (exact) return pathname === href;
    return pathname === href || pathname.startsWith(href + "/");
  }

  function toggleGroup(id: string) {
    setOpenGroups((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  // ── User display ────────────────────────────────────────────────────────

  const initial   = user?.fullName?.charAt(0).toUpperCase() ?? "؟";
  const roleLabel = ROLE_DISPLAY[user?.role ?? ""] ?? (user?.role ?? "");
  const isAdmin   = user?.role === "Admin" || user?.role === "Staff";

  // ── Mobile detection (JS-controlled, not CSS-only) ───────────────────────
  // This bypasses all CSS specificity/cascade issues on mobile.

  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 768px)");
    const update = () => setIsMobile(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // ── Computed sidebar styles based on breakpoint ──────────────────────────

  const sidebarStyle: React.CSSProperties = isMobile
    ? {
        // Mobile: fixed right-side drawer, hidden by default
        position: "fixed",
        top: 0,
        right: 0,
        height: "100vh",
        width: 280,
        zIndex: 200,
        transform: isOpen ? "translateX(0)" : "translateX(100%)",
        transition: "transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
        backgroundColor: "#111827",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        boxShadow: isOpen ? "-4px 0 24px rgba(0,0,0,0.4)" : "none",
        overflowY: "auto",
        willChange: "transform",
      }
    : {
        // Desktop: sticky sidebar, always visible
        position: "sticky",
        top: headerHeight,
        height: `calc(100vh - ${headerHeight}px)`,
        width: 250,
        flexShrink: 0,
        zIndex: 50,
        backgroundColor: "#111827",
        display: "flex",
        flexDirection: "column",
        borderLeft: "1px solid rgba(255,255,255,0.07)",
        overflowY: "auto",
      };

  // ── Render ──────────────────────────────────────────────────────────────

  return (
    <>
      {/* Backdrop (mobile only) */}
      {isMobile && isOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.55)",
            zIndex: 199,
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
          }}
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      <aside
        className="admin-sidebar"
        style={sidebarStyle}
      >
        {/* Mobile close button — JS-controlled, only shown on mobile */}
        {isMobile && onClose && (
          <button
            onClick={onClose}
            aria-label="إغلاق القائمة"
            style={{
              position: "absolute",
              top: 12,
              left: 12,
              width: 32,
              height: 32,
              borderRadius: "50%",
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              fontSize: "1rem",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 10,
            }}
          >
            ✕
          </button>
        )}

        {/* ── User badge ──────────────────────────────────────────────────── */}
        <div
          style={{
            padding: "0.7rem 1rem",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
            flexShrink: 0,
            display: "flex",
            alignItems: "center",
            gap: "0.6rem",
          }}
        >
          <div
            style={{
              width: 30,
              height: 30,
              borderRadius: "50%",
              backgroundColor: "#166534",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              fontSize: "0.78rem",
              fontWeight: 700,
              color: "#fff",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {user?.profileImageUrl ? (
              <img
                src={user.profileImageUrl}
                alt=""
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
                style={{
                  position: "absolute",
                  top: 0, left: 0, right: 0, bottom: 0,
                  width: "100%", height: "100%",
                  objectFit: "cover", objectPosition: "center",
                  display: "block",
                }}
              />
            ) : (
              initial
            )}
          </div>
          <div style={{ minWidth: 0, flex: 1 }}>
            <p style={{ margin: 0, fontSize: "0.77rem", fontWeight: 600, color: "#e5e7eb", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user?.fullName ?? "المستخدم"}
            </p>
            <p style={{ margin: 0, fontSize: "0.67rem", color: "#6b7280", marginTop: 1 }}>
              {roleLabel}
            </p>
          </div>
          {isAdmin && (
            <div style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              flexShrink: 0,
              boxShadow: "0 0 0 2px rgba(34,197,94,0.2)",
            }} />
          )}
        </div>

        {/* ── Navigation ──────────────────────────────────────────────────── */}
        <nav
          style={{ flex: 1, padding: "0.35rem 0 1rem", overflowY: "auto" }}
          aria-label="قائمة التنقل"
        >
          {groups.map((group, groupIdx) => {
            // RBAC: Hide groups the user has no permission to see
            if (!can(group.permission)) return null;
            // PBAC: Hide groups gated by a plan feature
            if (!canFeature(group.feature)) return null;

            const visibleItems = group.items.filter(
              (item) => can(item.permission) && canFeature(item.feature),
            );

            // Requirement 7: Hide empty groups
            if (visibleItems.length === 0) return null;

            const isGroupOpen  = group.alwaysOpen ? true : (openGroups[group.id] ?? false);
            const hasActiveItem = visibleItems.some((item) => isActive(item.href, item.exact));

            return (
              <div key={group.id}>
                {/* Section divider */}
                {groupIdx > 0 && (
                  <div style={{
                    height: 1,
                    backgroundColor: "rgba(255,255,255,0.05)",
                    margin: "0.2rem 0.75rem",
                  }} />
                )}

                {/* Group header */}
                <button
                  onClick={() => !group.alwaysOpen && toggleGroup(group.id)}
                  aria-expanded={isGroupOpen}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.5rem",
                    width: "100%",
                    padding: "0.5rem 1rem",
                    background: "none",
                    border: "none",
                    cursor: group.alwaysOpen ? "default" : "pointer",
                    textAlign: "right",
                    direction: "rtl",
                  }}
                >
                  <span style={{ color: hasActiveItem ? "#4ade80" : "#4b5563", display: "flex" }}>
                    {group.icon}
                  </span>
                  <span style={{
                    flex: 1,
                    fontSize: "0.69rem",
                    fontWeight: 700,
                    color: hasActiveItem ? "#d1fae5" : "#6b7280",
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}>
                    {group.label}
                  </span>
                  {!group.alwaysOpen && <ChevronDown open={isGroupOpen} />}
                </button>

                {/* Collapsible items */}
                {isGroupOpen && (
                  <div>
                    {visibleItems.map((item) => {
                      const active = isActive(item.href, item.exact);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={onClose}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.55rem",
                            padding: "0.38rem 1rem 0.38rem 1.3rem",
                            margin: "0.04rem 0.4rem",
                            borderRadius: 7,
                            fontSize: "0.81rem",
                            fontWeight: active ? 600 : 400,
                            color: active ? "#ffffff" : "#9ca3af",
                            backgroundColor: active ? "#166534" : "transparent",
                            textDecoration: "none",
                            direction: "rtl",
                            transition: "background-color 0.12s, color 0.12s",
                          }}
                          onMouseEnter={(e) => {
                            if (!active) {
                              e.currentTarget.style.backgroundColor = "rgba(255,255,255,0.06)";
                              e.currentTarget.style.color = "#e5e7eb";
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!active) {
                              e.currentTarget.style.backgroundColor = "transparent";
                              e.currentTarget.style.color = "#9ca3af";
                            }
                          }}
                        >
                          <span style={{ color: active ? "#4ade80" : "#4b5563", display: "flex" }}>
                            {item.icon}
                          </span>
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* ── Footer: logout ───────────────────────────────────────────────── */}
        <div style={{
          padding: "0.6rem 1rem",
          borderTop: "1px solid rgba(255,255,255,0.07)",
          flexShrink: 0,
        }}>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              width: "100%",
              padding: "0.4rem 0",
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: "0.78rem",
              color: "#6b7280",
              direction: "rtl",
              textAlign: "right",
              transition: "color 0.12s",
            }}
            onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
            onMouseLeave={(e) => { e.currentTarget.style.color = "#6b7280"; }}
          >
            {LogoutIcon}
            تسجيل الخروج
          </button>
        </div>
      </aside>
    </>
  );
}
