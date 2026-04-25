"use client";

import { useState, useEffect, useCallback, type FormEvent, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi } from "@/features/dashboard/messages/api";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { normalizeError } from "@/lib/api";
import { usePlan } from "@/context/SubscriptionContext";
import { useFeature } from "@/hooks/useFeature";
import UpgradePrompt from "@/components/plan/UpgradePrompt";
import type { ConversationSummary } from "@/types";

// ─── UUID validation helper ───────────────────────────────────────────────────

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(v: string) {
  return UUID_RE.test(v.trim());
}

// ─── Inner page (needs useSearchParams — must be wrapped in Suspense) ─────────

function MessagesPageInner() {
  const { user, isLoading } = useProtectedRoute();
  const router       = useRouter();
  const searchParams = useSearchParams();
  const { isLoading: planLoading } = usePlan();
  const hasInternalChat = useFeature("internal_chat");

  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [fetching,      setFetching]      = useState(true);
  const [fetchError,    setFetchError]    = useState("");

  // New conversation form state
  const [showForm,     setShowForm]     = useState(false);
  const [recipientId,  setRecipientId]  = useState("");
  const [propertyId,   setPropertyId]   = useState("");
  const [projectId,    setProjectId]    = useState("");
  const [creating,     setCreating]     = useState(false);
  const [createError,  setCreateError]  = useState("");

  // Support / admin conversation state
  const [supportLoading, setSupportLoading] = useState(false);
  const [supportError,   setSupportError]   = useState("");

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

  // ── Auto-open support conversation when ?support=1 is in URL ──────────────
  // Used by the sidebar "الدعم الفني" link (/dashboard/messages?support=1)
  // so there is no separate intermediate page that can 404.

  useEffect(() => {
    if (isLoading || !user) return;
    if (searchParams.get("support") !== "1") return;

    // Clear the param from URL immediately (replace, not push)
    router.replace("/dashboard/messages");

    setSupportLoading(true);
    setSupportError("");
    messagingApi
      .getOrCreateSupportConversation()
      .then((conv) => {
        router.push(`/dashboard/messages/${conv.id}`);
      })
      .catch((e) => {
        setSupportError(normalizeError(e));
        setSupportLoading(false);
      });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading, user]);

  if (isLoading || !user) return null;

  // ── Feature gate: internal_chat ───────────────────────────────────────────
  // Wait for plan to resolve before showing the locked state (prevents flash).
  // useFeature + usePlan admin bypass covers all roles internally.
  if (!planLoading && !hasInternalChat) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 560, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ marginTop: "2rem" }}>
            <UpgradePrompt feature="internal_chat" />
          </div>
        </div>
      </div>
    );
  }

  // ── Contact administration (مراسلة الإدارة — Admin role) ─────────────────

  async function handleContactAdmin() {
    setSupportLoading(true);
    setSupportError("");
    try {
      const conv = await messagingApi.getOrCreateAdminConversation();
      router.push(`/dashboard/messages/${conv.id}`);
    } catch (e) {
      setSupportError(normalizeError(e));
      setSupportLoading(false);
    }
  }

  // ── Create conversation (manual UUID form) ────────────────────────────────

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
        propertyId:  propertyId.trim() || undefined,
        projectId:   projectId.trim()  || undefined,
      });
      router.push(`/dashboard/messages/${conv.id}`);
    } catch (e) {
      setCreateError(normalizeError(e));
      setCreating(false);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

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
            <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
              <button
                style={{
                  padding: "0.45rem 1.1rem", fontSize: "0.88rem",
                  background: supportLoading ? "#6b7280" : "#16a34a",
                  color: "#fff", border: "none",
                  borderRadius: 8, fontFamily: "var(--font-arabic)", fontWeight: 700,
                  cursor: supportLoading ? "not-allowed" : "pointer",
                  opacity: supportLoading ? 0.75 : 1,
                  transition: "opacity 0.15s, background 0.15s",
                }}
                onClick={handleContactAdmin}
                disabled={supportLoading}
              >
                {supportLoading ? "جارٍ الفتح…" : "✉️ مراسلة الإدارة"}
              </button>
              <button
                className="btn btn-primary"
                style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }}
                onClick={() => { setShowForm(f => !f); setCreateError(""); }}
              >
                {showForm ? "إلغاء" : "+ محادثة جديدة"}
              </button>
            </div>
          </div>

          {supportError && (
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.85rem", color: "#dc2626" }}>
              ⚠️ {supportError}
            </p>
          )}
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

// ─── ConversationRow (unchanged) ─────────────────────────────────────────────

function ConversationRow({ conversation: c }: { conversation: ConversationSummary }) {
  const label =
    c.propertyTitle ? `عقار: ${c.propertyTitle}` :
    c.projectTitle  ? `مشروع: ${c.projectTitle}` :
    "محادثة عامة";

  return (
    <Link
      href={`/dashboard/messages/${c.id}`}
      style={{
        display: "flex",
        alignItems: "center",
        gap: "0.85rem",
        padding: "0.85rem 1rem",
        background: "#fff",
        border: "1px solid var(--color-border)",
        borderRadius: 10,
        textDecoration: "none",
        color: "inherit",
        transition: "box-shadow 0.15s",
      }}
    >
      <div
        style={{
          width: 40, height: 40, borderRadius: "50%",
          background: "var(--color-primary)",
          display: "flex", alignItems: "center", justifyContent: "center",
          flexShrink: 0, color: "#fff", fontWeight: 700, fontSize: "0.95rem",
        }}
      >
        {c.otherUserName?.[0]?.toUpperCase() ?? "?"}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 600, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
          {c.otherUserName ?? "مستخدم"}
        </div>
        <div style={{
          fontSize: "0.8rem", color: "var(--color-text-secondary)",
          whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
        }}>
          {label}
        </div>
      </div>
      <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", flexShrink: 0, textAlign: "start" }}>
        {c.lastMessageAt
          ? new Date(c.lastMessageAt).toLocaleDateString("ar-SY", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })
          : ""}
        {(c.unreadCount ?? 0) > 0 && (
          <span style={{
            display: "block", marginTop: "0.25rem",
            background: "var(--color-primary)", color: "#fff",
            borderRadius: 999, padding: "0.1rem 0.5rem",
            fontSize: "0.72rem", fontWeight: 700, textAlign: "center",
          }}>
            {c.unreadCount}
          </span>
        )}
      </div>
    </Link>
  );
}

// ─── Default export wrapped in Suspense (required for useSearchParams) ────────

export default function MessagesPage() {
  return (
    <Suspense>
      <MessagesPageInner />
    </Suspense>
  );
}
