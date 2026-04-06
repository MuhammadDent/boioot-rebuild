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
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi, CONVERSATION_PAGE_SIZE } from "@/features/dashboard/messages/api";
import { normalizeError } from "@/lib/api";
import type { ConversationDetail, MessageItem } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const MAX_FILE_BYTES = 4 * 1024 * 1024; // 4 MB (base64 → ~5.3 MB stored)

const ACCEPTED_TYPES = [
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
];

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

/**
 * Open a base64 data URL in a new tab via a Blob URL.
 * window.open(dataUrl) fails for large payloads in some browsers.
 */
function openDataUrl(dataUrl: string) {
  try {
    const [header, b64] = dataUrl.split(",");
    const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
    const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
    const blob  = new Blob([bytes], { type: mime });
    const url   = URL.createObjectURL(blob);
    const win   = window.open(url, "_blank");
    // Revoke after the browser has had time to load it
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
    if (!win) window.location.href = url; // fallback if popup blocked
  } catch {
    window.open(dataUrl, "_blank");
  }
}

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
  const [content, setContent]     = useState("");
  const [sending, setSending]     = useState(false);
  const [sendError, setSendError] = useState("");

  // Attachment state
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

  // Scroll to bottom + focus textarea after initial load
  const initialScrollDone = useRef(false);
  useEffect(() => {
    if (detail && !initialScrollDone.current) {
      initialScrollDone.current = true;
      scrollToBottom();
      textareaRef.current?.focus();
    }
  }, [detail, scrollToBottom]);

  if (authLoading || !user) return null;

  if (fetching) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "1.5rem 1rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard/messages" label="← المحادثات" marginBottom="0.75rem" />
          <LoadingRow />
        </div>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "1.5rem 1rem" }}>
        <div style={{ maxWidth: 720, margin: "0 auto" }}>
          <DashboardBackLink href="/dashboard/messages" label="← المحادثات" marginBottom="0.75rem" />
          <InlineBanner message={fetchError} />
        </div>
      </div>
    );
  }

  if (!detail) return null;

  // ── Load more ──
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

  // ── File picker ──
  async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setAttachError("");
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setAttachError("نوع الملف غير مدعوم. الأنواع المقبولة: صور (JPG/PNG/GIF/WebP) أو PDF");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setAttachError("حجم الملف يتجاوز 4 ميغابايت");
      e.target.value = "";
      return;
    }
    try {
      const dataUrl = await readFileAsDataURL(file);
      setAttachData(dataUrl);
      setAttachName(file.name);
    } catch {
      setAttachError("فشل في قراءة الملف");
    }
    e.target.value = "";
  }

  function clearAttachment() {
    setAttachData(undefined);
    setAttachName(undefined);
    setAttachError("");
  }

  // ── Send ──
  async function handleSend() {
    const trimmed = content.trim();
    if (!trimmed && !attachData) return;
    if (sending || !id) return;

    setSending(true);
    setSendError("");

    try {
      const msg = await messagingApi.sendMessage(id, trimmed, attachData, attachName);
      setMessages(prev => [...prev, msg]);
      setContent("");
      clearAttachment();
      if (sendScrollTimerRef.current !== null) clearTimeout(sendScrollTimerRef.current);
      sendScrollTimerRef.current = setTimeout(scrollToBottom, 50);
      textareaRef.current?.focus();
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

  const subject    = detail.propertyTitle ?? detail.projectTitle;
  const subjectTag = detail.propertyTitle ? "عقار" : detail.projectTitle ? "مشروع" : null;
  const canSend    = (content.trim().length > 0 || !!attachData) && !sending;

  return (
    <div style={{
      minHeight: "100vh", backgroundColor: "var(--color-bg)",
      display: "flex", flexDirection: "column",
    }}>
      <div style={{
        maxWidth: 720, margin: "0 auto", width: "100%",
        flex: 1, display: "flex", flexDirection: "column",
        padding: "1.5rem 1rem 1rem",
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
          {messages.length === 0 && (
            <p style={{
              textAlign: "center", color: "var(--color-text-secondary)",
              fontSize: "0.88rem", margin: "auto",
            }}>
              لا توجد رسائل بعد. ابدأ المحادثة!
            </p>
          )}

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
              <InlineBanner message={loadMoreError} />
            </div>
          )}

          {messages.map((msg) => (
            <MessageBubble key={msg.id} msg={msg} />
          ))}

          <div ref={bottomRef} />
        </div>

        {/* ── Attachment preview (before send) ── */}
        {(attachData || attachError) && (
          <div style={{
            marginTop: "0.5rem",
            padding: "0.6rem 0.85rem",
            background: attachError ? "#fef2f2" : "#f0fdf4",
            border: `1px solid ${attachError ? "#fecaca" : "#bbf7d0"}`,
            borderRadius: 10,
            display: "flex", alignItems: "center", gap: "0.6rem",
          }}>
            {attachError ? (
              <span style={{ color: "#dc2626", fontSize: "0.85rem", flex: 1 }}>{attachError}</span>
            ) : (
              <>
                {isImage(attachData) ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachData} alt={attachName} style={{ width: 48, height: 48, objectFit: "cover", borderRadius: 6 }} />
                ) : (
                  <span style={{ fontSize: "1.5rem" }}>📄</span>
                )}
                <span style={{ flex: 1, fontSize: "0.85rem", fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {attachName}
                </span>
                <button
                  type="button"
                  onClick={clearAttachment}
                  style={{ background: "none", border: "none", cursor: "pointer", color: "#dc2626", fontSize: "1.1rem", lineHeight: 1 }}
                  title="إزالة الملف"
                >✕</button>
              </>
            )}
          </div>
        )}

        {/* ── Send error ── */}
        <InlineBanner message={sendError} />

        {/* ── Compose area ── */}
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", marginTop: "0.75rem" }}>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            style={{ display: "none" }}
            onChange={handleFileChange}
          />

          {/* Attach button */}
          <button
            type="button"
            title="إرفاق ملف (صورة أو PDF، حد أقصى 4 ميغابايت)"
            onClick={() => { setAttachError(""); fileInputRef.current?.click(); }}
            disabled={sending}
            style={{
              flexShrink: 0, width: 42, height: 42,
              border: "1.5px solid var(--color-border)",
              borderRadius: 10, background: attachData ? "#f0fdf4" : "var(--color-bg-card)",
              cursor: sending ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: "1.2rem",
            }}
          >
            📎
          </button>

          {/* Textarea */}
          <textarea
            ref={textareaRef}
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

          {/* Send button */}
          <button
            className="btn btn-primary"
            style={{
              padding: "0.6rem 1.25rem", borderRadius: "10px",
              flexShrink: 0, alignSelf: "flex-end",
            }}
            onClick={handleSend}
            disabled={!canSend}
          >
            {sending ? "..." : "إرسال"}
          </button>
        </div>

        {/* Character count */}
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

// ─── Image lightbox ───────────────────────────────────────────────────────────

function ImageLightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        background: "rgba(0,0,0,0.88)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        style={{
          position: "absolute", top: 16, right: 16,
          background: "rgba(255,255,255,0.15)", border: "none",
          color: "#fff", fontSize: "1.6rem", lineHeight: 1,
          width: 40, height: 40, borderRadius: "50%",
          cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
        }}
        title="إغلاق"
      >✕</button>

      {/* Image — stop propagation so clicking image doesn't close */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        onClick={e => e.stopPropagation()}
        style={{
          maxWidth: "92vw", maxHeight: "88vh",
          borderRadius: 10, objectFit: "contain",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
        }}
      />
    </div>
  );
}

