"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { notificationsApi, type NotificationItem as NotificationModel } from "@/features/notifications/api";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import {
  getNotificationTypeConfig,
  relativeNotificationTime,
  resolveNotificationTarget,
  shouldOpenSubscriptionRequestModal,
} from "@/components/dashboard/notifications/notificationTypeConfig";
import SubscriptionRequestDetailModal from "./SubscriptionRequestDetailModal";

export { resolveNotificationTarget } from "@/components/dashboard/notifications/notificationTypeConfig";

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

function NotificationDetailModal({
  notification,
  onClose,
}: {
  notification: NotificationModel;
  onClose: () => void;
}) {
  const router = useRouter();
  const target = resolveNotificationTarget(notification);
  const config = getNotificationTypeConfig(notification.type);

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
          <span style={{ fontSize: "28px" }}>{config.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>
              {notification.title}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "11px", color: "#9ca3af" }}>
              {relativeNotificationTime(notification.createdAt)}
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

type ModalState =
  | { kind: "none" }
  | { kind: "subscription_request"; requestId: string }
  | { kind: "generic"; notification: NotificationModel };

export default function NotificationsBell() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
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
      const result = await notificationsApi.getList(1, 10);
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

  const handleNotificationClick = (notification: NotificationModel) => {
    if (!notification.isRead) handleMarkRead(notification.id);

    setOpen(false);

    if (shouldOpenSubscriptionRequestModal(notification) && notification.relatedEntityId) {
      setModal({ kind: "subscription_request", requestId: notification.relatedEntityId });
      return;
    }

    const target = resolveNotificationTarget(notification);
    if (target) {
      router.push(target);
      return;
    }

    setModal({ kind: "generic", notification });
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
                {items.map(notification => (
                  <NotificationItem
                    key={notification.id}
                    notification={notification}
                    variant="dropdown"
                    isHovered={hoveredId === notification.id}
                    onHover={setHoveredId}
                    onClick={handleNotificationClick}
                  />
                ))}
              </ul>
            )}

            <div
              style={{
                padding: "10px 16px", borderTop: "1px solid #f3f4f6",
                position: "sticky", bottom: 0, background: "#fff", textAlign: "center",
              }}
            >
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                style={{ fontSize: "12px", fontWeight: 600, color: "#16a34a", textDecoration: "none" }}
              >
                عرض كل الإشعارات
              </Link>
            </div>
          </div>
        )}
      </div>

      {modal.kind === "subscription_request" && (
        <SubscriptionRequestDetailModal
          requestId={modal.requestId}
          onClose={closeModal}
        />
      )}

      {modal.kind === "generic" && (
        <NotificationDetailModal
          notification={modal.notification}
          onClose={closeModal}
        />
      )}
    </>
  );
}
