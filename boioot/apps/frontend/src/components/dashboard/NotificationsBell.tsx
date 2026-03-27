"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notificationsApi, type NotificationItem } from "@/features/notifications/api";
import SubscriptionRequestDetailModal from "./SubscriptionRequestDetailModal";

// ─── Bell icon ────────────────────────────────────────────────────────────────

function BellIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24"
      fill="none" stroke="currentColor" strokeWidth="2"
      strokeLinecap="round" strokeLinejoin="round"
    >
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  );
}

// ─── Relative time (Arabic) ───────────────────────────────────────────────────

function relativeTime(dateStr: string): string {
  const diff  = Date.now() - new Date(dateStr).getTime();
  const mins  = Math.floor(diff / 60_000);
  const hours = Math.floor(diff / 3_600_000);
  const days  = Math.floor(diff / 86_400_000);
  if (mins  < 1)  return "الآن";
  if (mins  < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days  < 30) return `منذ ${days} يوم`;
  return new Date(dateStr).toLocaleDateString("ar-SY");
}

// ─── Type icon map ────────────────────────────────────────────────────────────

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    listing_approved:             "✅",
    listing_rejected:             "❌",
    listing_featured:             "⭐",
    subscription_approved:        "🎉",
    subscription_rejected:        "❌",
    subscription_missing_info:    "📋",
    subscription_activated:       "🚀",
    payment_received:             "💳",
    payment_submitted:            "📤",
    payment_pending:              "⏳",
    new_request:                  "📨",
    request_comment:              "💬",
    request_reply:                "↩️",
    request_discussion_activity:  "💬",
    special_request_new:          "📋",
    trial_warning:                "⚠️",
    trial_limit_reached:          "🚫",
    system_alert:                 "🔔",
    new_message:                  "✉️",
    new_comment:                  "💬",
  };
  return map[type] ?? "🔔";
}

// ─── Action label for subscription-related notifications ──────────────────────

function actionLabel(n: NotificationItem): string | null {
  if (n.relatedEntityType === "SubscriptionPaymentRequest") {
    if (n.type === "subscription_approved")     return "عرض الموافقة";
    if (n.type === "subscription_rejected")     return "عرض سبب الرفض";
    if (n.type === "subscription_missing_info") return "عرض المطلوب";
    return "عرض الرد";
  }
  if (n.relatedEntityType === "BuyerRequest" || n.relatedEntityType === "SpecialRequest") {
    return "عرض الطلب";
  }
  return null;
}

// ─── Decision badge ───────────────────────────────────────────────────────────

function DecisionBadge({ type }: { type: string }) {
  const map: Record<string, { label: string; color: string; bg: string }> = {
    subscription_approved:        { label: "موافقة",        color: "#166534", bg: "#dcfce7" },
    subscription_rejected:        { label: "رفض",           color: "#b91c1c", bg: "#fee2e2" },
    subscription_missing_info:    { label: "استكمال مطلوب", color: "#92400e", bg: "#fef3c7" },
    subscription_activated:       { label: "مُفعَّل",       color: "#166534", bg: "#bbf7d0" },
  };
  const meta = map[type];
  if (!meta) return null;
  return (
    <span
      style={{
        fontSize:     "10px",
        fontWeight:   700,
        color:        meta.color,
        background:   meta.bg,
        borderRadius: "999px",
        padding:      "1px 6px",
        whiteSpace:   "nowrap",
        marginTop:    "3px",
        alignSelf:    "flex-start",
        display:      "inline-block",
      }}
    >
      {meta.label}
    </span>
  );
}

// ─── Notification target resolver ─────────────────────────────────────────────
// Returns a URL for direct navigation, null when a modal should open instead.

export function resolveNotificationTarget(n: NotificationItem): string | null {
  const { relatedEntityId, relatedEntityType, type } = n;

  // Subscription payment requests → always open detail modal (return null)
  if (
    relatedEntityType === "SubscriptionPaymentRequest" ||
    type === "subscription_approved" ||
    type === "subscription_rejected" ||
    type === "subscription_missing_info" ||
    type === "subscription_activated"
  ) {
    return null;
  }

  if (relatedEntityType && relatedEntityId) {
    switch (relatedEntityType) {
      case "BuyerRequest":    return `/requests/${relatedEntityId}`;
      case "Property":        return `/dashboard/properties/${relatedEntityId}`;
      case "SpecialRequest":  return `/dashboard/requests/${relatedEntityId}`;
      default: break;
    }
  }

  // Type-based fallbacks
  if (type === "new_message")    return "/dashboard/messages";
  if ((type === "request_comment" || type === "request_reply") && relatedEntityId)
    return `/requests/${relatedEntityId}`;

  return null;
}

