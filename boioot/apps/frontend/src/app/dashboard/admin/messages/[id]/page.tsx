"use client";

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type KeyboardEvent,
  type ChangeEvent,
} from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi, CONVERSATION_PAGE_SIZE } from "@/features/dashboard/messages/api";
import { normalizeError } from "@/lib/api";
import type { ConversationDetail, MessageItem } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 4 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp", "application/pdf"];

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("فشل قراءة الملف"));
    reader.readAsDataURL(file);
  });
}

function isImage(dataUrl?: string) {
  return dataUrl?.startsWith("data:image/") ?? false;
}

function openDataUrl(dataUrl: string) {
  try {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: mime });
    const url   = URL.createObjectURL(blob);
    const win   = window.open(url, "_blank");
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (!win) window.location.href = url;
  } catch {
    window.open(dataUrl, "_blank");
  }
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminConversationPage() {
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

  const [content, setContent]     = useState("");
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");

  const [attachData, setAttachData]   = useState<string | undefined>();
  const [attachName, setAttachName]   = useState<string | undefined>();
  const [attachError, setAttachError] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef  = useRef<HTMLTextAreaElement>(null);
  const bottomRef    = useRef<HTMLDivElement>(null);

  const scrollToBottom = useCallback(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const sendScrollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    return () => {
      if (sendScrollTimerRef.current !== null) clearTimeout(sendScrollTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !user || !id) return;
    setFetching(true);
    setFetchError("");
    messagingApi
      .getConversation(id, 1, CONVERSATION_PAGE_SIZE)
      .then((res) => {
        setDetail(res);
        setMessages(res.messages.items);
        setCurrentPage(1);
        setHasMore(res.messages.hasNext);
      })
      .catch((e) => setFetchError(normalizeError(e)))
      .finally(() => setFetching(false));
  }, [authLoading, user, id]);

  useEffect(() => {
    if (!fetching && messages.length > 0) scrollToBottom();
  }, [fetching, messages.length, scrollToBottom]);

  async function loadMore() {
    if (!id || loadingMore) return;
    setLoadingMore(true);
    setLoadMoreError("");
    try {
      const nextPage = currentPage + 1;
      const res = await messagingApi.getConversation(id, nextPage, CONVERSATION_PAGE_SIZE);
      setMessages((prev) => [...res.messages.items, ...prev]);
      setCurrentPage(nextPage);
      setHasMore(res.messages.hasNext);
    } catch (e) {
      setLoadMoreError(normalizeError(e));
    } finally {
      setLoadingMore(false);
    }
  }

  async function handleSend() {
    if ((!content.trim() && !attachData) || sending || !id) return;
    setSending(true);
    setSendError("");
    try {
      const msg = await messagingApi.sendMessage(id, content.trim(), attachData, attachName);
      setMessages((prev) => [...prev, msg]);
      setContent("");
      setAttachData(undefined);
      setAttachName(undefined);
      sendScrollTimerRef.current = setTimeout(scrollToBottom, 80);
    } catch (e) {
      setSendError(normalizeError(e));
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setAttachError("");
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAttachError("نوع الملف غير مدعوم. يُقبل: صور (JPG/PNG/GIF/WebP) أو PDF");
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setAttachError("حجم الملف يتجاوز 4 MB");
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setAttachData(dataUrl);
      setAttachName(file.name);
    } catch {
      setAttachError("فشل قراءة الملف، حاول مرة أخرى");
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  if (authLoading || !user) return null;

  const otherName = detail?.otherUserName ?? "المستخدم";

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 52px)", maxWidth: 700 }}>
      {/* Header */}
      <div style={{
        padding: "0.75rem 1.25rem",
        borderBottom: "1px solid rgba(0,0,0,0.08)",
        display: "flex", alignItems: "center", gap: "0.75rem",
        background: "#fff", flexShrink: 0,
      }}>
        <Link
          href="/dashboard/admin/messages"
          style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", textDecoration: "none" }}
        >
          ← الرسائل
        </Link>
        <span style={{ color: "rgba(0,0,0,0.2)" }}>|</span>
        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{otherName}</span>
      </div>

      {/* Error / loading */}
      {fetchError && (
        <div style={{ padding: "1rem 1.25rem" }}>
          <InlineBanner message={fetchError} />
        </div>
      )}
      {fetching && !fetchError && (
        <div style={{ padding: "1rem 1.25rem" }}>
          <LoadingRow />
        </div>
      )}

      {/* Messages */}
      {!fetching && !fetchError && (
        <div style={{
          flex: 1, overflowY: "auto", padding: "1rem 1.25rem",
          display: "flex", flexDirection: "column", gap: "0.5rem",
        }}>
          {/* Load more */}
          {hasMore && (
            <div style={{ textAlign: "center", marginBottom: "0.5rem" }}>
              <button
                onClick={loadMore}
                disabled={loadingMore}
                style={{
                  fontSize: "0.8rem", padding: "0.3rem 1rem",
                  border: "1px solid rgba(0,0,0,0.15)", borderRadius: 6,
                  background: "transparent", cursor: "pointer",
                  opacity: loadingMore ? 0.5 : 1,
                }}
              >
                {loadingMore ? "جاري التحميل…" : "تحميل رسائل أقدم"}
              </button>
              {loadMoreError && (
                <p style={{ color: "#dc2626", fontSize: "0.8rem", marginTop: "0.25rem" }}>
                  {loadMoreError}
                </p>
              )}
            </div>
          )}

          {messages.length === 0 && (
            <p style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", textAlign: "center", margin: "auto" }}>
              لا توجد رسائل بعد
            </p>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} userId={user.id} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}

      {/* Compose */}
      {!fetching && !fetchError && (
        <div style={{
          borderTop: "1px solid rgba(0,0,0,0.08)",
          padding: "0.75rem 1.25rem",
          background: "#fff", flexShrink: 0,
        }}>
          {attachError && (
            <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{attachError}</p>
          )}
          {attachName && (
            <div style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              background: "rgba(0,0,0,0.05)", borderRadius: 6,
              padding: "0.25rem 0.6rem", marginBottom: "0.5rem", fontSize: "0.8rem",
            }}>
              📎 {attachName}
              <button
                onClick={() => { setAttachData(undefined); setAttachName(undefined); }}
                style={{ background: "none", border: "none", cursor: "pointer", padding: 0, lineHeight: 1 }}
              >
                ✕
              </button>
            </div>
          )}
          {sendError && (
            <p style={{ color: "#dc2626", fontSize: "0.8rem", marginBottom: "0.5rem" }}>{sendError}</p>
          )}
          <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
            <input
              ref={fileInputRef}
              type="file"
              accept={ACCEPTED_TYPES.join(",")}
              style={{ display: "none" }}
              onChange={handleFileChange}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="إرفاق ملف"
              style={{
                padding: "0.5rem", border: "1px solid rgba(0,0,0,0.15)",
                borderRadius: 8, background: "transparent", cursor: "pointer",
                fontSize: "1rem", lineHeight: 1, flexShrink: 0,
              }}
            >
              📎
            </button>
            <textarea
              ref={textareaRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="اكتب رسالتك... (Enter للإرسال، Shift+Enter لسطر جديد)"
              rows={2}
              style={{
                flex: 1, resize: "none", borderRadius: 8,
                border: "1px solid rgba(0,0,0,0.15)",
                padding: "0.5rem 0.75rem", fontFamily: "inherit", fontSize: "0.9rem",
                outline: "none",
              }}
            />
            <button
              onClick={handleSend}
              disabled={sending || (!content.trim() && !attachData)}
              style={{
                padding: "0.5rem 1.25rem", borderRadius: 8,
                background: "var(--color-primary)", color: "#fff",
                border: "none", cursor: "pointer", fontWeight: 600,
                fontSize: "0.9rem", flexShrink: 0,
                opacity: (sending || (!content.trim() && !attachData)) ? 0.5 : 1,
              }}
            >
              {sending ? "…" : "إرسال"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Bubble ───────────────────────────────────────────────────────────────────

function MessageBubble({ msg, userId }: { msg: MessageItem; userId: string }) {
  const [lightbox, setLightbox] = useState(false);
  const own = msg.isOwnMessage ?? (msg.senderId === userId);
  const timeLabel = new Date(msg.createdAt).toLocaleTimeString("ar-SY", {
    hour: "2-digit", minute: "2-digit",
  });

  return (
    <div style={{ display: "flex", justifyContent: own ? "flex-start" : "flex-end" }}>
      {lightbox && msg.attachmentData && (
        <div
          style={{
            position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)",
            zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center",
          }}
          onClick={() => setLightbox(false)}
        >
          <img
            src={msg.attachmentData}
            alt=""
            style={{ maxWidth: "90vw", maxHeight: "90vh", borderRadius: 8, objectFit: "contain" }}
          />
        </div>
      )}

      <div style={{
        maxWidth: "72%", padding: "0.55rem 0.85rem", borderRadius: 12,
        background: own ? "var(--color-primary)" : "#f1f5f9",
        color: own ? "#fff" : "var(--color-text-primary)",
        borderBottomRightRadius: own ? 4 : 12,
        borderBottomLeftRadius: own ? 12 : 4,
      }}>
        {msg.content && (
          <p style={{ margin: 0, fontSize: "0.9rem", whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {msg.content}
          </p>
        )}
        {msg.attachmentData && (
          <div style={{ marginTop: msg.content ? "0.4rem" : 0 }}>
            {isImage(msg.attachmentData) ? (
              <img
                src={msg.attachmentData}
                alt={msg.attachmentName ?? "صورة"}
                style={{ maxWidth: "100%", maxHeight: 280, borderRadius: 8, display: "block", cursor: "zoom-in" }}
                onClick={() => setLightbox(true)}
              />
            ) : (
              <button
                type="button"
                onClick={() => msg.attachmentData && openDataUrl(msg.attachmentData)}
                style={{
                  background: "none", border: "none", padding: 0, cursor: "pointer",
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  color: own ? "#fff" : "var(--color-primary)",
                  textDecoration: "underline", fontSize: "0.88rem", fontWeight: 600,
                }}
              >
                📄 {msg.attachmentName ?? "تحميل الملف"}
              </button>
            )}
          </div>
        )}
        <p style={{ margin: "0.2rem 0 0", fontSize: "0.68rem", opacity: 0.7, textAlign: "left", direction: "ltr" }}>
          {timeLabel}
        </p>
      </div>
    </div>
  );
}
