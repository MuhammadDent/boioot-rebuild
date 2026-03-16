"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

const NAV_LINKS = [
  { href: "/",              label: "الرئيسية",      exact: true  },
  { href: "/daily-rentals", label: "الإيجار اليومي", exact: false, highlight: true },
  { href: "/projects",      label: "المشاريع",       exact: false },
  { href: "/requests",      label: "الطلبات",        exact: false },
];

export default function Navbar() {
  const pathname        = usePathname();
  const router          = useRouter();
  const { isAuthenticated, isLoading, logout } = useAuth();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  return (
    <nav className="navbar">
      <div className="navbar__inner">

        {/* Logo — bigger to match old platform */}
        <Link href="/" style={{ flexShrink: 0, lineHeight: 0, display: "block" }}>
          <Image
            src="/logo-boioot.png"
            alt="بيوت"
            width={220}
            height={84}
            style={{ objectFit: "contain", width: 220, height: 84 }}
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

        {/* Auth actions */}
        <div className="navbar__actions" style={{ minWidth: "180px", justifyContent: "flex-start", gap: "0.5rem" }}>
          {!isLoading && (
            isAuthenticated ? (
              <>
                <Link
                  href="/dashboard"
                  className="btn btn-primary btn-sm"
                  style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
                >
                  لوحة التحكم
                </Link>
                <button
                  onClick={handleLogout}
                  className="btn btn-outline btn-sm"
                  style={{ padding: "0.4rem 0.85rem", cursor: "pointer" }}
                >
                  خروج
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="btn btn-outline btn-sm"
                  style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
                >
                  تسجيل الدخول
                </Link>
                <Link
                  href="/register"
                  className="btn btn-sm"
                  style={{
                    textDecoration: "none", padding: "0.4rem 0.85rem",
                    background: "var(--color-primary-light, #e8f5e9)",
                    color: "var(--color-primary)",
                    border: "1px solid var(--color-primary)",
                    borderRadius: "6px",
                  }}
                >
                  إنشاء حساب
                </Link>
              </>
            )
          )}
        </div>

      </div>
    </nav>
  );
}