// ─── Generic notification detail modal ───────────────────────────────────────

function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: NotificationItem;
  onClose: () => void;
}) {
  const router = useRouter();
  const target = resolveNotificationTarget(notification);

  return (
    <div
      style={{
        position: "fixed", inset: 0,
        background: "rgba(0,0,0,0.45)",
        zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "#fff", borderRadius: "16px",
          boxShadow: "0 12px 40px rgba(0,0,0,0.18)",
          maxWidth: "440px", width: "100%",
          padding: "24px", direction: "rtl",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
          <span style={{ fontSize: "28px" }}>{typeIcon(notification.type)}</span>
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>
              {notification.title}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#9ca3af" }}>
              {relativeTime(notification.createdAt)}
            </p>
          </div>
        </div>
        <div style={{ height: "1px", background: "#f3f4f6", margin: "12px 0" }} />
        <p style={{ margin: 0, fontSize: "13px", color: "#374151", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>
          {notification.body || "لا يوجد محتوى إضافي."}
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "20px", justifyContent: "flex-end" }}>
          <button
            type="button" onClick={onClose}
            style={{
              padding: "8px 16px", borderRadius: "8px",
              border: "1px solid #e5e7eb", background: "#fff",
              color: "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer",
            }}
          >
            إغلاق
          </button>
          {target && (
            <button
              type="button"
              onClick={() => { onClose(); router.push(target); }}
              style={{
                padding: "8px 16px", borderRadius: "8px",
                border: "none", background: "#16a34a",
                color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer",
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

type ModalState =
  | { kind: "none" }
  | { kind: "subscription_request"; requestId: string }
  | { kind: "generic"; notification: NotificationItem };

export default function NotificationsBell() {
  const router    = useRouter();
  const [open,        setOpen]        = useState(false);
  const [unread,      setUnread]      = useState(0);
  const [items,       setItems]       = useState<NotificationItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [markingAll,  setMarkingAll]  = useState(false);
  const [hoveredId,   setHoveredId]   = useState<string | null>(null);
  const [modal,       setModal]       = useState<ModalState>({ kind: "none" });
  const panelRef = useRef<HTMLDivElement>(null);

  const fetchUnread = useCallback(async () => {
    try {
      const { total } = await notificationsApi.getUnreadCount();
      setUnread(total);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnread();
    const id = setInterval(fetchUnread, 60_000);
    return () => clearInterval(id);
  }, [fetchUnread]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const result = await notificationsApi.getList(1, 20);
      setItems(result.items);
      setUnread(result.unread);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next) loadList();
  };

  // Close on outside click (skip when any modal is open)
  useEffect(() => {
    if (!open || modal.kind !== "none") return;
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, modal]);

  const handleMarkRead = async (id: string) => {
    try { await notificationsApi.markRead(id); } catch { /* still update UI */ }
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (n: NotificationItem) => {
    // Mark as read non-blocking
    if (!n.isRead) handleMarkRead(n.id);

    setOpen(false);

    // Subscription payment request → rich detail modal
    if (n.relatedEntityType === "SubscriptionPaymentRequest" && n.relatedEntityId) {
      setModal({ kind: "subscription_request", requestId: n.relatedEntityId });
      return;
    }

    // Has direct navigation target
    const target = resolveNotificationTarget(n);
    if (target) {
      router.push(target);
      return;
    }

    // Fallback: generic body modal
    setModal({ kind: "generic", notification: n });
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } finally { setMarkingAll(false); }
  };

  const closeModal = () => setModal({ kind: "none" });

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
                position: "absolute", top: "2px", insetInlineEnd: "2px",
                minWidth: "16px", height: "16px", borderRadius: "999px",
                background: "#ef4444", color: "#fff",
                fontSize: "10px", fontWeight: 700,
                display: "flex", alignItems: "center", justifyContent: "center",
                padding: "0 3px", lineHeight: 1, pointerEvents: "none",
              }}
            >
              {unread > 99 ? "99+" : unread}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div
            style={{
              position: "absolute", top: "calc(100% + 8px)", insetInlineEnd: 0,
              width: "340px", maxHeight: "480px", overflowY: "auto",
              background: "#fff", border: "1px solid #e5e7eb",
              borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
              zIndex: 9999, display: "flex", flexDirection: "column",
            }}
          >
            {/* Header */}
            <div
              style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "12px 16px", borderBottom: "1px solid #f3f4f6",
                position: "sticky", top: 0, background: "#fff", zIndex: 1,
              }}
            >
              <span style={{ fontWeight: 700, fontSize: "14px", color: "#111827" }}>
                الإشعارات
                {unread > 0 && (
                  <span style={{ marginRight: "6px", background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "1px 6px" }}>
                    {unread}
                  </span>
                )}
              </span>
              {unread > 0 && (
                <button
                  type="button" onClick={handleMarkAll} disabled={markingAll}
                  style={{ background: "none", border: "none", color: "#16a34a", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "2px 4px" }}
                >
                  {markingAll ? "..." : "تعليم الكل كمقروء"}
                </button>
              )}
            </div>

            {/* Body */}
            {loading ? (
              <div style={{ padding: "32px", textAlign: "center", color: "#9ca3af", fontSize: "13px", flex: 1 }}>
                جاري التحميل...
              </div>
            ) : items.length === 0 ? (
              <div style={{ padding: "40px 16px", textAlign: "center", color: "#9ca3af", fontSize: "13px", flex: 1 }}>
                لا توجد إشعارات بعد
              </div>
            ) : (
              <ul style={{ listStyle: "none", margin: 0, padding: 0, flex: 1 }}>
                {items.map(n => {
                  const isHovered = hoveredId === n.id;
                  const label     = actionLabel(n);
                  return (
                    <li
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      style={{
                        display: "flex", gap: "10px", padding: "12px 16px",
                        background: isHovered ? (n.isRead ? "#f9fafb" : "#dcfce7") : (n.isRead ? "#fff" : "#f0fdf4"),
                        borderBottom: "1px solid #f3f4f6",
                        cursor: "pointer", transition: "background 0.12s", userSelect: "none",
                      }}
                      onMouseEnter={() => setHoveredId(n.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      onClick={() => handleNotificationClick(n)}
                      onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handleNotificationClick(n); } }}
                    >
                      <span style={{ fontSize: "18px", flexShrink: 0, lineHeight: 1.4 }}>
                        {typeIcon(n.type)}
                      </span>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontSize: "13px", fontWeight: n.isRead ? 400 : 700, color: "#111827", lineHeight: 1.4 }}>
                          {n.title}
                        </p>
                        <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#6b7280", lineHeight: 1.4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {n.body}
                        </p>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginTop: "4px", flexWrap: "wrap" }}>
                          <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                            {relativeTime(n.createdAt)}
                          </span>
                          <DecisionBadge type={n.type} />
                          {label && (
                            <span
                              style={{
                                fontSize: "10px", fontWeight: 700,
                                color: "#1d4ed8", background: "#dbeafe",
                                borderRadius: "999px", padding: "1px 7px",
                                cursor: "pointer",
                              }}
                            >
                              {label} ›
                            </span>
                          )}
                        </div>
                      </div>
                      {!n.isRead && (
                        <span style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#16a34a", flexShrink: 0, marginTop: "5px" }} />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer */}
            <div
              style={{
                padding: "10px 16px", borderTop: "1px solid #f3f4f6",
                position: "sticky", bottom: 0, background: "#fff", textAlign: "center",
              }}
            >
              <Link
                href="/dashboard/notifications"
                onClick={() => setOpen(false)}
                style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a", textDecoration: "none" }}
              >
                عرض كل الإشعارات
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Subscription request detail modal */}
      {modal.kind === "subscription_request" && (
        <SubscriptionRequestDetailModal
          requestId={modal.requestId}
          onClose={closeModal}
        />
      )}

      {/* Generic notification detail modal */}
      {modal.kind === "generic" && (
        <NotificationDetailModal
          notification={modal.notification}
          onClose={closeModal}
        />
      )}
    </>
  );
}
