"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRoleCategory } from "@/features/admin/constants";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";
import UpsellModal from "@/components/dashboard/UpsellModal";

// ─── DashboardLayout ──────────────────────────────────────────────────────────
//
// Two strict zones:
//   /dashboard/admin/*  → AdminLayout (handled by its own layout.tsx, pass-through here)
//   /dashboard/*        → CustomerLayout (DashboardHeader + DashboardSidebar)
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

  // ── Guard: redirect Admin/Staff out of the customer zone ──────────────────
  useEffect(() => {
    if (isAdminRoute) return; // admin layout handles its own guards
    if (isLoading || redirected.current) return;
    if (!user) return; // unauthenticated — useProtectedRoute handles /login redirect

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
      <div className="dash-shell__body">
        <DashboardSidebar
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
        />
        <main className="dash-shell__content">
          {children}
        </main>
      </div>
      <UpsellModal />
    </div>
  );
}
