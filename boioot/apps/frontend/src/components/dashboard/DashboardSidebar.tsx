"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";

const NAV_LINKS = [
  { href: "/dashboard", label: "الرئيسية", icon: "🏠" },
  { href: "/dashboard/properties", label: "عقاراتي", icon: "🏢" },
  { href: "/dashboard/projects", label: "مشاريعي", icon: "🏗️" },
  { href: "/dashboard/requests", label: "الطلبات", icon: "📋" },
  { href: "/dashboard/messages", label: "الرسائل", icon: "💬" },
];

export default function DashboardSidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const router = useRouter();

  function handleLogout() {
    logout();
    router.push("/login");
  }

  return (
    <aside className="dash-sidebar">
      <Link href="/dashboard" className="dash-sidebar__logo">
        بيوت
      </Link>

      <nav className="dash-sidebar__nav">
        {NAV_LINKS.map((link) => {
          const isActive =
            link.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(link.href);
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`dash-sidebar__link${isActive ? " dash-sidebar__link--active" : ""}`}
            >
              <span>{link.icon}</span>
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="dash-sidebar__footer">
        <p style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginBottom: "0.75rem" }}>
          {user?.fullName}
        </p>
        <button onClick={handleLogout} className="btn btn-ghost btn-sm" style={{ width: "100%" }}>
          تسجيل الخروج
        </button>
      </div>
    </aside>
  );
}

