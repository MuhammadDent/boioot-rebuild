"use client";

import { useEffect, useState } from "react";
import { messagesService } from "@/services/messages.service";
import Spinner from "@/components/ui/Spinner";
import EmptyState from "@/components/ui/EmptyState";
import type { ConversationSummaryResponse } from "@/types";

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `منذ ${mins} دقيقة`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `منذ ${hrs} ساعة`;
  return new Date(dateStr).toLocaleDateString("ar-SY");
}

export default function DashboardMessagesPage() {
  const [conversations, setConversations] = useState<ConversationSummaryResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    messagesService
      .getConversations()
      .then(setConversations)
      .catch(() => setError("تعذّر تحميل الرسائل."))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <div className="page-header">
        <h1 className="page-header__title">الرسائل</h1>
        <p className="page-header__subtitle">محادثاتك مع العملاء</p>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {loading ? (
        <Spinner />
      ) : conversations.length === 0 ? (
        <EmptyState icon="💬" title="لا توجد رسائل" description="لم تبدأ أي محادثة بعد" />
      ) : (
        <div className="data-table-wrap">
          {conversations.map((c) => (
            <div
              key={c.id}
              style={{
                padding: "1rem 1.25rem",
                borderBottom: "1px solid var(--color-border)",
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "1rem",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: c.unreadCount > 0 ? 700 : 500 }}>
                    {c.otherUserName}
                  </span>
                  {c.unreadCount > 0 && (
                    <span className="badge badge-green" style={{ fontSize: "0.7rem" }}>
                      {c.unreadCount} جديدة
                    </span>
                  )}
                </div>
                {(c.propertyTitle ?? c.projectTitle) && (
                  <p style={{ fontSize: "0.82rem", color: "var(--color-text-muted)", margin: 0 }}>
                    📎 {c.propertyTitle ?? c.projectTitle}
                  </p>
                )}
              </div>
              <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", flexShrink: 0 }}>
                {c.lastMessageAt ? timeAgo(c.lastMessageAt) : ""}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

