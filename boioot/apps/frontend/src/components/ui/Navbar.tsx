"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import { messagingApi } from "@/features/dashboard/messages/api";
import { useEffect, useRef, useState } from "react";

// ─── CSS keyframes (injected once) ────────────────────────────────────────────

const KEYFRAMES = `
  @keyframes msg-badge-bounce {
    0%   { transform: scale(1); }
    25%  { transform: scale(1.55) rotate(-8deg); }
    55%  { transform: scale(0.88) rotate(4deg); }
    75%  { transform: scale(1.15); }
    100% { transform: scale(1); }
  }
  @keyframes msg-ripple {
    0%   { transform: scale(0); opacity: 0.35; }
    100% { transform: scale(4.5); opacity: 0; }
  }
  @keyframes msg-tooltip-in {
    from { opacity: 0; transform: translateY(-4px); }
    to   { opacity: 1; transform: translateY(0); }
  }
`;

// ─── MessagesIconBtn ───────────────────────────────────────────────────────────

interface MessagesIconBtnProps {
  isActivePage: boolean;
  unreadCount: number;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

function MessagesIconBtn({ isActivePage, unreadCount, onClick }: MessagesIconBtnProps) {
  const [tooltip, setTooltip]           = useState(false);
  const [badgeAnimating, setBadgeAnim]  = useState(false);
  const [ripples, setRipples]           = useState<{ id: number; x: number; y: number }[]>([]);
  const prevCountRef                    = useRef(0);
  const rippleId                        = useRef(0);
  const animTimerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect new messages → trigger badge bounce
  useEffect(() => {
    if (unreadCount > prevCountRef.current) {
      setBadgeAnim(true);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setBadgeAnim(false), 750);
    }
    prevCountRef.current = unreadCount;
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [unreadCount]);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
    // Ripple: compute position relative to button
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = ++rippleId.current;
    setRipples(prev => [...prev, { id, x, y }]);
    setTimeout(() => setRipples(prev => prev.filter(r => r.id !== id)), 600);

    onClick(e);
  }

  const borderColor = isActivePage ? "var(--color-primary)" : "var(--color-border)";
  const bg          = isActivePage ? "var(--color-primary-light, #e8f5e9)" : "var(--color-bg-card)";
  const iconColor   = isActivePage ? "var(--color-primary)" : "var(--color-text-secondary)";

