"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRoleCategory } from "@/features/admin/constants";
import { saveRedirectTarget } from "@/lib/authRedirect";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import AppSidebar from "@/components/dashboard/AppSidebar";
import UpsellModal from "@/components/dashboard/UpsellModal";

// ─── DashboardLayout ──────────────────────────────────────────────────────────
//
// Two strict zones:
//   /dashboard/admin/*  → AdminLayout (handled by its own layout.tsx, pass-through here)
//   /dashboard/*        → CustomerLayout (DashboardHeader + AppSidebar)
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

  // ── Guard: redirect unauthenticated users + Admin/Staff out of customer zone ──
  useEffect(() => {
    if (isAdminRoute) return;
    if (isLoading || redirected.current) return;

    if (!user) {
      console.log("[dashboard] Unauthenticated — redirecting to /login");
      saveRedirectTarget();
      redirected.current = true;
      router.replace("/login");
      return;
    }

    const category = getRoleCategory(user.role);
    if (category === "admin" || category === "staff") {
      console.log("[dashboard] Admin/Staff detected — redirecting to /dashboard/admin. Role:", user.role);
      redirected.current = true;
      router.replace("/dashboard/admin");
    }
  }, [isAdminRoute, isLoading, user, router]);

  // Admin routes: pass through to /dashboard/admin/layout.tsx
  if (isAdminRoute) {
    return <>{children}</>;
  }

  // Render nothing while loading or while a redirect is pending
  if (isLoading) return null;
  if (!user) return null;

  // Admin/Staff in customer zone — render nothing while redirect fires
  const roleCategory = getRoleCategory(user.role);
  if (roleCategory === "admin" || roleCategory === "staff") {
    return null;
  }

  return (
    <div className="dash-shell">
      <DashboardHeader onMenuToggle={() => setSidebarOpen((o) => !o)} />
      <div className="admin-layout" style={{ background: "#f4f6f4" }}>
        <AppSidebar
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
