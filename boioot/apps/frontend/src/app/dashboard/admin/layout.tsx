"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { isStaffRole } from "@/lib/rbac";
import AdminSidebar from "@/components/admin/AdminSidebar";

/**
 * Admin area layout guard.
 * Allows access to any authenticated internal staff member (isStaffRole).
 * Individual pages enforce their own required permission via useProtectedRoute.
 */
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const redirected = useRef(false);

  useEffect(() => {
    if (isLoading || redirected.current) return;

    if (!user) {
      redirected.current = true;
      router.replace("/login");
      return;
    }

    if (!isStaffRole(user.role)) {
      redirected.current = true;
      router.replace("/dashboard");
    }
  }, [isLoading, user, router]);

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
