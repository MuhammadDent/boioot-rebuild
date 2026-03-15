"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
} from "react";
import { useParams } from "next/navigation";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi, CONVERSATION_PAGE_SIZE } from "@/features/dashboard/messages/api";
import { normalizeError } from "@/lib/api";
import type { ConversationDetail, MessageItem } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ConversationPage() {
  const { user, isLoading: authLoading } = useProtectedRoute();
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [detail, setDetail]           = useState<ConversationDetail | null>(null);
  const [messages, setMessages]       = useState<MessageItem[]>([]);
  const [hasMore, setHasMore]         = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadMoreError, setLoadMoreError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");

  // Compose state
  const [content, setContent]   = useState("");
  const [sending, setSending]   = useState(false);
  const [sendError, setSendError] = useState("");

  // Bottom sentinel for auto-scroll
  const bottomRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  // Timer ref for post-send scroll — cleaned up on unmount
  const sendScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (sendScrollTimerRef.current !== null) clearTimeout(sendScrollTimerRef.current);
    };
  }, []);

  // Initial load
  useEffect(() => {
    if (authLoading || !user || !id) return;

    setFetching(true);
    setFetchError("");

    messagingApi
      .getConversation(id, 1, CONVERSATION_PAGE_SIZE)
      .then((res) => {
        setDetail(res);
        setMessages(res.messages.items);
        setHasMore(res.messages.hasNext);
        setCurrentPage(1);
      })
      .catch((e) => setFetchError(normalizeError(e)))
      .finally(() => setFetching(false));
  }, [authLoading, user, id]);

  // Scroll to bottom once after initial load — fires when detail first becomes available.
  // Uses a ref flag so subsequent detail mutations (e.g. from future realtime updates)
  // don't trigger an unexpected scroll.
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (detail && !initialScrollDone.current) {
      initialScrollDone.current = true;
      scrollToBottom();
    }
  }, [detail, scrollToBottom]);

  if (authLoading || !user) return null;

  // ── Loading ──
  if (fetching) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard/messages" label="← المحادثات" marginBottom="0.75rem" />
          <LoadingRow />
        </div>
      </div>
    );
  }

  // ── Fetch error ──
  if (fetchError) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard/messages" label="← المحادثات" marginBottom="0.75rem" />
          <InlineBanner message={fetchError} />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  // ── Load more (next pages = newer messages in oldest-first sort) ──
  async function handleLoadMore() {
    if (loadingMore || !id) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextPage = currentPage + 1;
      const res = await messagingApi.getConversation(id, nextPage, CONVERSATION_PAGE_SIZE);
      setMessages(prev => [...prev, ...res.messages.items]);
      setHasMore(res.messages.hasNext);
      setCurrentPage(nextPage);
    } catch (e) {
      setLoadMoreError(normalizeError(e));
    } finally {
      setLoadingMore(false);
    }
  }

  // ── Send message ──
  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed || sending || !id) return;

    setSending(true);
    setSendError("");

    try {
      const msg = await messagingApi.sendMessage(id, trimmed);
      setMessages(prev => [...prev, msg]);
      setContent("");
      // Scroll after React re-renders the new bubble — cleaned up on unmount
      if (sendScrollTimerRef.current !== null) clearTimeout(sendScrollTimerRef.current);
      sendScrollTimerRef.current = setTimeout(scrollToBottom, 50);
    } catch (e) {
      setSendError(normalizeError(e));
    } finally {
      setSending(false);
    }
  }

  // Enter = send, Shift+Enter = newline
  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const subject    = detail.propertyTitle ?? detail.projectTitle;
  const subjectTag = detail.propertyTitle ? "عقار" : detail.projectTitle ? "مشروع" : null;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "var(--color-bg)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        maxWidth: 720, margin: "0 auto", width: "100%",
        flex: 1, display: "flex", flexDirection: "column",
        padding: "2rem 1rem 1rem",
      }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1rem" }}>
          <DashboardBackLink href="/dashboard/messages" label="← المحادثات" marginBottom="0.75rem" />
          <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
            <div style={{
              width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
              backgroundColor: "var(--color-primary)",
              display: "flex", alignItems: "center", justifyContent: "center",
              color: "#fff", fontWeight: 700, fontSize: "1.1rem",
            }}>
              {detail.otherUserName.charAt(0).toUpperCase()}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)" }}>
                {detail.otherUserName}
              </p>
              {subjectTag && subject && (
                <p style={{ margin: "0.1rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                  {subjectTag}: {subject}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* ── Thread ── */}
        <div style={{
          flex: 1, overflowY: "auto",
          backgroundColor: "var(--color-surface, #f8f8f8)",
          border: "1px solid var(--color-border)",
          borderRadius: "12px",
          padding: "1rem",
          display: "flex", flexDirection: "column", gap: "0.5rem",
          minHeight: 320,
        }}>

          {/* ── Empty thread ── */}
          {messages.length === 0 && (
            <p style={{
              textAlign: "center", color: "var(--color-text-secondary)",
              fontSize: "0.88rem", margin: "auto",
            }}>
              لا توجد رسائل بعد. ابدأ المحادثة!
            </p>
          )}

          {/* ── Load more newer messages ── */}
          {hasMore && (
            <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
              <button
                className="btn"
                style={{ fontSize: "0.82rem", padding: "0.3rem 1rem" }}
                disabled={loadingMore}
                onClick={handleLoadMore}
              >
                {loadingMore ? "جارٍ التحميل..." : "تحميل رسائل أحدث"}
              </button>
              {loadMoreError && (
                <p style={{
                  color: "var(--color-error, #c0392b)", fontSize: "0.8rem",
                  margin: "0.35rem 0 0",
                }}>
                  {loadMoreError}
                </p>
              )}
            </div>
          )}

          {/* ── Messages ── */}
          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          {/* ── Bottom sentinel for auto-scroll ── */}
          <div ref={bottomRef} />
        </div>

        {/* ── Send error ── */}
        {sendError && (
          <p style={{
            color: "var(--color-error, #c0392b)", fontSize: "0.85rem",
            margin: "0.5rem 0 0",
          }}>
            {sendError}
          </p>
        )}

        {/* ── Compose area ── */}
        <div style={{
          display: "flex", gap: "0.6rem", alignItems: "flex-end",
          marginTop: "0.75rem",
        }}>
          <textarea
            rows={2}
            className="form-input"
            style={{
              flex: 1, resize: "none", borderRadius: "10px",
              fontSize: "0.92rem", lineHeight: 1.5,
              padding: "0.6rem 0.85rem",
            }}
            placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
            value={content}
            onChange={e => setContent(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={sending}
            maxLength={2000}
          />
          <button
            className="btn btn-primary"
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "10px",
              flexShrink: 0, alignSelf: "flex-end",
            }}
            onClick={handleSend}
            disabled={sending || !content.trim()}
          >
            {sending ? "..." : "إرسال"}
          </button>
        </div>

        {/* Character count — shown near limit */}
        {content.length > 1800 && (
          <p style={{
            fontSize: "0.75rem",
            color: content.length >= 2000 ? "#c62828" : "var(--color-text-secondary)",
            margin: "0.25rem 0 0", textAlign: "left",
          }}>
            {content.length} / 2000
          </p>
        )}

      </div>
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: MessageItem }) {
  const timeLabel = new Date(msg.createdAt).toLocaleTimeString("ar-SY", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    /*
     * RTL context: flex-start = right side of screen, flex-end = left side.
     * Own messages align to the right (flex-start), others to the left (flex-end).
     */
    <div style={{ display: "flex", justifyContent: msg.isOwnMessage ? "flex-start" : "flex-end" }}>
      <div style={{
        maxWidth: "70%",
        backgroundColor: msg.isOwnMessage ? "var(--color-primary)" : "#fff",
        color: msg.isOwnMessage ? "#fff" : "var(--color-text-primary)",
        border: msg.isOwnMessage ? "none" : "1px solid var(--color-border)",
        borderRadius: msg.isOwnMessage
          ? "16px 4px 16px 16px"
          : "4px 16px 16px 16px",
        padding: "0.6rem 0.85rem",
        boxShadow: "0 1px 2px rgba(0,0,0,0.07)",
      }}>
        <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
          {msg.content}
        </p>
        <p style={{
          margin: "0.25rem 0 0", fontSize: "0.7rem",
          opacity: 0.75, textAlign: "left", direction: "ltr",
        }}>
          {timeLabel}
        </p>
      </div>
    </div>
  );
}

