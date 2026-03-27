"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRoleCategory } from "@/features/admin/constants";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import UnifiedSidebar from "@/components/dashboard/UnifiedSidebar";
import UpsellModal from "@/components/dashboard/UpsellModal";

// ─── DashboardLayout ──────────────────────────────────────────────────────────
//
// Two strict zones:
//   /dashboard/admin/*  → AdminLayout (handled by its own layout.tsx, pass-through here)
//   /dashboard/*        → CustomerLayout (DashboardHeader + UnifiedSidebar)
//
// Guard: Admin and Staff users are redirected to /dashboard/admin for ALL
// customer routes — they must never see the customer shell.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  // Lock body scroll when sidebar open on mobile
  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [sidebarOpen]);

  // ── Guard: redirect Admin/Staff out of the customer zone ──────────────────
  useEffect(() => {
    if (isAdminRoute) return;
    if (isLoading || redirected.current) return;
    if (!user) return;

    const category = getRoleCategory(user.role);
    if (category === "admin" || category === "staff") {
      redirected.current = true;
      router.replace("/dashboard/admin");
    }
  }, [isAdminRoute, isLoading, user, router]);

  // Admin routes: pass through to /dashboard/admin/layout.tsx
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // While redirecting admin/staff, render nothing to avoid flash
  if (!isLoading && user) {
    const category = getRoleCategory(user.role);
    if (category === "admin" || category === "staff") {
      return null;
    }
  }

  return (
    <div className="dash-shell">
      <DashboardHeader onMenuToggle={() => setSidebarOpen((o) => !o)} />
      <div className="admin-layout" style={{ background: "#f4f6f4" }}>
        <UnifiedSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          headerHeight={60}
        />
        <main className="dash-shell__content">
          {children}
        </main>
      </div>
      <UpsellModal />
    </div>
  );
}
