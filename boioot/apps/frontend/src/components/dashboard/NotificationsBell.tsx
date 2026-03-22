"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

// ─── Type icon map ─────────────────────────────────────────────────────────────

function typeIcon(type: string): string {
  const map: Record<string, string> = {
    listing_approved:    "✅",
    listing_rejected:    "❌",
    new_request:         "📨",
    trial_warning:       "⚠️",
    trial_limit_reached: "🚫",
    system_alert:        "🔔",
  };
  return map[type] ?? "🔔";
}

// ─── NotificationsBell ────────────────────────────────────────────────────────

export default function NotificationsBell() {
  const [open,        setOpen]        = useState(false);
  const [unread,      setUnread]      = useState(0);
  const [items,       setItems]       = useState<NotificationItem[]>([]);
  const [loading,     setLoading]     = useState(false);
  const [markingAll,  setMarkingAll]  = useState(false);
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

  const handleMarkRead = async (id: string) => {
    await notificationsApi.markRead(id);
    setItems(prev =>
      prev.map(n => n.id === id ? { ...n, isRead: true } : n)
    );
    setUnread(prev => Math.max(0, prev - 1));
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
          {/* Header */}
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

          {/* Body */}
          {loading ? (
            <div
              style={{
                padding:    "32px",
                textAlign:  "center",
                color:      "#9ca3af",
                fontSize:   "13px",
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
              }}
            >
              لا توجد إشعارات بعد
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {items.map(n => (
                <li
                  key={n.id}
                  style={{
                    display:         "flex",
                    gap:             "10px",
                    padding:         "12px 16px",
                    background:      n.isRead ? "#fff" : "#f0fdf4",
                    borderBottom:    "1px solid #f3f4f6",
                    cursor:          n.isRead ? "default" : "pointer",
                    transition:      "background 0.15s",
                  }}
                  onClick={() => { if (!n.isRead) handleMarkRead(n.id); }}
                >
                  <span style={{ fontSize: "18px", flexShrink: 0, lineHeight: 1.4 }}>
                    {typeIcon(n.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p
                      style={{
                        margin:     0,
                        fontSize:   "13px",
                        fontWeight: n.isRead ? 400 : 700,
                        color:      "#111827",
                        lineHeight: 1.4,
                      }}
                    >
                      {n.title}
                    </p>
                    <p
                      style={{
                        margin:     "2px 0 0",
                        fontSize:   "12px",
                        color:      "#6b7280",
                        lineHeight: 1.4,
                        overflow:   "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
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
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
