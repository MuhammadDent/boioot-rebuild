"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { getRoleCategory } from "@/features/admin/constants";
import AppSidebar from "@/components/dashboard/AppSidebar";
import AdminToolbar from "@/components/admin/AdminToolbar";
import AdminBreadcrumb from "@/components/admin/AdminBreadcrumb";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const redirected = useRef(false);

  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (sidebarOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [sidebarOpen]);

  useEffect(() => {
    if (isLoading || redirected.current) return;

    if (!user) {
      redirected.current = true;
      router.replace("/login");
      return;
    }

    const category = getRoleCategory(user.role);
    const hasAnyAdminPermission = (user.permissions?.length ?? 0) > 0;
    if (category === "customer" || category === "subordinate") {
      redirected.current = true;
      router.replace("/dashboard");
      return;
    }
    if (category === "staff" && !hasAnyAdminPermission) {
      redirected.current = true;
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

  if (isLoading) return null;

  return (
    <div style={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
      {/* ── Top toolbar ── */}
      <AdminToolbar />

      {/* ── Body: sidebar + content ── */}
      <div className="admin-layout">
        {/* Hamburger (mobile only, visible via CSS) */}
        <button
          className="admin-hamburger"
          onClick={() => setSidebarOpen(true)}
          aria-label="فتح القائمة"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <line x1="3" y1="18" x2="21" y2="18" />
          </svg>
        </button>

        {/* Sidebar */}
        <AppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          headerHeight={52}
        />

        {/* Main content */}
        <main style={{ flex: 1, minWidth: 0, overflowX: "hidden", display: "flex", flexDirection: "column" }}>
          <AdminBreadcrumb />
          {children}
        </main>
      </div>
    </div>
  );
}