// ─── Message bubble ───────────────────────────────────────────────────────────

function MessageBubble({ msg }: { msg: MessageItem }) {
  const [lightbox, setLightbox] = useState(false);

  const timeLabel = new Date(msg.createdAt).toLocaleTimeString("en-GB", {
    hour: "2-digit", minute: "2-digit",
  });

  const own = msg.isOwnMessage;
  const bubbleBg    = own ? "var(--color-primary)" : "#fff";
  const bubbleColor = own ? "#fff" : "var(--color-text-primary)";
  const bubbleBorder = own ? "none" : "1px solid var(--color-border)";
  const bubbleRadius = own ? "16px 4px 16px 16px" : "4px 16px 16px 16px";

  return (
    <div style={{ display: "flex", justifyContent: own ? "flex-start" : "flex-end" }}>
      <div style={{
        maxWidth: "75%",
        backgroundColor: bubbleBg,
        color: bubbleColor,
        border: bubbleBorder,
        borderRadius: bubbleRadius,
        padding: "0.6rem 0.85rem",
        boxShadow: "0 1px 2px rgba(0,0,0,0.07)",
      }}>

        {/* Text content */}
        {msg.content && (
          <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>
            {msg.content}
          </p>
        )}

        {/* Lightbox */}
        {lightbox && msg.attachmentData && (
          <ImageLightbox
            src={msg.attachmentData}
            alt={msg.attachmentName ?? "صورة مرفقة"}
            onClose={() => setLightbox(false)}
          />
        )}

        {/* Attachment */}
        {msg.attachmentData && (
          <div style={{ marginTop: msg.content ? "0.5rem" : 0 }}>
            {isImage(msg.attachmentData) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={msg.attachmentData}
                alt={msg.attachmentName ?? "صورة مرفقة"}
                style={{
                  maxWidth: "100%", maxHeight: 280,
                  borderRadius: 8, display: "block",
                  cursor: "zoom-in",
                }}
                onClick={() => setLightbox(true)}
              />
            ) : (
              <button
                type="button"
                onClick={() => {
                  if (!msg.attachmentData) return;
                  const [header, b64] = msg.attachmentData.split(",");
                  const mime = header.match(/:(.*?);/)?.[1] ?? "application/octet-stream";
                  const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
                  const blob  = new Blob([bytes], { type: mime });
                  const url   = URL.createObjectURL(blob);
                  const a     = document.createElement("a");
                  a.href     = url;
                  a.download = msg.attachmentName ?? "ملف";
                  a.click();
                  setTimeout(() => URL.revokeObjectURL(url), 10_000);
                }}
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

        {/* Timestamp */}
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
