"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/",                   label: "الرئيسية",       exact: true  },
  { href: "/daily-rentals",      label: "الإيجار اليومي",  exact: false, highlight: true },
  { href: "/projects",           label: "المشاريع",        exact: false },
  { href: "/requests",              label: "الطلبات",       exact: false },
];

export default function Navbar() {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  return (
    <nav className="navbar">
      <div className="navbar__inner">

        {/* Logo */}
        <Link href="/" style={{ flexShrink: 0, lineHeight: 0 }}>
          <Image
            src="/logo-boioot.png"
            alt="بيوت"
            width={120}
            height={46}
            style={{ objectFit: "contain" }}
            priority
          />
        </Link>

        {/* Nav links */}
        <div className="navbar__links">
          {NAV_LINKS.map(({ href, label, exact, highlight }) => {
            const active = isActive(href, exact ?? false);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "navbar__link",
                  highlight ? "navbar__daily" : "",
                  active ? "navbar__link--active" : "",
                ]
                  .filter(Boolean)
                  .join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </div>

        {/* Auth actions — always rendered to reserve space and prevent layout shift */}
        <div className="navbar__actions" style={{ minWidth: "130px", justifyContent: "flex-start" }}>
          {!isLoading && (
            isAuthenticated ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-sm"
                style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
              >
                لوحة التحكم
              </Link>
            ) : (
              <Link
                href="/login"
                className="btn btn-outline btn-sm"
                style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
              >
                تسجيل الدخول
              </Link>
            )
          )}
        </div>

      </div>
    </nav>
  );
}
