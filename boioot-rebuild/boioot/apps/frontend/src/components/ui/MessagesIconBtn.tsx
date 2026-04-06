"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { messagingApi } from "@/features/dashboard/messages/api";

// Animations live in globals.css: msg-badge-bounce, msg-ripple, msg-tooltip-in

// ─── Props ────────────────────────────────────────────────────────────────────

interface MessagesIconBtnProps {
  isActivePage: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  /** Optional override — if omitted the button polls its own count. */
  unreadCount?: number;
  size?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function MessagesIconBtn({
  isActivePage,
  onClick,
  unreadCount: unreadProp,
  size = 36,
}: MessagesIconBtnProps) {
  const { isAuthenticated } = useAuth();

  // Self-contained unread count (used when parent does not supply the value)
  const [selfCount, setSelfCount] = useState(0);
  const count = unreadProp !== undefined ? unreadProp : selfCount;

  useEffect(() => {
    if (unreadProp !== undefined) return;       // parent manages it
    if (!isAuthenticated) { setSelfCount(0); return; }

    const fetch = async () => {
      try {
        const data = await messagingApi.getUnreadCount();
        setSelfCount(data.total ?? 0);
      } catch { /* silently ignore */ }
    };

    void fetch();
    const id = setInterval(() => { void fetch(); }, 30_000);
    return () => clearInterval(id);
  }, [isAuthenticated, unreadProp]);

  // Tooltip
  const [tooltip, setTooltip] = useState(false);

  // Badge bounce on new message
  const [badgeAnimating, setBadgeAnim] = useState(false);
  const prevCountRef = useRef(0);
  const animTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (count > prevCountRef.current) {
      setBadgeAnim(true);
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
      animTimerRef.current = setTimeout(() => setBadgeAnim(false), 750);
    }
    prevCountRef.current = count;
    return () => {
      if (animTimerRef.current) clearTimeout(animTimerRef.current);
    };
  }, [count]);

  // Click ripple
  const [ripples, setRipples] = useState<{ id: number; x: number; y: number }[]>([]);
  const rippleId = useRef(0);

  function handleClick(e: React.MouseEvent<HTMLButtonElement>) {
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
  const borderWidth = isActivePage ? "2px" : "1.5px";

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
          width: size,
          height: size,
          borderRadius: "50%",
          border: `${borderWidth} solid ${borderColor}`,
          background: bg,
          cursor: "pointer",
          flexShrink: 0,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          transition: "border-color 0.15s, background 0.15s, box-shadow 0.15s",
          overflow: "hidden",
          padding: 0,
        }}
      >
        {/* Chat bubble SVG */}
        <svg
          width={Math.round(size * 0.47)}
          height={Math.round(size * 0.47)}
          viewBox="0 0 24 24"
          fill="none"
          stroke={iconColor}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
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
              width: size,
              height: size,
              borderRadius: "50%",
              background: isActivePage
                ? "rgba(34,197,94,0.35)"
                : "rgba(100,116,139,0.28)",
              transform: "translate(-50%, -50%) scale(0)",
              animation: "msg-ripple 0.6s ease-out forwards",
              pointerEvents: "none",
              zIndex: 0,
            }}
          />
        ))}

        {/* Unread badge */}
        {count > 0 && (
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
              animation: badgeAnimating
                ? "msg-badge-bounce 0.75s cubic-bezier(.36,.07,.19,.97)"
                : "none",
              zIndex: 2,
            }}
          >
            {count > 99 ? "99+" : count}
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
          <span
            style={{
              position: "absolute",
              top: "100%",
              left: "50%",
              transform: "translateX(-50%)",
              width: 0,
              height: 0,
              borderLeft: "5px solid transparent",
              borderRight: "5px solid transparent",
              borderTop: "5px solid rgba(15,23,42,0.88)",
            }}
          />
        </div>
      )}
    </div>
  );
}
