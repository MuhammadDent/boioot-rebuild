"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import AdminSidebar from "@/components/admin/AdminSidebar";

/**
 * Admin shell layout guard.
 *
 * Access condition: the authenticated user must have at least one admin
 * permission in their permissions[] (derived from backend JWT).
 * Platform users (User, Agent, CompanyOwner, etc.) receive an empty
 * permissions[] from the backend and are redirected to /dashboard.
 *
 * This is a permission-based gate, not a role-based one. Role is not
 * inspected here. Individual pages each enforce their own specific
 * required permission via useProtectedRoute({ requiredPermission }).
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

    // Permission-based shell gate: any user with at least one admin permission
    // is allowed into the admin shell. Platform users have permissions[] = [].
    const hasAnyAdminPermission = (user.permissions?.length ?? 0) > 0;
    if (!hasAnyAdminPermission) {
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
