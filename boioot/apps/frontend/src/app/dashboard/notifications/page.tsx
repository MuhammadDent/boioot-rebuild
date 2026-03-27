"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { notificationsApi, type NotificationItem } from "@/features/notifications/api";
import { resolveNotificationTarget } from "@/components/dashboard/NotificationsBell";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function fullDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString("ar-SY", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

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

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
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
          maxWidth:     "480px",
          width:        "100%",
          padding:      "28px",
          direction:    "rtl",
        }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <span style={{ fontSize: "32px" }}>{typeIcon(notification.type)}</span>
          <div>
            <p style={{ margin: 0, fontSize: "16px", fontWeight: 700, color: "#111827", lineHeight: 1.4 }}>
              {notification.title}
            </p>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#9ca3af" }}>
              {fullDate(notification.createdAt)}
            </p>
          </div>
        </div>

        <div style={{ height: "1px", background: "#f3f4f6", margin: "0 0 16px" }} />

        <p style={{ margin: 0, fontSize: "14px", color: "#374151", lineHeight: 1.75, whiteSpace: "pre-wrap" }}>
          {notification.body || "لا يوجد محتوى إضافي لهذا الإشعار."}
        </p>

        <div style={{ display: "flex", gap: "8px", marginTop: "24px", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: "8px 18px", borderRadius: "8px",
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
                padding: "8px 18px", borderRadius: "8px",
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

// ─── Main Page ────────────────────────────────────────────────────────────────

type Filter = "all" | "unread";

export default function NotificationsPage() {
  const router = useRouter();

  const [items,      setItems]      = useState<NotificationItem[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [filter,     setFilter]     = useState<Filter>("all");
  const [page,       setPage]       = useState(1);
  const [total,      setTotal]      = useState(0);
  const [unread,     setUnread]     = useState(0);
  const [detailItem, setDetailItem] = useState<NotificationItem | null>(null);
  const [hoveredId,  setHoveredId]  = useState<string | null>(null);

  const PAGE_SIZE = 25;

  const load = useCallback(async (p: number) => {
    setLoading(true);
    try {
      const result = await notificationsApi.getList(p, PAGE_SIZE);
      setItems(result.items);
      setTotal(result.total);
      setUnread(result.unread);
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

  const handleItemClick = async (n: NotificationItem) => {
    if (!n.isRead) handleMarkRead(n.id);
    const target = resolveNotificationTarget(n);
    if (target) {
      router.push(target);
    } else {
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

  const displayed = filter === "unread"
    ? items.filter(n => !n.isRead)
    : items;

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div style={{ padding: "24px", maxWidth: "720px", margin: "0 auto", direction: "rtl" }}>

      {/* Page header */}
      <div
        style={{
          display:         "flex",
          alignItems:      "center",
          justifyContent:  "space-between",
          marginBottom:    "20px",
          flexWrap:        "wrap",
          gap:             "12px",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#111827" }}>
            الإشعارات
          </h1>
          {unread > 0 && (
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              {unread} إشعار غير مقروء
            </p>
          )}
        </div>

        {unread > 0 && (
          <button
            type="button"
            onClick={handleMarkAll}
            disabled={markingAll}
            style={{
              padding:      "8px 16px",
              borderRadius: "8px",
              border:       "1px solid #d1fae5",
              background:   "#f0fdf4",
              color:        "#16a34a",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       "pointer",
            }}
          >
            {markingAll ? "جاري التعليم..." : "تعليم الكل كمقروء"}
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div
        style={{
          display:      "flex",
          gap:          "4px",
          marginBottom: "16px",
          background:   "#f3f4f6",
          borderRadius: "10px",
          padding:      "4px",
          width:        "fit-content",
        }}
      >
        {([ ["all", "الكل"], ["unread", "غير مقروءة"] ] as [Filter, string][]).map(([f, label]) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            style={{
              padding:      "6px 16px",
              borderRadius: "8px",
              border:       "none",
              background:   filter === f ? "#fff" : "transparent",
              color:        filter === f ? "#111827" : "#6b7280",
              fontSize:     "13px",
              fontWeight:   filter === f ? 600 : 400,
              cursor:       "pointer",
              boxShadow:    filter === f ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
              transition:   "all 0.12s",
            }}
          >
            {label}
            {f === "unread" && unread > 0 && (
              <span
                style={{
                  marginRight:  "6px",
                  background:   "#ef4444",
                  color:        "#fff",
                  fontSize:     "10px",
                  fontWeight:   700,
                  borderRadius: "999px",
                  padding:      "1px 5px",
                }}
              >
                {unread}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div
          style={{
            padding:    "60px",
            textAlign:  "center",
            color:      "#9ca3af",
            fontSize:   "14px",
          }}
        >
          جاري التحميل...
        </div>
      ) : displayed.length === 0 ? (
        <div
          style={{
            padding:      "60px 24px",
            textAlign:    "center",
            color:        "#9ca3af",
            fontSize:     "14px",
            background:   "#f9fafb",
            borderRadius: "12px",
          }}
        >
          {filter === "unread" ? "لا توجد إشعارات غير مقروءة" : "لا توجد إشعارات بعد"}
        </div>
      ) : (
        <div
          style={{
            background:   "#fff",
            border:       "1px solid #e5e7eb",
            borderRadius: "12px",
            overflow:     "hidden",
          }}
        >
          {displayed.map((n, idx) => {
            const isHovered = hoveredId === n.id;
            const target    = resolveNotificationTarget(n);
            const hasAction = !!target || !!n.body;

            return (
              <div
                key={n.id}
                role="button"
                tabIndex={0}
                style={{
                  display:      "flex",
                  gap:          "14px",
                  padding:      "16px 20px",
                  background:   isHovered
                    ? n.isRead ? "#f9fafb" : "#dcfce7"
                    : n.isRead ? "#fff"    : "#f0fdf4",
                  borderBottom: idx < displayed.length - 1 ? "1px solid #f3f4f6" : "none",
                  cursor:       hasAction ? "pointer" : "default",
                  transition:   "background 0.12s",
                  userSelect:   "none",
                }}
                onMouseEnter={() => setHoveredId(n.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => handleItemClick(n)}
                onKeyDown={e => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleItemClick(n);
                  }
                }}
              >
                {/* Icon */}
                <span style={{ fontSize: "22px", flexShrink: 0, lineHeight: 1.3, marginTop: "2px" }}>
                  {typeIcon(n.type)}
                </span>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin:     0,
                      fontSize:   "14px",
                      fontWeight: n.isRead ? 400 : 700,
                      color:      "#111827",
                      lineHeight: 1.4,
                    }}
                  >
                    {n.title}
                  </p>
                  <p
                    style={{
                      margin:       "4px 0 0",
                      fontSize:     "13px",
                      color:        "#6b7280",
                      lineHeight:   1.5,
                      overflow:     "hidden",
                      textOverflow: "ellipsis",
                      display:      "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical" as const,
                    }}
                  >
                    {n.body}
                  </p>
                  <p style={{ margin: "6px 0 0", fontSize: "11px", color: "#9ca3af" }}>
                    {relativeTime(n.createdAt)} · {fullDate(n.createdAt)}
                  </p>
                </div>

                {/* Unread dot + arrow hint */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", flexShrink: 0, marginTop: "4px" }}>
                  {!n.isRead && (
                    <span
                      style={{
                        width:        "9px",
                        height:       "9px",
                        borderRadius: "50%",
                        background:   "#16a34a",
                      }}
                    />
                  )}
                  {hasAction && (
                    <span style={{ fontSize: "12px", color: "#d1d5db" }}>‹</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display:        "flex",
            justifyContent: "center",
            gap:            "8px",
            marginTop:      "24px",
          }}
        >
          <button
            type="button"
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{
              padding:      "8px 16px",
              borderRadius: "8px",
              border:       "1px solid #e5e7eb",
              background:   page <= 1 ? "#f9fafb" : "#fff",
              color:        page <= 1 ? "#9ca3af" : "#374151",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       page <= 1 ? "default" : "pointer",
            }}
          >
            السابق
          </button>
          <span
            style={{
              padding:   "8px 16px",
              fontSize:  "13px",
              color:     "#6b7280",
              alignSelf: "center",
            }}
          >
            {page} / {totalPages}
          </span>
          <button
            type="button"
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{
              padding:      "8px 16px",
              borderRadius: "8px",
              border:       "1px solid #e5e7eb",
              background:   page >= totalPages ? "#f9fafb" : "#fff",
              color:        page >= totalPages ? "#9ca3af" : "#374151",
              fontSize:     "13px",
              fontWeight:   600,
              cursor:       page >= totalPages ? "default" : "pointer",
            }}
          >
            التالي
          </button>
        </div>
      )}

      {/* Detail modal */}
      {detailItem && (
        <DetailModal
          notification={detailItem}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}
