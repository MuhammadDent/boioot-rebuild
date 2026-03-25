"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import MessagesIconBtn from "./MessagesIconBtn";
import { useContent } from "@/context/ContentContext";

// ─── Helpers ───────────────────────────────────────────────────────────────────

function userInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map(w => w[0]).join("").toUpperCase();
}

const NAV_LINKS = [
  { href: "/",              label: "الرئيسية",       exact: true  },
  { href: "/daily-rentals", label: "الإيجار اليومي",  exact: false, highlight: true },
  { href: "/projects",      label: "المشاريع",        exact: false },
  { href: "/requests",      label: "الطلبات",         exact: false },
  { href: "/blog",          label: "المدونة",         exact: false },
];

// ─── Navbar ────────────────────────────────────────────────────────────────────

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { openAuthModal } = useAuthGate();

  const loginText    = useContent("navbar.loginText",    "تسجيل الدخول");
  const registerText = useContent("navbar.registerText", "إنشاء حساب");

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function handleLogout() { logout(); router.push("/"); }

  function handleMessagesClick() {
    if (isAuthenticated) {
      router.push("/dashboard/messages");
    } else {
      openAuthModal(() => { router.push("/dashboard/messages"); });
    }
  }

  const onMessagesPage = pathname.startsWith("/dashboard/messages");

  return (
    <nav className="navbar">
        <div className="navbar__inner">

          {/* Logo */}
          <Link
            href="/"
            className="navbar__logo"
            style={{ lineHeight: 0, display: "block" }}
          >
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
                    active    ? "navbar__link--active" : "",
                  ].filter(Boolean).join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </div>

          {/* Auth actions */}
          <div
            className="navbar__actions"
            style={{ minWidth: "180px", justifyContent: "flex-start", gap: "0.5rem" }}
          >
            {!isLoading && (
              isAuthenticated ? (
                <>
                  {!pathname.startsWith("/dashboard") && (
                    <Link
                      href="/dashboard"
                      className="btn btn-primary btn-sm"
                      style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
                    >
                      لوحة التحكم
                    </Link>
                  )}

                  {/* Messages icon — authenticated */}
                  <MessagesIconBtn
                    isActivePage={onMessagesPage}
                    onClick={handleMessagesClick}
                  />

                  {/* Avatar */}
                  <Link
                    href="/dashboard/profile"
                    title="الملف الشخصي"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      width: 36,
                      height: 36,
                      borderRadius: "50%",
                      overflow: "hidden",
                      background: user?.profileImageUrl ? "transparent" : "var(--color-primary)",
                      border: "2px solid var(--color-border)",
                      flexShrink: 0,
                      textDecoration: "none",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  >
                    {user?.profileImageUrl ? (
                      <img
                        src={user.profileImageUrl}
                        alt={user.fullName}
                        style={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>
                        {user ? userInitials(user.fullName) : "؟"}
                      </span>
                    )}
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="btn btn-sm"
                    style={{
                      padding: "0.4rem 0.85rem",
                      cursor: "pointer",
                      background: "transparent",
                      color: "#dc2626",
                      border: "1.5px solid #dc2626",
                      borderRadius: "6px",
                    }}
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  {/* Messages icon — guest (opens auth modal) */}
                  <MessagesIconBtn
                    isActivePage={false}
                    onClick={handleMessagesClick}
                  />

                  <Link
                    href="/login"
                    className="btn btn-outline btn-sm"
                    style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
                  >
                    {loginText}
                  </Link>

                  <Link
                    href="/register"
                    className="btn btn-sm"
                    style={{
                      textDecoration: "none",
                      padding: "0.4rem 0.85rem",
                      background: "var(--color-primary-light, #e8f5e9)",
                      color: "var(--color-primary)",
                      border: "1px solid var(--color-primary)",
                      borderRadius: "6px",
                    }}
                  >
                    {registerText}
                  </Link>
                </>
              )
            )}
          </div>

        </div>
    </nav>
  );
}
