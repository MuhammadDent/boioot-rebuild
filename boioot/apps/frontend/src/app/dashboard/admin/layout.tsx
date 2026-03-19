"use client";

import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import AdminSidebar from "@/components/admin/AdminSidebar";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  if (isLoading) return null;

  return (
    <div
      style={{
        display: "flex",
        minHeight: "calc(100vh - 64px)",
        backgroundColor: "#f8fafc",
        alignItems: "stretch",
      }}
    >
      <AdminSidebar />
      <main
        style={{
          flex: 1,
          minWidth: 0,
          overflowX: "hidden",
        }}
      >
        {children}
      </main>
    </div>
  );
}
