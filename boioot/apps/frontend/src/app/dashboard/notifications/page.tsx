"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notificationsApi, type NotificationItem as NotificationModel } from "@/features/notifications/api";
import NotificationItem from "@/components/dashboard/notifications/NotificationItem";
import {
  fullNotificationDate,
  getNotificationTypeConfig,
  resolveNotificationTarget,
  shouldOpenSubscriptionRequestModal,
} from "@/components/dashboard/notifications/notificationTypeConfig";
import SubscriptionRequestDetailModal from "@/components/dashboard/SubscriptionRequestDetailModal";

function GenericDetailModal({
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
      style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 99999, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}
      onClick={onClose}
    >
      <div
        style={{ background: "#fff", borderRadius: "16px", boxShadow: "0 12px 40px rgba(0,0,0,0.18)", maxWidth: "480px", width: "100%", padding: "28px", direction: "rtl" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px" }}>{config.icon}</span>
          <div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>{notification.title}</p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>{fullNotificationDate(notification.createdAt)}</p>
          </div>
        </div>
        <div style={{ height: "1px", background: "#f3f4f6", margin: "0 0 16px" }} />
        <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
          {notification.body || "لا يوجد محتوى إضافي."}
        </p>
        <div style={{ display: "flex", gap: "8px", marginTop: "24px", justifyContent: "flex-end" }}>
          <button type="button" onClick={onClose}
            style={{ padding: "8px 18px", borderRadius: "8px", border: "1px solid #e5e7eb", background: "#fff", color: "#374151", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
            إغلاق
          </button>
          {target && (
            <button type="button" onClick={() => { onClose(); router.push(target); }}
              style={{ padding: "8px 18px", borderRadius: "8px", border: "none", background: "#16a34a", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}>
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

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const router = useRouter();

  const [items, setItems] = useState<NotificationModel[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [unread, setUnread] = useState(0);
  const [modal, setModal] = useState<ModalState>({ kind: "none" });
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const PAGE_SIZE = 25;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    setError(null);
    try {
      const result = await notificationsApi.getList(p, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      setUnread(result.unread);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "تعذّر تحميل الإشعارات";
      setError(msg);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(page); }, [load, page]);

  const handleMarkRead = async (id: string) => {
    try { await notificationsApi.markRead(id); } catch { /* still update UI */ }
    setItems(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
    setUnread(prev => Math.max(0, prev - 1));
  };

  const handleItemClick = (notification: NotificationModel) => {
    if (!notification.isRead) handleMarkRead(notification.id);

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
    } finally {
      setMarkingAll(false);
    }
  };

  const closeModal = () => setModal({ kind: "none" });

  const displayed = filter === "unread" ? items.filter(n => !n.isRead) : items;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ padding: "24px", maxWidth: "720px", margin: "0 auto", direction: "rtl" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>الإشعارات</h1>
          {unread > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>{unread} إشعار غير مقروء</p>
          )}
        </div>
        {unread > 0 && (
          <button
            type="button" onClick={handleMarkAll} disabled={markingAll}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #d1fae5", background: "#f0fdf4", color: "#16a34a", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            {markingAll ? "جاري التعليم..." : "تعليم الكل كمقروء"}
          </button>
        )}
      </div>

      <div style={{ display: "flex", gap: "4px", marginBottom: "16px", background: "#f3f4f6", borderRadius: "10px", padding: "4px", width: "fit-content" }}>
        {([ ["all", "الكل"], ["unread", "غير مقروءة"] ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f} type="button" onClick={() => setFilter(f)}
            style={{
              padding: "6px 16px", borderRadius: "8px", border: "none",
              background: filter === f ? "#fff" : "transparent",
              color: filter === f ? "#111827" : "#6b7280",
              fontSize: "13px", fontWeight: filter === f ? 600 : 400,
              cursor: "pointer", boxShadow: filter === f ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition: "all 0.12s",
            }}
          >
            {label}
            {f === "unread" && unread > 0 && (
              <span style={{ marginRight: "6px", background: "#ef4444", color: "#fff", fontSize: "10px", fontWeight: 700, borderRadius: "999px", padding: "1px 5px" }}>
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ padding: "60px", textAlign: "center", color: "#9ca3af", fontSize: "14px" }}>
          جاري التحميل...
        </div>
      ) : error ? (
        <div style={{ padding: "48px 24px", textAlign: "center", background: "#fff1f2", border: "1px solid #fecdd3", borderRadius: "12px" }}>
          <p style={{ margin: "0 0 12px", fontSize: "14px", color: "#be123c", fontWeight: 600 }}>
            تعذّر تحميل الإشعارات
          </p>
          <p style={{ margin: "0 0 16px", fontSize: "13px", color: "#9f1239" }}>{error}</p>
          <button
            type="button"
            onClick={() => load(page)}
            style={{ padding: "8px 20px", borderRadius: "8px", border: "none", background: "#be123c", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" }}
          >
            إعادة المحاولة
          </button>
        </div>
      ) : displayed.length === 0 ? (
        <div style={{ padding: "60px 24px", textAlign: "center", color: "#9ca3af", fontSize: "14px", background: "#f9fafb", borderRadius: "12px" }}>
          {filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات بعد"}
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", overflow: "hidden" }}>
          {displayed.map((notification, index) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              variant="page"
              isHovered={hoveredId === notification.id}
              isLast={index === displayed.length - 1}
              onHover={setHoveredId}
              onClick={handleItemClick}
            />
          ))}
        </div>
      )}

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
          <button type="button" disabled={page <= 1} onClick={() => setPage(p => p - 1)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: page <= 1 ? "#f9fafb" : "#fff", color: page <= 1 ? "#9ca3af" : "#374151", fontSize: "13px", fontWeight: 600, cursor: page <= 1 ? "default" : "pointer" }}>
            السابق
          </button>
          <span style={{ padding: "8px 16px", fontSize: "13px", color: "#6b7280", alignSelf: "center" }}>
            {page} / {totalPages}
          </span>
          <button type="button" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}
            style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid #e5e7eb", background: page >= totalPages ? "#f9fafb" : "#fff", color: page >= totalPages ? "#9ca3af" : "#374151", fontSize: "13px", fontWeight: 600, cursor: page >= totalPages ? "default" : "pointer" }}>
            التالي
          </button>
        </div>
      )}

      {modal.kind === "subscription_request" && (
        <SubscriptionRequestDetailModal
          requestId={modal.requestId}
          onClose={closeModal}
        />
      )}
      {modal.kind === "generic" && (
        <GenericDetailModal
          notification={modal.notification}
          onClose={closeModal}
        />
      )}
    </div>
  );
}
