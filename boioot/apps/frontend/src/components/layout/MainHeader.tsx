"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import MessagesIconBtn from "@/components/ui/MessagesIconBtn";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

const NAV_LINKS = [
  { href: "/",              label: "الرئيسية",       exact: true  },
  { href: "/daily-rentals", label: "الإيجار اليومي",  exact: false },
  { href: "/projects",      label: "المشاريع",        exact: false },
  { href: "/requests",      label: "الطلبات",         exact: false },
  { href: "/blog",          label: "المدونة",         exact: false },
];

// ─── MainHeader ───────────────────────────────────────────────────────────────

export default function MainHeader() {
  const pathname = usePathname();
  const router   = useRouter();
  const { isAuthenticated, isLoading, logout, user } = useAuth();
  const { openAuthModal } = useAuthGate();

  function isActive(href: string, exact: boolean) {
    return exact ? pathname === href : pathname.startsWith(href);
  }

  function guardHref(href: string) {
    if (isAuthenticated) {
      router.push(href);
    } else {
      openAuthModal(() => { router.push(href); });
    }
  }

  function handleMessagesClick() {
    if (isAuthenticated) {
      router.push("/dashboard/messages");
    } else {
      openAuthModal(() => { router.push("/dashboard/messages"); });
    }
  }

  function handleLogout() {
    logout();
    router.push("/");
  }

  const onMessagesPage = pathname.startsWith("/dashboard/messages");

  return (
    <header className="main-hdr">
      <div className="main-hdr__inner">

        {/* ── Logo ──────────────────────────────────────────────────────── */}
        <Link
          href="/"
          className="main-hdr__logo"
          style={{ lineHeight: 0, display: "block" }}
        >
          <Image
            src="/logo-boioot.png"
            alt="بيوت"
            width={180}
            height={68}
            style={{ objectFit: "contain", width: 180, height: 68 }}
            priority
          />
        </Link>

        {/* ── Nav links ─────────────────────────────────────────────────── */}
        <nav className="main-hdr__nav">
          {NAV_LINKS.map(({ href, label, exact }) => {
            const active = isActive(href, exact);
            return (
              <Link
                key={href}
                href={href}
                className={[
                  "main-hdr__link",
                  active ? "main-hdr__link--active" : "",
                ].filter(Boolean).join(" ")}
              >
                {label}
              </Link>
            );
          })}
        </nav>

        {/* ── CTA + Auth strip ──────────────────────────────────────────── */}
        <div className="main-hdr__actions">

          {/* CTA buttons — always visible */}
          <button
            type="button"
            onClick={() => guardHref("/post-ad")}
            className="home-cta-primary"
          >
            <span
              className="home-cta-primary__icon"
              aria-hidden="true"
            >
              +
            </span>
            <span>أضف إعلانك</span>
          </button>

          <button
            type="button"
            onClick={() => guardHref("/dashboard/my-requests/new")}
            className="home-cta-secondary"
          >
            <span
              className="home-cta-secondary__icon"
              aria-hidden="true"
            >
              +
            </span>
            <span>أضف طلب</span>
          </button>

          {/* Auth strip */}
          {!isLoading && isAuthenticated && (
            <>
              <MessagesIconBtn
                isActivePage={onMessagesPage}
                onClick={handleMessagesClick}
                size={34}
              />

              <Link
                href="/dashboard/profile"
                title="الملف الشخصي"
                className="main-hdr__avatar"
              >
                {user?.profileImageUrl ? (
                  <img
                    src={user.profileImageUrl}
                    alt={user.fullName}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                ) : (
                  <span className="main-hdr__initials">
                    {user ? userInitials(user.fullName) : "؟"}
                  </span>
                )}
              </Link>

              <button
                type="button"
                onClick={handleLogout}
                className="main-hdr__logout"
              >
                خروج
              </button>
            </>
          )}

          {!isLoading && !isAuthenticated && (
            <>
              <MessagesIconBtn
                isActivePage={false}
                onClick={handleMessagesClick}
                size={34}
              />

              <Link
                href="/login"
                className="main-hdr__login"
              >
                تسجيل الدخول
              </Link>

              <Link
                href="/register"
                className="main-hdr__register"
              >
                إنشاء حساب
              </Link>
            </>
          )}

        </div>

      </div>
    </header>
  );
}
