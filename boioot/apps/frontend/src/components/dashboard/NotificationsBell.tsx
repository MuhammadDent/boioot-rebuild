"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { notificationsApi, type NotificationItem as NotificationModel } from "@/features/notifications/api";
import { useNotificationsRealtime } from "@/features/notifications/useNotificationsRealtime";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import {
  resolveNotificationTarget,
} from "@/components/dashboard/notifications/notificationTypeConfig";

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

export default function NotificationsBell() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [open, setOpen]           = useState(false);
  const [unread, setUnread]       = useState(0);
  const [items, setItems]         = useState<NotificationModel[]>([]);
  const [loading, setLoading]     = useState(false);
  const [markingAll, setMarkingAll] = useState(false);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mounted, setMounted]     = useState(false);

  const buttonRef   = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  type DropdownPos = { top: number; left: number; width: number };
  const [dropdownPos, setDropdownPos] = useState<DropdownPos | null>(null);

  useEffect(() => { setMounted(true); }, []);

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

  const handleRealtimeNotification = useCallback((notification: NotificationModel) => {
    let inserted = false;
    setItems(prev => {
      if (prev.some(item => item.id === notification.id)) return prev;
      inserted = true;
      return [notification, ...prev].slice(0, 10);
    });
    if (!notification.isRead && inserted) {
      setUnread(prev => prev + 1);
    }
  }, []);

  useNotificationsRealtime({
    enabled: isAuthenticated && !authLoading,
    onNotification: handleRealtimeNotification,
    onRecover: loadList,
  });

  const computePos = useCallback((): DropdownPos | null => {
    if (!buttonRef.current) return null;
    const rect = buttonRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const MARGIN = 12;
    const dropW = Math.min(340, vw - MARGIN * 2);
    // Anchor right edge of dropdown to right edge of button, then clamp within viewport
    let left = rect.right - dropW;
    left = Math.max(MARGIN, left);
    left = Math.min(vw - dropW - MARGIN, left);
    return { top: rect.bottom + 8, left, width: dropW };
  }, []);

  const handleToggle = () => {
    const next = !open;
    if (next) {
      setDropdownPos(computePos());
      loadList();
    }
    setOpen(next);
  };

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const insideButton   = buttonRef.current?.contains(target);
      const insideDropdown = dropdownRef.current?.contains(target);
      if (!insideButton && !insideDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const refresh = () => setDropdownPos(computePos());
    window.addEventListener("scroll", refresh, { passive: true, capture: true });
    window.addEventListener("resize", refresh);
    return () => {
      window.removeEventListener("scroll", refresh, { capture: true });
      window.removeEventListener("resize", refresh);
    };
  }, [open, computePos]);

  const handleMarkRead = async (id: string) => {
    try { await notificationsApi.markRead(id); } catch { /* still update UI */ }
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleNotificationClick = (notification: NotificationModel) => {
    if (!notification.isRead) handleMarkRead(notification.id);
    setOpen(false);
    router.push(resolveNotificationTarget(notification));
  };

  const handleMarkAll = async () => {
    setMarkingAll(true);
    try {
      await notificationsApi.markAllRead();
      setItems(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnread(0);
    } finally { setMarkingAll(false); }
  };

  const dropdown = mounted && open && dropdownPos ? (
    <div
      ref={dropdownRef}
      style={{
        position: "fixed",
        top:   dropdownPos.top,
        left:  dropdownPos.left,
        width: dropdownPos.width,
        maxHeight: "min(70vh, 560px)",
        overflowY: "auto",
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: "14px",
        boxShadow: "0 12px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.06)",
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        animation: "notif-slide-in 0.18s cubic-bezier(0.16,1,0.3,1) both",
      }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 16px", borderBottom: "1px solid #f3f4f6",
          position: "sticky", top: 0, background: "#fff", zIndex: 1,
        }}
      >
        <span style={{ fontWeight: 700, fontSize: "15px", color: "#111827" }}>
          الإشعارات
          {unread > 0 && (
            <span style={{ marginRight: "6px", background: "#ef4444", color: "#fff", fontSize: "11px", fontWeight: 700, borderRadius: "999px", padding: "2px 7px" }}>
              {unread}
            </span>
          )}
        </span>
        {unread > 0 && (
          <button
            type="button" onClick={handleMarkAll} disabled={markingAll}
            style={{ background: "none", border: "none", color: "#16a34a", fontSize: "13px", fontWeight: 600, cursor: "pointer", padding: "10px 8px", minHeight: 44, display: "flex", alignItems: "center" }}
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
          style={{ fontSize: "13px", fontWeight: 600, color: "#16a34a", textDecoration: "none", display: "inline-block", padding: "8px 12px", minHeight: 44, lineHeight: "28px" }}
        >
          عرض كل الإشعارات
        </Link>
      </div>
    </div>
  ) : null;

  return (
    <>
      <button
        ref={buttonRef}
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

      {mounted && dropdown !== null && createPortal(dropdown, document.body)}
    </>
  );
}
