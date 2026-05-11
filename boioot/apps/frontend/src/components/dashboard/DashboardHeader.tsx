"use client";

import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import NotificationsBell from "./NotificationsBell";

// ─── Icon helper ──────────────────────────────────────────────────────────────

function Ic({ d, size = 18 }: { d: React.ReactNode; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {d}
    </svg>
  );
}

// ─── DashboardHeader ──────────────────────────────────────────────────────────

type Props = {
  onMenuToggle: () => void;
};

export default function DashboardHeader({ onMenuToggle }: Props) {
  const { user, hasPermission } = useAuth();

  const initial = user?.fullName?.charAt(0).toUpperCase() ?? "؟";
  const canPostAd = hasPermission("properties.create");

  return (
    <header className="dash-hdr">

      {/* Hamburger — mobile only */}
      <button
        className="dash-hdr__menu-btn"
        onClick={onMenuToggle}
        aria-label="تبديل القائمة الجانبية"
        type="button"
      >
        <Ic
          d={<><line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" /></>}
        />
      </button>

      {/* Logo — dir="ltr" so spans render Boi·oo·t left-to-right inside RTL page */}
      <Link href="/dashboard" className="dash-hdr__logo" dir="ltr">
        <span className="dash-hdr__logo-word">Boi</span>
        <span className="dash-hdr__logo-accent">oo</span>
        <span className="dash-hdr__logo-word">t</span>
      </Link>

      {/* Spacer */}
      <div className="dash-hdr__spacer" />

      {/* Actions */}
      <div className="dash-hdr__actions">

        {/* Messages */}
        <Link
          href="/dashboard/messages"
          className="dash-hdr__icon-btn"
          title="الرسائل"
        >
          <Ic
            d={<><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" /></>}
          />
        </Link>

        {/* Notifications bell */}
        <NotificationsBell />

        {/* Add listing button — visible only for users who can create listings */}
        {canPostAd && (
          <Link
            href="/post-ad"
            className="dash-hdr__add-btn"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
              padding: "0.35rem 0.85rem",
              borderRadius: 8,
              background: "var(--color-primary, #16a34a)",
              color: "#fff",
              textDecoration: "none",
              fontWeight: 700,
              fontSize: "0.82rem",
              whiteSpace: "nowrap",
              lineHeight: 1,
            }}
          >
            <Ic size={14} d={<><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></>} />
            <span className="dash-hdr__add-text">أضف إعلان</span>
          </Link>
        )}

        {/* Back to site */}
        <Link
          href="/"
          className="dash-hdr__icon-btn dash-hdr__icon-btn--secondary"
          title="العودة للموقع"
        >
          <Ic
            d={<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>}
          />
        </Link>

        {/* User avatar → profile */}
        <Link
          href="/dashboard/profile"
          className="dash-hdr__avatar"
          title="الملف الشخصي"
          aria-label="الملف الشخصي"
        >
          {user?.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt="صورة المستخدم"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }}
              style={{
                position: "absolute",
                top: 0, left: 0, right: 0, bottom: 0,
                width: "100%", height: "100%",
                objectFit: "cover", objectPosition: "center",
                display: "block",
                borderRadius: "50%",
              }}
            />
          ) : (
            <span className="dash-hdr__avatar-initial">{initial}</span>
          )}
        </Link>
      </div>
    </header>
  );
}
