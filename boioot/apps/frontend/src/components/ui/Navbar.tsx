"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { messagingApi } from "@/features/dashboard/messages/api";
import { useEffect, useState } from "react";

function userInitials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

const NAV_LINKS = [
  { href: "/",              label: "الرئيسية",      exact: true  },
  { href: "/daily-rentals", label: "الإيجار اليومي", exact: false, highlight: true },
  { href: "/projects",      label: "المشاريع",       exact: false },
  { href: "/requests",      label: "الطلبات",        exact: false },
  { href: "/blog",          label: "المدونة",        exact: false },
];

export default function Navbar() {
  const pathname        = usePathname();
  const router          = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { openAuthModal } = useAuthGate();

  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread message count every 30 s when logged in
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }

    const fetchCount = async () => {
      try {
        const data = await messagingApi.getUnreadCount();
        setUnreadCount(data.total ?? 0);
      } catch {
        // silently ignore — badge simply stays at last known value
      }
    };

    void fetchCount();
    const id = setInterval(() => { void fetchCount(); }, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  function handleMessagesClick() {
    if (isAuthenticated) {
      router.push("/dashboard/messages");
    } else {
      openAuthModal(() => { router.push("/dashboard/messages"); });
    }
  }

  return (
    <nav className="navbar">
      <div className="navbar__inner">

        {/* Logo */}
        <Link href="/" className="navbar__logo" style={{ lineHeight: 0, display: "block" }}>
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
                {!pathname.startsWith("/dashboard") && (
                  <Link
                    href="/dashboard"
                    className="btn btn-primary btn-sm"
                    style={{ textDecoration: "none", padding: "0.4rem 1rem" }}
                  >
                    لوحة التحكم
                  </Link>
                )}

                {/* ── Messages icon with unread badge ── */}
                <button
                  type="button"
                  onClick={handleMessagesClick}
                  title="الرسائل"
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: pathname.startsWith("/dashboard/messages")
                      ? "2px solid var(--color-primary)"
                      : "1.5px solid var(--color-border)",
                    background: pathname.startsWith("/dashboard/messages")
                      ? "var(--color-primary-light, #e8f5e9)"
                      : "var(--color-bg-card)",
                    cursor: "pointer",
                    flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  {/* Chat bubble icon */}
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={pathname.startsWith("/dashboard/messages") ? "var(--color-primary)" : "var(--color-text-secondary)"}
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>

                  {/* Unread badge */}
                  {unreadCount > 0 && (
                    <span style={{
                      position: "absolute",
                      top: -4,
                      left: -4,
                      minWidth: 17,
                      height: 17,
                      borderRadius: 999,
                      background: "#dc2626",
                      color: "#fff",
                      fontSize: "0.65rem",
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 3px",
                      lineHeight: 1,
                      boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
                      border: "1.5px solid #fff",
                    }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </button>

                {/* Avatar — links to profile page */}
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
                  onClick={handleLogout}
                  className="btn btn-sm"
                  style={{ padding: "0.4rem 0.85rem", cursor: "pointer", background: "transparent", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: "6px" }}
                >
                  تسجيل الخروج
                </button>
              </>
            ) : (
              <>
                {/* Messages icon for guests — opens auth modal then redirects */}
                <button
                  type="button"
                  onClick={handleMessagesClick}
                  title="الرسائل"
                  style={{
                    position: "relative",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 36,
                    height: 36,
                    borderRadius: "50%",
                    border: "1.5px solid var(--color-border)",
                    background: "var(--color-bg-card)",
                    cursor: "pointer",
                    flexShrink: 0,
                    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                  }}
                >
                  <svg
                    width="17"
                    height="17"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="var(--color-text-secondary)"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                  </svg>
                </button>

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
