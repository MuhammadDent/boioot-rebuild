"use client";

import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function AdminToolbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    if (menuOpen) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  function handleLogout() {
    logout();
    router.push("/login");
  }

  const initial = user?.fullName?.trim().charAt(0).toUpperCase() ?? "م";

  return (
    <header
      style={{
        position: "sticky",
        top: 0,
        zIndex: 300,
        height: 52,
        backgroundColor: "#0f172a",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
        display: "flex",
        alignItems: "center",
        paddingInlineStart: "1rem",
        paddingInlineEnd: "1rem",
        gap: "0.75rem",
        flexShrink: 0,
      }}
    >
      {/* Logo */}
      <Link
        href="/dashboard/admin"
        dir="ltr"
        style={{
          fontSize: "1.1rem",
          fontWeight: 800,
          textDecoration: "none",
          color: "#ffffff",
          letterSpacing: "-0.02em",
          lineHeight: 1,
        }}
      >
        <span>Boi</span>
        <span style={{ color: "#4ade80" }}>oo</span>
        <span>t</span>
      </Link>

      {/* Backoffice badge */}
      <span
        style={{
          fontSize: "0.65rem",
          fontWeight: 700,
          color: "#4b5563",
          backgroundColor: "rgba(255,255,255,0.06)",
          borderRadius: 20,
          padding: "0.15rem 0.55rem",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        Backoffice
      </span>

      {/* Spacer */}
      <div style={{ flex: 1 }} />

      {/* View website */}
      <a
        href="/"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.8rem",
          color: "#94a3b8",
          textDecoration: "none",
          padding: "0.3rem 0.7rem",
          borderRadius: 6,
          border: "1px solid rgba(255,255,255,0.1)",
          transition: "color 0.15s, border-color 0.15s",
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLAnchorElement).style.color = "#e2e8f0";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.25)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
          (e.currentTarget as HTMLAnchorElement).style.borderColor = "rgba(255,255,255,0.1)";
        }}
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
          <polyline points="15 3 21 3 21 9" />
          <line x1="10" y1="14" x2="21" y2="3" />
        </svg>
        عرض الموقع
      </a>

      {/* User menu */}
      <div ref={menuRef} style={{ position: "relative" }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            background: "none",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: 8,
            padding: "0.3rem 0.65rem",
            cursor: "pointer",
            color: "#e2e8f0",
            fontSize: "0.8rem",
            fontFamily: "inherit",
            transition: "border-color 0.15s, background-color 0.15s",
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.06)";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.2)";
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
            (e.currentTarget as HTMLButtonElement).style.borderColor = "rgba(255,255,255,0.12)";
          }}
        >
          {/* Avatar circle */}
          <div
            style={{
              width: 26,
              height: 26,
              borderRadius: "50%",
              backgroundColor: "#16a34a",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "0.72rem",
              fontWeight: 700,
              color: "#fff",
              flexShrink: 0,
            }}
          >
            {initial}
          </div>
          <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {user?.fullName ?? "مدير"}
          </span>
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{ opacity: 0.5, transform: menuOpen ? "rotate(180deg)" : "none", transition: "transform 0.15s" }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {/* Dropdown */}
        {menuOpen && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 6px)",
              insetInlineEnd: 0,
              minWidth: 180,
              backgroundColor: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 10,
              boxShadow: "0 8px 30px rgba(0,0,0,0.4)",
              overflow: "hidden",
              zIndex: 400,
            }}
          >
            {/* User info header */}
            <div
              style={{
                padding: "0.75rem 1rem",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#f1f5f9" }}>
                {user?.fullName}
              </div>
              <div style={{ fontSize: "0.72rem", color: "#64748b", marginTop: "0.15rem" }}>
                {user?.email}
              </div>
            </div>

            {/* Profile link */}
            <Link
              href="/dashboard/profile"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 1rem",
                fontSize: "0.82rem",
                color: "#94a3b8",
                textDecoration: "none",
                transition: "background-color 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#e2e8f0";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              الملف الشخصي
            </Link>

            {/* View website link */}
            <a
              href="/"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 1rem",
                fontSize: "0.82rem",
                color: "#94a3b8",
                textDecoration: "none",
                transition: "background-color 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#e2e8f0";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <line x1="2" y1="12" x2="22" y2="12" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              عرض الموقع العام
            </a>

            {/* View properties */}
            <a
              href="/properties"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setMenuOpen(false)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                padding: "0.6rem 1rem",
                fontSize: "0.82rem",
                color: "#94a3b8",
                textDecoration: "none",
                transition: "background-color 0.12s, color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(255,255,255,0.05)";
                (e.currentTarget as HTMLAnchorElement).style.color = "#e2e8f0";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "transparent";
                (e.currentTarget as HTMLAnchorElement).style.color = "#94a3b8";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                <polyline points="9 22 9 12 15 12 15 22" />
              </svg>
              العقارات العامة
            </a>

            {/* Divider */}
            <div style={{ height: 1, backgroundColor: "rgba(255,255,255,0.07)", margin: "0.25rem 0" }} />

            {/* Logout */}
            <button
              onClick={handleLogout}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.6rem",
                width: "100%",
                padding: "0.6rem 1rem",
                fontSize: "0.82rem",
                color: "#f87171",
                background: "none",
                border: "none",
                cursor: "pointer",
                fontFamily: "inherit",
                textAlign: "start",
                transition: "background-color 0.12s",
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(239,68,68,0.08)";
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              تسجيل الخروج
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
