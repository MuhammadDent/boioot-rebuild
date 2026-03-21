"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardSidebar from "@/components/dashboard/DashboardSidebar";

// ─── DashboardLayout ──────────────────────────────────────────────────────────
//
// Admin routes (/dashboard/admin/*) have their own full-screen layout —
// they receive children pass-through only.
// All other dashboard routes use the new header + sidebar shell.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (isAdminRoute) {
    return <>{children}</>;
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
    </div>
  );
}