  return (
    <div
      style={{ position: "relative", display: "inline-flex", flexShrink: 0 }}
      onMouseEnter={() => setTooltip(true)}
      onMouseLeave={() => setTooltip(false)}
    >
      <button
        type="button"
        onClick={handleClick}
        aria-label="الرسائل"
        style={{
          position: "relative",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 36,
          height: 36,
          borderRadius: "50%",
          border: `${isActivePage ? "2px" : "1.5px"} solid ${borderColor}`,
          background: bg,
          cursor: "pointer",
          flexShrink: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
          overflow: "hidden",       // clip ripple
        }}
      >
        {/* Chat bubble SVG */}
        <svg
          width="17" height="17" viewBox="0 0 24 24"
          fill="none" stroke={iconColor}
          strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: "relative", zIndex: 1 }}
        >
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>

        {/* Ripple layers */}
        {ripples.map(({ id, x, y }) => (
          <span
            key={id}
            style={{
              position: "absolute",
              left: x,
              top: y,
              width: 36,
              height: 36,
              borderRadius: "50%",
              background: isActivePage ? "rgba(34,197,94,0.35)" : "rgba(100,116,139,0.28)",
              transform: "translate(-50%, -50%) scale(0)",
              animation: "msg-ripple 0.6s ease-out forwards",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        ))}

        {/* Unread badge */}
        {unreadCount > 0 && (
          <span
            style={{
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
              boxShadow: "0 1px 3px rgba(0,0,0,0.25)",
              border: "1.5px solid #fff",
              animation: badgeAnimating ? "msg-badge-bounce 0.75s cubic-bezier(.36,.07,.19,.97)" : "none",
              zIndex: 2,
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Tooltip */}
      {tooltip && (
        <div
          role="tooltip"
          style={{
            position: "absolute",
            bottom: "calc(100% + 7px)",
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(15,23,42,0.88)",
            color: "#fff",
            fontSize: "0.72rem",
            fontWeight: 600,
            padding: "4px 9px",
            borderRadius: 6,
            whiteSpace: "nowrap",
            pointerEvents: "none",
            zIndex: 50,
            animation: "msg-tooltip-in 0.15s ease",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          الرسائل
          {/* Arrow */}
          <span style={{
            position: "absolute",
            top: "100%",
            left: "50%",
            transform: "translateX(-50%)",
            width: 0,
            height: 0,
            borderLeft: "5px solid transparent",
            borderRight: "5px solid transparent",
            borderTop: "5px solid rgba(15,23,42,0.88)",
          }} />
        </div>
      )}
    </div>
  );
}

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

  const [unreadCount, setUnreadCount] = useState(0);

  // Poll unread count every 30 s when authenticated
  useEffect(() => {
    if (!isAuthenticated) { setUnreadCount(0); return; }

    const fetch = async () => {
      try {
        const data = await messagingApi.getUnreadCount();
        setUnreadCount(data.total ?? 0);
      } catch { /* silently ignore */ }
    };

    void fetch();
    const id = setInterval(() => { void fetch(); }, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated]);

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
    <>
      {/* Inject animation keyframes once */}
      <style>{KEYFRAMES}</style>

      <nav className="navbar">
        <div className="navbar__inner">

          {/* Logo */}
          <Link href="/" className="navbar__logo" style={{ lineHeight: 0, display: "block" }}>
            <Image
              src="/logo-boioot.png" alt="بيوت"
              width={220} height={84}
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
                  key={href} href={href}
                  className={["navbar__link", highlight ? "navbar__daily" : "", active ? "navbar__link--active" : ""].filter(Boolean).join(" ")}
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
                    <Link href="/dashboard" className="btn btn-primary btn-sm" style={{ textDecoration: "none", padding: "0.4rem 1rem" }}>
                      لوحة التحكم
                    </Link>
                  )}

                  {/* Messages icon — authenticated */}
                  <MessagesIconBtn
                    isActivePage={onMessagesPage}
                    unreadCount={unreadCount}
                    onClick={handleMessagesClick}
                  />

                  {/* Avatar */}
                  <Link
                    href="/dashboard/profile" title="الملف الشخصي"
                    style={{
                      display: "inline-flex", alignItems: "center", justifyContent: "center",
                      width: 36, height: 36, borderRadius: "50%", overflow: "hidden",
                      background: user?.profileImageUrl ? "transparent" : "var(--color-primary)",
                      border: "2px solid var(--color-border)",
                      flexShrink: 0, textDecoration: "none",
                      boxShadow: "0 1px 4px rgba(0,0,0,0.12)",
                    }}
                  >
                    {user?.profileImageUrl ? (
                      <img src={user.profileImageUrl} alt={user.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <span style={{ color: "#fff", fontSize: "0.8rem", fontWeight: 700 }}>
                        {user ? userInitials(user.fullName) : "؟"}
                      </span>
                    )}
                  </Link>

                  <button
                    onClick={handleLogout} className="btn btn-sm"
                    style={{ padding: "0.4rem 0.85rem", cursor: "pointer", background: "transparent", color: "#dc2626", border: "1.5px solid #dc2626", borderRadius: "6px" }}
                  >
                    تسجيل الخروج
                  </button>
                </>
              ) : (
                <>
                  {/* Messages icon — guest (opens auth modal) */}
                  <MessagesIconBtn
                    isActivePage={false}
                    unreadCount={0}
                    onClick={handleMessagesClick}
                  />

                  <Link href="/login" className="btn btn-outline btn-sm" style={{ textDecoration: "none", padding: "0.4rem 1rem" }}>
                    تسجيل الدخول
                  </Link>
                  <Link
                    href="/register" className="btn btn-sm"
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
    </>
  );
}
