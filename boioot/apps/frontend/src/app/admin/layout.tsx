"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import Link from "next/link";
import Spinner from "@/components/ui/Spinner";

const ADMIN_LINKS = [
  { href: "/admin/users", label: "المستخدمون", icon: "👥" },
  { href: "/admin/companies", label: "الشركات", icon: "🏢" },
  { href: "/admin/properties", label: "العقارات", icon: "🏠" },
  { href: "/admin/projects", label: "المشاريع", icon: "🏗️" },
  { href: "/admin/requests", label: "الطلبات", icon: "📋" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { isAuthenticated, isLoading, user, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        router.replace("/login");
      } else if (user?.role !== "Admin") {
        router.replace("/dashboard");
      }
    }
  }, [isLoading, isAuthenticated, user, router]);

  if (isLoading) return <Spinner />;
  if (!isAuthenticated || user?.role !== "Admin") return null;

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <div className="dash-layout">
      <aside className="dash-sidebar">
        <Link href="/admin/users" className="dash-sidebar__logo">
          بيوت — إدارة
        </Link>

        <nav className="dash-sidebar__nav">
          {ADMIN_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`dash-sidebar__link${pathname.startsWith(link.href) ? " dash-sidebar__link--active" : ""}`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          ))}
        </nav>

        <div className="dash-sidebar__footer">
          <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
            {user?.fullName} — مدير
          </p>
          <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: "100%" }}>
            تسجيل الخروج
          </button>
        </div>
      </aside>

      <div className="dash-main">
        <div className="dash-topbar">
          <span style={{ fontWeight: 600 }}>لوحة الإدارة</span>
          <Link href="/" className="btn btn-ghost btn-sm">الموقع الرئيسي</Link>
        </div>
        <main className="dash-content">{children}</main>
      </div>
    </div>
  );
}
