"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi } from "@/features/dashboard/messages/api";
import { normalizeError } from "@/lib/api";
import type { ConversationSummary } from "@/types";

// Backend also returns lastMessage (not yet in the shared type)
type ConvWithLastMsg = ConversationSummary & { lastMessage?: string };

export default function AdminMessagesPage() {
  const { user, isLoading } = useProtectedRoute();
  const [conversations, setConversations] = useState<ConvWithLastMsg[]>([]);
  const [fetching, setFetching]           = useState(true);
  const [error, setError]                 = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    setError("");
    try {
      const list = await messagingApi.getConversations();
      setConversations(list);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  return (
    <div style={{ padding: "1.5rem", maxWidth: 680 }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <h1 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>الرسائل الواردة</h1>
        <button
          onClick={load}
          disabled={fetching}
          style={{
            fontSize: "0.78rem", padding: "0.3rem 0.8rem", borderRadius: 6,
            border: "1px solid rgba(0,0,0,0.15)", background: "transparent",
            cursor: "pointer", opacity: fetching ? 0.5 : 1,
          }}
        >
          تحديث
        </button>
      </div>

      {/* Error */}
      {error && (
        <div style={{
          padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem",
          background: "#fef2f2", border: "1px solid #fecaca", color: "#dc2626",
          fontSize: "0.875rem",
        }}>
          {error}
        </div>
      )}

      {/* Loading */}
      {fetching && !error && (
        <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem" }}>جاري التحميل...</p>
      )}

      {/* Empty */}
      {!fetching && !error && conversations.length === 0 && (
        <div style={{
          textAlign: "center", padding: "3rem 1rem",
          color: "var(--color-text-secondary)", fontSize: "0.9rem",
        }}>
          لا توجد محادثات بعد
        </div>
      )}

      {/* Conversation list */}
      {!fetching && conversations.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {conversations.map((c) => (
            <ConversationRow key={c.id} conv={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Single row ───────────────────────────────────────────────────────────────

function ConversationRow({ conv: c }: { conv: ConvWithLastMsg }) {
  const unread = (c.unreadCount ?? 0) > 0;

  const lastMsg = (() => {
    const txt = c.lastMessage ?? "";
    if (txt.startsWith("data:")) return "📎 مرفق";
    return txt.length > 60 ? txt.slice(0, 60) + "…" : txt;
  })();

  const timeLabel = c.lastMessageAt
    ? new Date(c.lastMessageAt).toLocaleDateString("ar-SY", {
        day: "numeric", month: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : "";

  return (
    <Link
      href={`/dashboard/admin/messages/${c.id}`}
      style={{ textDecoration: "none" }}
    >
      <div
        style={{
          display: "flex", alignItems: "center", gap: "0.75rem",
          padding: "0.85rem 1rem", borderRadius: 10,
          border: `1px solid ${unread ? "var(--color-primary)" : "rgba(0,0,0,0.09)"}`,
          background: unread ? "rgba(22,163,74,0.04)" : "#fff",
          transition: "box-shadow 0.15s",
          cursor: "pointer",
        }}
        onMouseEnter={e => (e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)")}
        onMouseLeave={e => (e.currentTarget.style.boxShadow = "none")}
      >
        {/* Avatar */}
        <div style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--color-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 700, fontSize: "0.95rem", flexShrink: 0,
        }}>
          {c.otherUserName?.[0]?.toUpperCase() ?? "؟"}
        </div>

        {/* Text */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontWeight: unread ? 700 : 500,
            fontSize: "0.92rem",
            color: "var(--color-text-primary)",
          }}>
            {c.otherUserName ?? "مستخدم"}
          </div>
          <div style={{
            fontSize: "0.8rem", color: "var(--color-text-secondary)",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            marginTop: "0.15rem",
          }}>
            {lastMsg || "لا توجد رسائل"}
          </div>
        </div>

        {/* Time + badge */}
        <div style={{ flexShrink: 0, textAlign: "start" }}>
          <div style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)" }}>{timeLabel}</div>
          {unread && (
            <div style={{
              marginTop: "0.3rem",
              background: "var(--color-primary)", color: "#fff",
              borderRadius: 999, padding: "0.1rem 0.5rem",
              fontSize: "0.7rem", fontWeight: 700, textAlign: "center",
            }}>
              {c.unreadCount}
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
