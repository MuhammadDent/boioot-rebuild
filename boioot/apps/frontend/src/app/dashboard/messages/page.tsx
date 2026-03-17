"use client";

import { useState, useEffect, useCallback, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi } from "@/features/dashboard/messages/api";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { normalizeError } from "@/lib/api";
import type { ConversationSummary } from "@/types";

// ─── UUID validation helper ────────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(v: string) {
  return UUID_RE.test(v.trim());
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MessagesPage() {
  const { user, isLoading } = useProtectedRoute();
  const router = useRouter();

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [fetching, setFetching]           = useState(true);
  const [fetchError, setFetchError]       = useState("");

  // New conversation form state
  const [showForm, setShowForm]         = useState(false);
  const [recipientId, setRecipientId]   = useState("");
  const [propertyId, setPropertyId]     = useState("");
  const [projectId, setProjectId]       = useState("");
  const [creating, setCreating]         = useState(false);
  const [createError, setCreateError]   = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const list = await messagingApi.getConversations();
      setConversations(list);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  // ── Create conversation ──────────────────────────────────────────────────────

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setCreateError("");

    if (!isValidUuid(recipientId)) {
      setCreateError("معرف المستخدم يجب أن يكون UUID صالح (مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)");
      return;
    }
    if (propertyId && !isValidUuid(propertyId)) {
      setCreateError("معرف العقار يجب أن يكون UUID صالح أو يُترك فارغاً");
      return;
    }
    if (projectId && !isValidUuid(projectId)) {
      setCreateError("معرف المشروع يجب أن يكون UUID صالح أو يُترك فارغاً");
      return;
    }
    if (propertyId && projectId) {
      setCreateError("لا يمكن ربط المحادثة بعقار ومشروع في نفس الوقت");
      return;
    }

    setCreating(true);
    try {
      const conv = await messagingApi.getOrCreateConversation({
        recipientId: recipientId.trim(),
        propertyId: propertyId.trim() || undefined,
        projectId:  projectId.trim()  || undefined,
      });
      router.push(`/dashboard/messages/${conv.id}`);
    } catch (e) {
      setCreateError(normalizeError(e));
      setCreating(false);
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{
            display: "flex", alignItems: "center",
            justifyContent: "space-between", flexWrap: "wrap", gap: "0.75rem",
          }}>
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
              المحادثات
            </h1>
            <button
              className="btn btn-primary"
              style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }}
              onClick={() => { setShowForm(f => !f); setCreateError(""); }}
            >
              {showForm ? "إلغاء" : "+ محادثة جديدة"}
            </button>
          </div>
        </div>

        {/* ── New conversation form ── */}
        {showForm && (
          <div className="form-card" style={{ marginBottom: "1.25rem" }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 700, margin: "0 0 1rem", color: "var(--color-text-primary)" }}>
              بدء محادثة جديدة
            </h2>
            <form onSubmit={handleCreate}>
              <div className="form-group">
                <label className="form-label" htmlFor="msg-recipient">
                  معرف المستخدم (UUID) *
                </label>
                <input
                  id="msg-recipient"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={recipientId}
                  onChange={e => setRecipientId(e.target.value)}
                  disabled={creating}
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="msg-property">
                  معرف العقار (اختياري)
                </label>
                <input
                  id="msg-property"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={propertyId}
                  onChange={e => setPropertyId(e.target.value)}
                  disabled={creating}
                  dir="ltr"
                />
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="msg-project">
                  معرف المشروع (اختياري)
                </label>
                <input
                  id="msg-project"
                  className="form-input"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={projectId}
                  onChange={e => setProjectId(e.target.value)}
                  disabled={creating}
                  dir="ltr"
                />
              </div>

              {createError && (
                <p className="form-error" style={{ marginBottom: "0.75rem" }}>
                  {createError}
                </p>
              )}

              <button
                type="submit"
                className="btn btn-primary"
                style={{ padding: "0.5rem 1.5rem" }}
                disabled={creating || !recipientId.trim()}
              >
                {creating ? "جارٍ الفتح..." : "فتح المحادثة"}
              </button>
            </form>
          </div>
        )}

        {/* ── Fetch error ── */}
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && <LoadingRow />}

        {/* ── Empty state ── */}
        {!fetching && !fetchError && conversations.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="1.5"
              style={{ opacity: 0.35, marginBottom: "0.75rem", color: "var(--color-text-secondary)" }}
            >
              <path d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <p style={{ color: "var(--color-text-secondary)", margin: "0 0 0.5rem" }}>
              لا توجد محادثات بعد.
            </p>
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.82rem", margin: 0 }}>
              ابدأ محادثة جديدة باستخدام الزر أعلاه.
            </p>
          </div>
        )}

        {/* ── Conversations list ── */}
        {!fetching && conversations.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {conversations.map(c => (
              <ConversationRow key={c.id} conversation={c} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}

// ─── Conversation row ──────────────────────────────────────────────────────────

function ConversationRow({ conversation: c }: { conversation: ConversationSummary }) {
  const subject = c.propertyTitle ?? c.projectTitle;
  const subjectTag = c.propertyTitle ? "عقار" : c.projectTitle ? "مشروع" : null;

  const timeLabel = c.lastMessageAt
    ? new Date(c.lastMessageAt).toLocaleString("en-GB", {
        month: "numeric", day: "numeric",
        hour: "2-digit", minute: "2-digit",
      })
    : new Date(c.createdAt).toLocaleDateString("en-GB", {
        month: "numeric", day: "numeric",
      });

  return (
    <Link
      href={`/dashboard/messages/${c.id}`}
      style={{ textDecoration: "none", color: "inherit" }}
    >
      <div className="form-card" style={{ padding: "1rem 1.25rem", transition: "box-shadow 0.15s" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>

          {/* ── Avatar ── */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            backgroundColor: "var(--color-primary)",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: "#fff", fontWeight: 700, fontSize: "1.1rem",
          }}>
            {c.otherUserName.charAt(0).toUpperCase()}
          </div>

          {/* ── Info ── */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", justifyContent: "space-between" }}>
              <span style={{ fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
                {c.otherUserName}
              </span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", flexShrink: 0 }}>
                {timeLabel}
              </span>
            </div>

            {subjectTag && subject && (
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                {subjectTag}: {subject}
              </p>
            )}
          </div>

          {/* ── Unread badge ── */}
          {c.unreadCount > 0 && (
            <span style={{
              backgroundColor: "var(--color-primary)", color: "#fff",
              borderRadius: "9999px", padding: "0.1rem 0.55rem",
              fontSize: "0.75rem", fontWeight: 700, flexShrink: 0,
            }}>
              {c.unreadCount}
            </span>
          )}

        </div>
      </div>
    </Link>
  );
}
