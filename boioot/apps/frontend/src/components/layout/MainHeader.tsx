"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { saveRedirectTarget } from "@/lib/authRedirect";
import MessagesIconBtn from "@/components/ui/MessagesIconBtn";
import MobileNavDrawer from "@/components/layout/MobileNavDrawer";
import { getRoleCategory } from "@/features/admin/constants";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function userInitials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join("").toUpperCase();
}

export const NAV_LINKS = [
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

  const [mounted, setMounted]       = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  // Close drawer on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  const closeMobile = useCallback(() => setMobileOpen(false), []);

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

  // Detect admin/staff — they get a quick-return button to the admin dashboard
  const roleCategory   = user ? getRoleCategory(user.role) : "customer";
  const isAdminOrStaff = roleCategory === "admin" || roleCategory === "staff";
  const profileHref    = isAdminOrStaff ? "/dashboard/admin/profile" : "/dashboard/profile";

  return (
    <>
      <header className="main-hdr">
        <div className="main-hdr__inner">

          {/* ── Logo ──────────────────────────────────────────────────── */}
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

          {/* ── Desktop Nav links ─────────────────────────────────────── */}
          <nav className="main-hdr__nav" aria-label="التنقل الرئيسي">
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

          {/* ── CTA + Auth strip ──────────────────────────────────────── */}
          <div className="main-hdr__actions">

            {/* CTA buttons — hidden on mobile, shown on desktop */}
            <div className="cta-buttons main-hdr__cta-desktop">
              <button
                suppressHydrationWarning
                type="button"
                onClick={() => guardHref("/post-ad")}
                className="home-cta-primary"
              >
                + أضف إعلان
              </button>

              <button
                suppressHydrationWarning
                type="button"
                onClick={() => guardHref("/post-request")}
                className="home-cta-secondary"
              >
                + أضف طلب
              </button>
            </div>

            {/* Auth strip — mounted guard prevents SSR/client hydration mismatch */}
            {mounted && !isLoading && isAuthenticated && (
              <>
                <MessagesIconBtn
                  isActivePage={onMessagesPage}
                  onClick={handleMessagesClick}
                  size={34}
                />

                <Link
                  href={profileHref}
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
                  className="main-hdr__logout main-hdr__auth-desktop"
                >
                  خروج
                </button>
              </>
            )}

            {mounted && !isLoading && !isAuthenticated && (
              <>
                <Link
                  href="/login"
                  className="main-hdr__login main-hdr__auth-desktop"
                  onClick={() => saveRedirectTarget()}
                >
                  تسجيل الدخول
                </Link>

                <Link
                  href="/register"
                  className="main-hdr__register main-hdr__auth-desktop"
                  onClick={() => saveRedirectTarget()}
                >
                  إنشاء حساب
                </Link>
              </>
            )}

            {/* ── Hamburger toggle — mobile only ──────────────────────── */}
            <button
              suppressHydrationWarning
              type="button"
              className="mobile-nav-toggle"
              onClick={() => setMobileOpen((v) => !v)}
              aria-label={mobileOpen ? "إغلاق القائمة" : "فتح القائمة"}
              aria-expanded={mobileOpen}
              aria-controls="mobile-nav-drawer"
            >
              <span className={`hamburger${mobileOpen ? " hamburger--open" : ""}`}>
                <span className="hamburger__bar" />
                <span className="hamburger__bar" />
                <span className="hamburger__bar" />
              </span>
            </button>

          </div>
        </div>
      </header>

      {/* Mobile Drawer — rendered outside header to avoid z-index / overflow issues */}
      {mounted && (
        <MobileNavDrawer
          isOpen={mobileOpen}
          onClose={closeMobile}
          pathname={pathname}
          navLinks={NAV_LINKS}
          isAuthenticated={isAuthenticated}
          isAdminOrStaff={isAdminOrStaff}
          onAddAd={() => guardHref("/post-ad")}
          onAddRequest={() => guardHref("/post-request")}
        />
      )}
    </>
  );
}
