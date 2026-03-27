"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notificationsApi, type NotificationItem } from "@/features/notifications/api";

// ─── Bell icon ────────────────────────────────────────────────────────────────

function BellIcon({ size = 18 }: { size?: number }) {
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Relative time helper (Arabic) ────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);

  if (mins  < 1)  return "الآن";
  if (mins  < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days  < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-SY");
}

// ─── Type icon map (comprehensive) ───────────────────────────────────────────

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    // Listings
    listing_approved:             "✅",
    listing_rejected:             "❌",
    listing_featured:             "⭐",
    // Subscription / payments
    subscription_approved:        "🎉",
    subscription_rejected:        "❌",
    subscription_missing_info:    "📋",
    subscription_activated:       "🚀",
    payment_received:             "💳",
    payment_submitted:            "📤",
    payment_pending:              "⏳",
    // Requests
    new_request:                  "📨",
    request_comment:              "💬",
    request_reply:                "↩️",
    request_discussion_activity:  "💬",
    special_request_new:          "📋",
    // Alerts / system
    trial_warning:                "⚠️",
    trial_limit_reached:          "🚫",
    system_alert:                 "🔔",
    // Messages
    new_message:                  "✉️",
    new_comment:                  "💬",
  };
  return map[type] ?? "🔔";
}

// ─── Navigation resolver ──────────────────────────────────────────────────────
// Returns a URL when the notification has a navigable target page,
// or null when the details modal should open instead.

export function resolveNotificationTarget(n: NotificationItem): string | null {
  const { relatedEntityId, relatedEntityType, type } = n;

  // Entity-type based routing
  if (relatedEntityType && relatedEntityId) {
    switch (relatedEntityType) {
      case "SubscriptionPaymentRequest":
        // Users land on their subscription overview page
        return "/dashboard/subscription";
      case "BuyerRequest":
        return `/requests/${relatedEntityId}`;
      case "Property":
        return `/dashboard/properties/${relatedEntityId}`;
      case "SpecialRequest":
        return `/dashboard/requests/${relatedEntityId}`;
      default:
        break;
    }
  }

  // Type-based routing (fallback when entityType is missing)
  switch (type) {
    case "subscription_approved":
    case "subscription_rejected":
    case "subscription_missing_info":
    case "subscription_activated":
    case "payment_received":
    case "payment_submitted":
    case "payment_pending":
      return "/dashboard/subscription";
    case "new_message":
      return "/dashboard/messages";
    case "request_comment":
    case "request_reply":
    case "request_discussion_activity":
      if (relatedEntityId) return `/requests/${relatedEntityId}`;
      return null;
    default:
      return null;
  }
}

// ─── Notification detail modal ────────────────────────────────────────────────

