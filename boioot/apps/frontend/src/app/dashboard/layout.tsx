"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Navbar from "@/components/ui/Navbar";

const SITE_LINKS = [
  { href: "/",              label: "🏠 الرئيسية",      exact: true  },
  { href: "/daily-rentals", label: "📅 الإيجار اليومي", exact: false },
  { href: "/projects",      label: "🏗️ المشاريع",       exact: false },
  { href: "/requests",      label: "📋 الطلبات",        exact: false },
];

function DashboardSecNav() {
  const pathname = usePathname();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <div className="dash-sec-nav">
      <div className="dash-sec-nav__inner">
        {SITE_LINKS.map(({ href, label, exact }) => (
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

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAdminRoute = pathname.startsWith("/dashboard/admin");

  return (
    <>
      <Navbar />
      {!isAdminRoute && <DashboardSecNav />}
      {children}
    </>
  );
}
