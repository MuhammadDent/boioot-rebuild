"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import MainHeader from "@/components/layout/MainHeader";

// ─── Dashboard secondary nav links ────────────────────────────────────────────

const DASH_LINKS = [
  { href: "/",                  label: "الرئيسية",      exact: true  },
  { href: "/daily-rentals",     label: "الإيجار اليومي", exact: false },
  { href: "/projects",          label: "المشاريع",        exact: false },
  { href: "/requests",          label: "الطلبات",         exact: false },
  { href: "/dashboard/profile", label: "الملف الشخصي",   exact: true  },
];

function DashboardSecNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="dash-sec-nav">
      <div className="dash-sec-nav__inner">
        {DASH_LINKS.map(({ href, label, exact }) => (
          <Link
            key={href}
            href={href}
            className={[
              "dash-sec-nav__link",
              isActive(href, exact) ? "dash-sec-nav__link--active" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
            {label}
          </Link>
        ))}
      </div>
    </div>
  );
}

// ─── DashboardLayout ──────────────────────────────────────────────────────────
//
// Admin routes (/dashboard/admin/*) have their own full-screen layout with a
// sidebar — they must NOT render MainHeader or DashboardSecNav here.
// All other dashboard routes use MainHeader (shared) + DashboardSecNav.

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  if (isAdminRoute) {
    return <>{children}</>;
  }

  return (
    <>
      <MainHeader />
      <DashboardSecNav />
      {children}
    </>
  );
}
