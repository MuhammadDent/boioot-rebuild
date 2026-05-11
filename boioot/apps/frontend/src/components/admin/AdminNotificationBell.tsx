"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAdminNotifications } from "@/context/AdminNotificationsContext";
import type { NotificationItem } from "@/features/notifications/api";

// ─── Icon map for admin notification types ────────────────────────────────────

const ADMIN_ICONS: Record<string, string> = {
  verification_request:      "📋",
  verification_new_request:  "📋",
  verification_approved:     "✅",
  verification_rejected:     "📝",
  verification_updated:      "🔔",
  new_message:               "✉️",
  new_user:                  "👤",
  property_flagged:          "🚩",
  system_alert:              "🔔",
  listing_approved:          "✅",
  listing_rejected:          "❌",
  listing_featured:          "⭐",
  payment_proof_submitted:   "📤",
  payment_received:          "💳",
  payment_submitted:         "📤",
  subscription_receipt_uploaded: "🧾",
  subscription_request_created:  "📋",
  subscription_approved:     "🎉",
  subscription_rejected:     "❌",
  new_request:               "📨",
};

function getIcon(type: string): string {
  return ADMIN_ICONS[type] ?? "🔔";
}

// ─── Admin-specific routing ───────────────────────────────────────────────────

function resolveAdminTarget(notification: NotificationItem): string {
  const { type, relatedEntityId, relatedEntityType } = notification;

  if (
    type === "verification_request" ||
    type === "verification_new_request" ||
    relatedEntityType === "VerificationRequest"
  ) {
    return "/dashboard/admin/verification-requests";
  }

  if (type === "new_message") return "/dashboard/admin/messages";

  if (type === "new_user" || relatedEntityType === "User") {
    return "/dashboard/admin/users";
  }

  if (type === "property_flagged") {
    return relatedEntityId
      ? `/dashboard/admin/properties/${relatedEntityId}`
      : "/dashboard/admin/properties";
  }

  if (
    type === "listing_approved" ||
    type === "listing_rejected" ||
    type === "listing_featured"
  ) {
    return relatedEntityId
      ? `/dashboard/admin/properties/${relatedEntityId}`
      : "/dashboard/admin/properties";
  }

  if (type === "system_alert") return "/dashboard/admin";

  if (
    type === "subscription_request"         ||
    type === "subscription_request_created" ||
    type === "subscription_approved"        ||
    type === "subscription_rejected"        ||
    type === "subscription_missing_info"    ||
    type === "subscription_activated"
  ) {
    return "/dashboard/admin/subscriptions";
  }

  // Payment proof / payment receipt — always route to payment-requests with ID
  const isPaymentType =
    type === "payment_proof_submitted"   ||
    type === "payment_proof"             ||
    type === "payment_submitted"         ||
    type === "payment_received"          ||
    type === "payment_pending"           ||
    type === "subscription_receipt_uploaded";

  const isPaymentEntity =
    relatedEntityType === "Payment"                  ||
    relatedEntityType === "SubscriptionPaymentRequest" ||
    (relatedEntityType === "Booking" && isPaymentType);

  if (isPaymentType || isPaymentEntity) {
    return relatedEntityId
      ? `/dashboard/admin/payment-requests?id=${relatedEntityId}`
      : "/dashboard/admin/payment-requests";
  }

  if (type === "new_request" || relatedEntityType === "SpecialRequest") {
    return relatedEntityId
      ? `/dashboard/admin/special-requests/${relatedEntityId}`
      : "/dashboard/admin/special-requests";
  }

  if (
    type === "buyer_request_matched" ||
    relatedEntityType === "BuyerRequest"
  ) {
    return relatedEntityId
      ? `/dashboard/admin/buyer-requests/${relatedEntityId}`
      : "/dashboard/admin/buyer-requests";
  }

  if (relatedEntityType === "Property" && relatedEntityId) {
    return `/dashboard/admin/properties/${relatedEntityId}`;
  }

  return "/dashboard/admin";
}

// ─── Time helper ──────────────────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days = Math.floor(diff / 86_400_000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-SY");
}

// ─── Bell SVG ─────────────────────────────────────────────────────────────────

function BellIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function AdminNotificationBell() {
  const router = useRouter();
  const { notifications, unreadCount, isLoading, markAsRead, markAllAsRead } =
    useAdminNotifications();

  const [open, setOpen] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const handleNotificationClick = useCallback(
    (notification: NotificationItem) => {
      const target = resolveAdminTarget(notification);

      if (process.env.NODE_ENV === "development") {
        console.debug(
          "[AdminNotificationBell] click",
          { type: notification.type, relatedEntityType: notification.relatedEntityType, relatedEntityId: notification.relatedEntityId, target }
        );
      }

      if (!notification.isRead) markAsRead(notification.id);
      setOpen(false);
      router.push(target);
    },
    [markAsRead, router]
  );

  const handleMarkAll = useCallback(async () => {
    setMarkingAll(true);
    try {
      await markAllAsRead();
    } finally {
      setMarkingAll(false);
    }
  }, [markAllAsRead]);

  return (
    <>
      <style>{`
        @keyframes admin-notif-in {
          from { opacity: 0; transform: translateY(-8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1);    }
        }
      `}</style>

      <div ref={panelRef} style={{ position: "relative" }}>
        {/* ── Bell button ── */}
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-label="الإشعارات"
          title="الإشعارات"
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 36,
            height: 36,
            borderRadius: 8,
            border: open
              ? "1px solid rgba(255,255,255,0.25)"
              : "1px solid rgba(255,255,255,0.1)",
            color: open ? "#e2e8f0" : "#94a3b8",
            background: open ? "rgba(255,255,255,0.07)" : "none",
            cursor: "pointer",
            flexShrink: 0,
            transition: "color 0.15s, border-color 0.15s, background-color 0.15s",
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget as HTMLButtonElement;
            b.style.color = "#e2e8f0";
            b.style.borderColor = "rgba(255,255,255,0.25)";
          }}
          onMouseLeave={(e) => {
            if (open) return;
            const b = e.currentTarget as HTMLButtonElement;
            b.style.color = "#94a3b8";
            b.style.borderColor = "rgba(255,255,255,0.1)";
          }}
        >
          <BellIcon />

          {/* Unread badge */}
          {unreadCount > 0 && (
            <span
              aria-label={`${unreadCount} إشعار غير مقروء`}
              style={{
                position: "absolute",
                top: -4,
                insetInlineEnd: -4,
                background: "#ef4444",
                color: "#fff",
                borderRadius: 999,
                fontSize: "0.6rem",
                fontWeight: 700,
                minWidth: 16,
                height: 16,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 3px",
                lineHeight: 1,
                border: "1px solid #0f172a",
                pointerEvents: "none",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          )}
        </button>

        {/* ── Dropdown panel ── */}
        {open && (
          <div
            style={{
              position: "absolute",
              top: "calc(100% + 8px)",
              insetInlineEnd: 0,
              width: 340,
              maxWidth: "calc(100vw - 32px)",
              maxHeight: 480,
              backgroundColor: "#1e293b",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: 12,
              boxShadow: "0 16px 48px rgba(0,0,0,0.55)",
              zIndex: 9999,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
              animation: "admin-notif-in 0.15s ease both",
              direction: "rtl",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "12px 16px",
                borderBottom: "1px solid rgba(255,255,255,0.07)",
                flexShrink: 0,
                position: "sticky",
                top: 0,
                background: "#1e293b",
                zIndex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontWeight: 700, fontSize: 14, color: "#f1f5f9" }}>
                  الإشعارات
                </span>
                {unreadCount > 0 && (
                  <span
                    style={{
                      background: "#ef4444",
                      color: "#fff",
                      fontSize: 11,
                      fontWeight: 700,
                      borderRadius: 999,
                      padding: "1px 7px",
                      lineHeight: 1.6,
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </div>

              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  style={{
                    background: "none",
                    border: "none",
                    color: "#4ade80",
                    fontSize: 12,
                    fontWeight: 600,
                    cursor: "pointer",
                    padding: "2px 4px",
                    opacity: markingAll ? 0.5 : 1,
                    fontFamily: "inherit",
                    transition: "opacity 0.15s",
                  }}
                >
                  {markingAll ? "..." : "تعليم الكل كمقروء"}
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: "auto" }}>
              {isLoading ? (
                <div
                  style={{
                    padding: "32px 16px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  جاري التحميل...
                </div>
              ) : notifications.length === 0 ? (
                <div
                  style={{
                    padding: "40px 16px",
                    textAlign: "center",
                    color: "#64748b",
                    fontSize: 13,
                  }}
                >
                  لا توجد إشعارات بعد
                </div>
              ) : (
                <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                  {notifications.slice(0, 10).map((notif) => (
                    <li
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      onMouseEnter={() => setHoveredId(notif.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: "flex",
                        gap: 10,
                        padding: "12px 16px",
                        cursor: "pointer",
                        borderBottom: "1px solid rgba(255,255,255,0.04)",
                        background:
                          hoveredId === notif.id
                            ? "rgba(255,255,255,0.07)"
                            : notif.isRead
                            ? "transparent"
                            : "rgba(74,222,128,0.06)",
                        transition: "background 0.12s",
                        userSelect: "none",
                      }}
                    >
                      {/* Icon */}
                      <span
                        style={{
                          fontSize: 18,
                          flexShrink: 0,
                          lineHeight: 1.5,
                          marginTop: 1,
                        }}
                      >
                        {getIcon(notif.type)}
                      </span>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: 13,
                            fontWeight: notif.isRead ? 400 : 700,
                            color: notif.isRead ? "#94a3b8" : "#f1f5f9",
                            lineHeight: 1.4,
                          }}
                        >
                          {notif.title}
                        </p>
                        <p
                          style={{
                            margin: "3px 0 0",
                            fontSize: 12,
                            color: "#64748b",
                            lineHeight: 1.4,
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {notif.body}
                        </p>
                        <span
                          style={{
                            display: "block",
                            fontSize: 11,
                            color: "#475569",
                            marginTop: 4,
                          }}
                        >
                          {relativeTime(notif.createdAt)}
                        </span>
                      </div>

                      {/* Unread dot */}
                      {!notif.isRead && (
                        <span
                          style={{
                            width: 8,
                            height: 8,
                            borderRadius: "50%",
                            background: "#4ade80",
                            flexShrink: 0,
                            alignSelf: "flex-start",
                            marginTop: 5,
                          }}
                        />
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: "10px 16px",
                borderTop: "1px solid rgba(255,255,255,0.07)",
                textAlign: "center",
                flexShrink: 0,
                background: "#1e293b",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/dashboard/admin");
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "#4ade80",
                  fontSize: 12,
                  fontWeight: 600,
                  cursor: "pointer",
                  padding: "2px 8px",
                  fontFamily: "inherit",
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.textDecoration =
                    "underline";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.textDecoration =
                    "none";
                }}
              >
                عرض الكل
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