function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: NotificationItem;
  onClose: () => void;
}) {
  const target = resolveNotificationTarget(notification);
  const router = useRouter();

  const handleGo = () => {
    if (target) {
      onClose();
      router.push(target);
    }
  };

  return (
    <div
      style={{
        position:       "fixed",
        inset:          0,
        background:     "rgba(0,0,0,0.45)",
        zIndex:         99999,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        padding:        "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background:   "#fff",
          borderRadius: "16px",
          boxShadow:    "0 12px 40px rgba(0,0,0,0.18)",
          maxWidth:     "440px",
          width:        "100%",
          padding:      "24px",
          direction:    "rtl",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Icon + type */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "28px" }}>{typeIcon(notification.type)}</span>
          <div>
            <p
              style={{
                margin:     0,
                fontSize:   "15px",
                fontWeight: 700,
                color:      "#111827",
                lineHeight: 1.4,
              }}
            >
              {notification.title}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#9ca3af" }}>
              {relativeTime(notification.createdAt)}
            </p>
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: "1px", background: "#f3f4f6", margin: "12px 0" }} />

        {/* Full body */}
        <p
          style={{
            margin:     0,
            fontSize:   "13px",
            color:      "#374151",
            lineHeight: 1.7,
            whiteSpace: "pre-wrap",
          }}
        >
          {notification.body || "لا يوجد محتوى إضافي لهذا الإشعار."}
        </p>

        {/* Actions */}
        <div
          style={{
            display:    "flex",
            gap:        "8px",
            marginTop:  "20px",
            justifyContent: "flex-end",
          }}
        >
          <button
            type="button"
            onClick={onClose}
            style={{
              padding:      "8px 16px",
              borderRadius: "8px",
              border:       "1px solid #e5e7eb",
              background:   "#fff",
              color:        "#374151",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            إغلاق
          </button>
          {target && (
            <button
              type="button"
              onClick={handleGo}
              style={{
                padding:      "8px 16px",
                borderRadius: "8px",
                border:       "none",
                background:   "#16a34a",
                color:        "#fff",
                fontSize:     "13px",
                fontWeight:   600,
                cursor:       "pointer",
              }}
            >
              عرض التفاصيل
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── NotificationsBell ────────────────────────────────────────────────────────

export default function NotificationsBell() {
  const router   = useRouter();
  const [open,           setOpen]           = useState(false);
  const [unread,         setUnread]         = useState(0);
  const [items,          setItems]          = useState<NotificationItem[]>([]);
  const [loading,        setLoading]        = useState(false);
  const [markingAll,     setMarkingAll]     = useState(false);
  const [hoveredId,      setHoveredId]      = useState<string | null>(null);
  const [detailItem,     setDetailItem]     = useState<NotificationItem | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Poll unread count every 60 s
  const fetchUnread = useCallback(async () => {
    try {
      const { total } = await notificationsApi.getUnreadCount();
      setUnread(total);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  // Load list when panel opens
  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.getList(1, 20);
      setItems(result.items);
      setUnread(result.unread);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  // Close on outside click — but NOT when detail modal is open
  useEffect(() => {
    if (!open || detailItem) return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, detailItem]);

  const handleMarkRead = async (id: string) => {
    try {
      await notificationsApi.markRead(id);
    } catch {
      // even if it fails, update UI so user can still open
    }
    setItems(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = async (n: NotificationItem) => {
    // Mark as read (non-blocking — don't await to keep UI snappy)
    if (!n.isRead) {
      handleMarkRead(n.id);
    }

    const target = resolveNotificationTarget(n);

    if (target) {
      // Has a navigable page → close dropdown then navigate
      setOpen(false);
      router.push(target);
    } else {
      // No dedicated page → open details modal
      setOpen(false);
      setDetailItem(n);
    }
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } finally {
      setMarkingAll(false);
    }
  };

  return (
    <>
      <div ref={panelRef} style={{ position: "relative" }}>

        {/* Bell button */}
        <button
          type="button"
          className="dash-hdr__icon-btn"
          onClick={handleToggle}
          aria-label="الإشعارات"
          title="الإشعارات"
          style={{ position: "relative" }}
        >
          <BellIcon />
          {unread > 0 && (
            <span
              aria-label={`${unread} إشعار غير مقروء`}
              style={{
                position:        "absolute",
                top:             "2px",
                insetInlineEnd:  "2px",
                minWidth:        "16px",
                height:          "16px",
                borderRadius:    "999px",
                background:      "#ef4444",
                color:           "#fff",
                fontSize:        "10px",
                fontWeight:      700,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                padding:         "0 3px",
                lineHeight:      1,
                pointerEvents:   "none",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {/* Dropdown panel */}
        {open && (
          <div
            style={{
              position:        "absolute",
              top:             "calc(100% + 8px)",
              insetInlineEnd:  0,
              width:           "340px",
              maxHeight:       "480px",
              overflowY:       "auto",
              background:      "#fff",
              border:          "1px solid #e5e7eb",
              borderRadius:    "12px",
              boxShadow:       "0 8px 24px rgba(0,0,0,0.12)",
              zIndex:          9999,
              display:         "flex",
              flexDirection:   "column",
            }}
          >
            {/* ── Header ── */}
            <div
              style={{
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "space-between",
                padding:         "12px 16px",
                borderBottom:    "1px solid #f3f4f6",
                position:        "sticky",
                top:             0,
                background:      "#fff",
                zIndex:          1,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>
                الإشعارات
                {unread > 0 && (
                  <span
                    style={{
                      marginRight:   "6px",
                      background:    "#ef4444",
                      color:         "#fff",
                      fontSize:      "11px",
                      fontWeight:    700,
                      borderRadius:  "999px",
                      padding:       "1px 6px",
                    }}
                  >
                    {unread}
                  </span>
                )}
              </span>
              {unread > 0 && (
                <button
                  type="button"
                  onClick={handleMarkAll}
                  disabled={markingAll}
                  style={{
                    background: "none",
                    border:     "none",
                    color:      "#16a34a",
                    fontSize:   "12px",
                    fontWeight: 600,
                    cursor:     "pointer",
                    padding:    "2px 4px",
                  }}
                >
                  {markingAll ? "..." : "تعليم الكل كمقروء"}
                </button>
              )}
            </div>

            {/* ── Body ── */}
            {loading ? (
              <div
                style={{
                  padding:    "32px",
                  textAlign:  "center",
                  color:      "#9ca3af",
                  fontSize:   "13px",
                  flex:       1,
                }}
              >
                جاري التحميل...
              </div>
            ) : items.length === 0 ? (
              <div
                style={{
                  padding:    "40px 16px",
                  textAlign:  "center",
                  color:      "#9ca3af",
                  fontSize:   "13px",
                  flex:       1,
                }}
              >
                لا توجد إشعارات بعد
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
                {items.map(n => {
                  const isHovered = hoveredId === n.id;
                  const target    = resolveNotificationTarget(n);
                  const hasAction = !!target || !!n.body;

                  return (
                    <li
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      style={{
                        display:         "flex",
                        gap:             "10px",
                        padding:         "12px 16px",
                        background:      isHovered
                          ? n.isRead ? "#f9fafb" : "#dcfce7"
                          : n.isRead ? "#fff"    : "#f0fdf4",
                        borderBottom:    "1px solid #f3f4f6",
                        cursor:          hasAction ? "pointer" : "default",
                        transition:      "background 0.12s",
                        userSelect:      "none",
                      }}
                      onMouseEnter={() => setHoveredId(n.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => handleNotificationClick(n)}
                      onKeyDown={e => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          handleNotificationClick(n);
                        }
                      }}
                    >
                      {/* Icon */}
                      <span style={{ fontSize: "18px", flexShrink: 0, lineHeight: 1.4 }}>
                        {typeIcon(n.type)}
                      </span>

                      {/* Text */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin:       0,
                            fontSize:     "13px",
                            fontWeight:   n.isRead ? 400 : 700,
                            color:        "#111827",
                            lineHeight:   1.4,
                          }}
                        >
                          {n.title}
                        </p>
                        <p
                          style={{
                            margin:       "2px 0 0",
                            fontSize:     "12px",
                            color:        "#6b7280",
                            lineHeight:   1.4,
                            overflow:     "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace:   "nowrap",
                          }}
                        >
                          {n.body}
                        </p>
                        <p
                          style={{
                            margin:   "4px 0 0",
                            fontSize: "11px",
                            color:    "#9ca3af",
                          }}
                        >
                          {relativeTime(n.createdAt)}
                        </p>
                      </div>

                      {/* Unread dot */}
                      {!n.isRead && (
                        <span
                          style={{
                            width:        "8px",
                            height:       "8px",
                            borderRadius: "50%",
                            background:   "#16a34a",
                            flexShrink:   0,
                            marginTop:    "5px",
                          }}
                        />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* ── Footer ── */}
            <div
              style={{
                padding:         "10px 16px",
                borderTop:       "1px solid #f3f4f6",
                position:        "sticky",
                bottom:          0,
                background:      "#fff",
                textAlign:       "center",
              }}
            >
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                style={{
                  fontSize:   "12px",
                  fontWeight: 600,
                  color:      "#16a34a",
                  textDecoration: "none",
                }}
              >
                عرض كل الإشعارات
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Detail modal (rendered outside dropdown so z-index is guaranteed) */}
      {detailItem && (
        <NotificationDetailModal
          notification={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </>
  );
}
