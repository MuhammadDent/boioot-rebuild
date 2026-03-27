"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, normalizeError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import { useAuthGate } from "@/context/AuthGateContext";
import Spinner from "@/components/ui/Spinner";

// ─── Constants ────────────────────────────────────────────────────────────────

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  Apartment: "شقة سكنية",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل تجاري",
  Land:      "أرض",
  Building:  "بناء كامل",
};

const PROPERTY_TYPE_COLORS: Record<string, { bg: string; color: string; border: string }> = {
  Apartment: { bg: "#eff6ff", color: "#1d4ed8", border: "#bfdbfe" },
  Villa:     { bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  Office:    { bg: "#fff7ed", color: "#c2410c", border: "#fed7aa" },
  Shop:      { bg: "#fdf4ff", color: "#7e22ce", border: "#e9d5ff" },
  Land:      { bg: "#fefce8", color: "#a16207", border: "#fde68a" },
  Building:  { bg: "#f8fafc", color: "#334155", border: "#cbd5e1" },
};

const MAX_VISIBLE_REPLIES = 2;
const MAX_DEPTH           = 2; // depth 0 = top-level, depth 1 = reply, depth 2 = reply-to-reply

// ─── Types ────────────────────────────────────────────────────────────────────

interface BuyerRequest {
  id: string;
  title: string;
  propertyType: string;
  description: string;
  city?: string;
  neighborhood?: string;
  userName: string;
  userId: string;
  commentsCount: number;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  userId: string;
  userName: string;
  buyerRequestId: string;
  parentCommentId: string | null;
  createdAt: string;
  // client-side tree fields (populated after fetch)
  replies?: Comment[];
}

// ─── Tree builder ─────────────────────────────────────────────────────────────

function buildTree(flat: Comment[]): Comment[] {
  const map = new Map<string, Comment>();
  const roots: Comment[] = [];

  flat.forEach(c => map.set(c.id, { ...c, replies: [] }));

  map.forEach(c => {
    if (c.parentCommentId && map.has(c.parentCommentId)) {
      map.get(c.parentCommentId)!.replies!.push(c);
    } else {
      roots.push(c);
    }
  });

  return roots;
}

function flatCount(comments: Comment[]): number {
  return comments.reduce((n, c) => n + 1 + flatCount(c.replies ?? []), 0);
}

// ─── Avatar ───────────────────────────────────────────────────────────────────

function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = name?.trim()?.[0]?.toUpperCase() ?? "؟";
  const colors = ["#0ea5e9", "#8b5cf6", "#f59e0b", "#10b981", "#ef4444", "#3b82f6"];
  const bg     = colors[(name.charCodeAt(0) || 0) % colors.length] ?? "#64748b";
  return (
    <div style={{
      width: size, height: size, borderRadius: "50%",
      backgroundColor: bg, color: "#fff",
      display: "flex", alignItems: "center", justifyContent: "center",
      fontWeight: 700, fontSize: size * 0.38, flexShrink: 0,
    }}>
      {letter}
    </div>
  );
}

// ─── Inline reply form ────────────────────────────────────────────────────────

function ReplyForm({
  parentId,
  requestId,
  currentUser,
  onSubmit,
  onCancel,
}: {
  parentId: string;
  requestId: string;
  currentUser: { id: string; fullName: string };
  onSubmit: (newComment: Comment) => void;
  onCancel: () => void;
}) {
  const [text,    setText]    = useState("");
  const [posting, setPosting] = useState(false);
  const [error,   setError]   = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => { ref.current?.focus(); }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim()) return;
    setPosting(true);
    setError("");
    try {
      const added = await api.post<Comment>(
        `/buyer-requests/${requestId}/comments`,
        { content: text.trim(), parentCommentId: parentId },
      );
      setText("");
      onSubmit({ ...added, replies: [] });
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setPosting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      style={{
        marginTop: "0.6rem",
        display: "flex", gap: "0.5rem", alignItems: "flex-start",
      }}
    >
      <Avatar name={currentUser.fullName} size={28} />
      <div style={{ flex: 1 }}>
        <textarea
          ref={ref}
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="اكتب ردك..."
          maxLength={2000}
          rows={2}
          style={{
            width: "100%", boxSizing: "border-box",
            border: "1.5px solid #c7d2fe", borderRadius: 8,
            padding: "0.5rem 0.75rem", fontSize: "0.82rem",
            fontFamily: "inherit", color: "#334155",
            resize: "vertical", outline: "none",
            background: "#f8faff",
            transition: "border-color 0.15s",
          }}
          onFocus={e => (e.currentTarget.style.borderColor = "var(--color-primary)")}
          onBlur={e  => (e.currentTarget.style.borderColor = "#c7d2fe")}
        />
        {error && (
          <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#dc2626" }}>
            {error}
          </p>
        )}
        <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.35rem", justifyContent: "flex-end" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: "none", border: "1px solid #e2e8f0",
              borderRadius: 6, padding: "0.3rem 0.75rem",
              fontSize: "0.78rem", color: "#64748b", cursor: "pointer",
              fontFamily: "inherit",
            }}
          >
            إلغاء
          </button>
          <button
            type="submit"
            disabled={posting || !text.trim()}
            style={{
              backgroundColor: posting || !text.trim() ? "#86efac" : "var(--color-primary)",
              color: "#fff", border: "none", borderRadius: 6,
              padding: "0.3rem 0.85rem", fontWeight: 700,
              fontSize: "0.78rem", cursor: posting || !text.trim() ? "not-allowed" : "pointer",
              fontFamily: "inherit",
            }}
          >
            {posting ? "..." : "إرسال"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ─── Single comment node (recursive) ─────────────────────────────────────────

function CommentNode({
  comment,
  depth,
  requestId,
  currentUser,
  onReplyAdded,
  onDelete,
  deletingId,
}: {
  comment: Comment;
  depth: number;
  requestId: string;
  currentUser?: { id: string; fullName: string } | null;
  onReplyAdded: (parentId: string, reply: Comment) => void;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const [showReplyForm,    setShowReplyForm]    = useState(false);
  const [repliesExpanded,  setRepliesExpanded]  = useState(true);

  const isOwn     = currentUser && comment.userId === currentUser.id;
  const replies   = comment.replies ?? [];
  const hasMore   = replies.length > MAX_VISIBLE_REPLIES && repliesExpanded;
  const [showAll, setShowAll] = useState(false);

  const visibleReplies = repliesExpanded
    ? (showAll ? replies : replies.slice(0, MAX_VISIBLE_REPLIES))
    : [];

  const canReply = !!currentUser && depth < MAX_DEPTH;

  return (
    <div style={{
      display: "flex",
      gap: depth === 0 ? "0.75rem" : "0.55rem",
    }}>
      {/* Thread line for nested comments */}
      {depth > 0 && (
        <div style={{
          width: 2,
          minHeight: "100%",
          background: "#e2e8f0",
          borderRadius: 2,
          flexShrink: 0,
          marginTop: 4,
          alignSelf: "stretch",
        }} />
      )}

      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Comment header row */}
        <div style={{ display: "flex", gap: "0.55rem", alignItems: "flex-start" }}>
          <Avatar name={comment.userName} size={depth === 0 ? 34 : 28} />
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Name + time + delete */}
            <div style={{
              display: "flex", alignItems: "center", flexWrap: "wrap",
              gap: "0.4rem", marginBottom: "0.2rem",
            }}>
              <span style={{ fontWeight: 700, fontSize: depth === 0 ? "0.85rem" : "0.8rem", color: "#1e293b" }}>
                {comment.userName}
              </span>
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                {new Date(comment.createdAt).toLocaleDateString("en-GB", {
                  year: "numeric", month: "numeric", day: "numeric",
                  hour: "2-digit", minute: "2-digit",
                })}
              </span>
              {isOwn && (
                <button
                  onClick={() => onDelete(comment.id)}
                  disabled={deletingId === comment.id}
                  style={{
                    marginRight: "auto",
                    background: "none", border: "none",
                    color: "#ef4444", fontSize: "0.7rem",
                    cursor: deletingId === comment.id ? "not-allowed" : "pointer",
                    fontFamily: "inherit", fontWeight: 600,
                    opacity: deletingId === comment.id ? 0.5 : 1,
                  }}
                >
                  حذف
                </button>
              )}
            </div>

            {/* Content */}
            <p style={{
              margin: 0,
              fontSize: depth === 0 ? "0.87rem" : "0.83rem",
              color: "#334155", lineHeight: 1.6,
              whiteSpace: "pre-wrap", wordBreak: "break-word",
            }}>
              {comment.content}
            </p>

            {/* Action bar */}
            <div style={{ display: "flex", gap: "0.75rem", marginTop: "0.4rem", alignItems: "center" }}>
              {canReply && (
                <button
                  type="button"
                  onClick={() => setShowReplyForm(v => !v)}
                  style={{
                    background: "none", border: "none", padding: 0,
                    fontSize: "0.75rem", color: "#6366f1", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                    display: "flex", alignItems: "center", gap: "0.25rem",
                  }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 0 0-4-4H4"/>
                  </svg>
                  رد
                </button>
              )}

              {replies.length > 0 && (
                <button
                  type="button"
                  onClick={() => setRepliesExpanded(v => !v)}
                  style={{
                    background: "none", border: "none", padding: 0,
                    fontSize: "0.73rem", color: "#64748b", fontWeight: 500,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {repliesExpanded
                    ? `إخفاء الردود (${replies.length})`
                    : `عرض الردود (${replies.length})`}
                </button>
              )}
            </div>

            {/* Inline reply form */}
            {showReplyForm && currentUser && (
              <ReplyForm
                parentId={comment.id}
                requestId={requestId}
                currentUser={currentUser}
                onSubmit={reply => {
                  onReplyAdded(comment.id, reply);
                  setShowReplyForm(false);
                  setRepliesExpanded(true);
                  setShowAll(true);
                }}
                onCancel={() => setShowReplyForm(false)}
              />
            )}

            {/* Nested replies */}
            {visibleReplies.length > 0 && (
              <div style={{ marginTop: "0.65rem", display: "flex", flexDirection: "column", gap: "0.65rem" }}>
                {visibleReplies.map(reply => (
                  <CommentNode
                    key={reply.id}
                    comment={reply}
                    depth={Math.min(depth + 1, MAX_DEPTH)}
                    requestId={requestId}
                    currentUser={currentUser}
                    onReplyAdded={onReplyAdded}
                    onDelete={onDelete}
                    deletingId={deletingId}
                  />
                ))}

                {/* "عرض المزيد" */}
                {hasMore && !showAll && (
                  <button
                    type="button"
                    onClick={() => setShowAll(true)}
                    style={{
                      background: "none", border: "none", padding: "0.2rem 0",
                      fontSize: "0.75rem", color: "#6366f1", fontWeight: 600,
                      cursor: "pointer", fontFamily: "inherit",
                      marginRight: "2rem",
                    }}
                  >
                    عرض {replies.length - MAX_VISIBLE_REPLIES} رد إضافي...
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RequestDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id     = params?.id as string;
  const { user } = useAuth();
  const { openAuthModal } = useAuthGate();

  const [request,    setRequest]    = useState<BuyerRequest | null>(null);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqError,   setReqError]   = useState("");

  // Flat list from API; tree is derived
  const [flatComments,  setFlatComments]  = useState<Comment[]>([]);
  const [tree,          setTree]          = useState<Comment[]>([]);
  const [cmtLoading,    setCmtLoading]    = useState(true);
  const [cmtError,      setCmtError]      = useState("");
  const [newComment,    setNewComment]    = useState("");
  const [posting,       setPosting]       = useState(false);
  const [postError,     setPostError]     = useState("");
  const [deletingId,    setDeletingId]    = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Rebuild tree whenever flat list changes
  useEffect(() => {
    setTree(buildTree(flatComments));
  }, [flatComments]);

  // Load request
  useEffect(() => {
    if (!id) return;
    api.get<BuyerRequest>(`/buyer-requests/${id}`)
      .then(setRequest)
      .catch(e => setReqError(normalizeError(e)))
      .finally(() => setReqLoading(false));
  }, [id]);

  // Load comments
  useEffect(() => {
    if (!id) return;
    api.get<Comment[]>(`/buyer-requests/${id}/comments`)
      .then(list => setFlatComments(list.map(c => ({ ...c, replies: [] }))))
      .catch(e => setCmtError(normalizeError(e)))
      .finally(() => setCmtLoading(false));
  }, [id]);

  // Top-level comment submit
  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const added = await api.post<Comment>(`/buyer-requests/${id}/comments`, {
        content: newComment.trim(),
      });
      setFlatComments(prev => [...prev, { ...added, replies: [] }]);
      setNewComment("");
      if (request) setRequest(r => r ? { ...r, commentsCount: r.commentsCount + 1 } : r);
      textareaRef.current?.focus();
    } catch (err) {
      setPostError(normalizeError(err));
    } finally {
      setPosting(false);
    }
  }

  // Reply submitted from CommentNode
  const handleReplyAdded = useCallback((parentId: string, reply: Comment) => {
    setFlatComments(prev => [...prev, { ...reply, replies: [] }]);
    if (request) setRequest(r => r ? { ...r, commentsCount: r.commentsCount + 1 } : r);
  }, [request]);

  // Delete
  async function handleDeleteComment(commentId: string) {
    setDeletingId(commentId);
    try {
      await api.delete(`/buyer-requests/comments/${commentId}`);
      setFlatComments(prev => prev.filter(c => c.id !== commentId));
      if (request) setRequest(r => r ? { ...r, commentsCount: Math.max(0, r.commentsCount - 1) } : r);
    } catch (err) {
      setCmtError(normalizeError(err));
    } finally {
      setDeletingId(null);
    }
  }

  const totalComments = flatComments.length;
  const currentUserCtx = user ? { id: user.id, fullName: user.fullName } : null;

  // ── Render ───────────────────────────────────────────────────────────────────

  if (reqLoading) {
    return (
      <div dir="rtl" style={{ backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (reqError || !request) {
    return (
      <div dir="rtl" style={{ backgroundColor: "#f8fafc", padding: "2rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>{reqError || "الطلب غير موجود"}</p>
        <Link href="/requests" style={{ color: "var(--color-primary)", fontWeight: 700 }}>← العودة للطلبات</Link>
      </div>
    );
  }

  const colors = PROPERTY_TYPE_COLORS[request.propertyType] ?? PROPERTY_TYPE_COLORS.Building;

  return (
    <div dir="rtl" style={{ backgroundColor: "#f8fafc", paddingBottom: "3rem" }}>

      {/* ── Sticky header ─────────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: "#fff", borderBottom: "1px solid #e2e8f0",
        padding: "0.75rem 1.25rem",
        display: "flex", alignItems: "center", gap: "0.75rem",
        position: "sticky", top: 68, zIndex: 9,
      }}>
        <button
          onClick={() => router.back()}
          style={{
            background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 34, height: 34, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <span style={{ fontSize: "0.88rem", fontWeight: 700, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {request.title}
        </span>
        <Link href="/requests" style={{ fontSize: "0.78rem", color: "#64748b", textDecoration: "none", whiteSpace: "nowrap" }}>
          كل الطلبات
        </Link>
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", padding: "1.25rem" }}>

        {/* ── Request card ──────────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: "#fff", borderRadius: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          padding: "1.4rem",
          marginBottom: "1.5rem",
        }}>
          {/* Type + date */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <span style={{
              backgroundColor: colors.bg, color: colors.color,
              border: `1px solid ${colors.border}`,
              borderRadius: 20, padding: "0.22rem 0.9rem",
              fontSize: "0.78rem", fontWeight: 700,
            }}>
              {PROPERTY_TYPE_LABELS[request.propertyType] ?? request.propertyType}
            </span>
            <span style={{ fontSize: "0.74rem", color: "#94a3b8" }}>
              {new Date(request.createdAt).toLocaleDateString("en-GB", {
                year: "numeric", month: "numeric", day: "numeric",
              })}
            </span>
          </div>

          {/* Title */}
          <h1 style={{ margin: "0 0 1rem", fontSize: "1.2rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>
            {request.title}
          </h1>

          {/* Description */}
          <p style={{
            margin: "0 0 1.25rem", fontSize: "0.92rem", color: "#334155",
            lineHeight: 1.75, whiteSpace: "pre-wrap", wordBreak: "break-word",
          }}>
            {request.description}
          </p>

          {/* Meta row */}
          <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
            {/* Publisher */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
              <Avatar name={request.userName} size={32} />
              <div>
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{request.userName}</p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>الناشر</p>
              </div>
            </div>

            {/* Location */}
            {(request.city || request.neighborhood) && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
                <div style={{
                  width: 32, height: 32, borderRadius: "50%",
                  backgroundColor: "#f0fdf4", display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div>
                  <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>
                    {[request.city, request.neighborhood].filter(Boolean).join(" / ")}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>الموقع</p>
                </div>
              </div>
            )}

            {/* Comments count */}
            <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginRight: "auto" }}>
              <div style={{
                width: 32, height: 32, borderRadius: "50%",
                backgroundColor: "#f0f9ff", display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div>
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{totalComments}</p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>رد</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Discussion section ────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: "#fff", borderRadius: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          padding: "1.25rem",
        }}>
          <h2 style={{ margin: "0 0 0.1rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
            الردود والتعليقات
          </h2>
          <p style={{ margin: "0 0 1.1rem", fontSize: "0.78rem", color: "#94a3b8" }}>
            {totalComments === 0 ? "لا توجد ردود بعد — كن أول من يرد" : `${totalComments} رد`}
          </p>

          {cmtError && (
            <p style={{ fontSize: "0.82rem", color: "#dc2626", margin: "0 0 0.75rem" }}>{cmtError}</p>
          )}

          {/* Thread list */}
          {cmtLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem 0" }}>
              <Spinner />
            </div>
          ) : tree.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              لا توجد ردود حتى الآن
            </div>
          ) : (
            <div style={{
              marginBottom: "1.25rem",
              display: "flex", flexDirection: "column", gap: "1rem",
            }}>
              {tree.map(c => (
                <CommentNode
                  key={c.id}
                  comment={c}
                  depth={0}
                  requestId={id}
                  currentUser={currentUserCtx}
                  onReplyAdded={handleReplyAdded}
                  onDelete={handleDeleteComment}
                  deletingId={deletingId}
                />
              ))}
            </div>
          )}

          {/* Top-level comment form */}
          {user ? (
            <form
              onSubmit={handlePostComment}
              style={{
                borderTop: totalComments > 0 ? "1px solid #f1f5f9" : "none",
                paddingTop: totalComments > 0 ? "1.1rem" : 0,
              }}
            >
              <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                <Avatar name={user.fullName} size={36} />
                <div style={{ flex: 1 }}>
                  <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="اكتب تعليقاً جديداً..."
                    maxLength={2000}
                    rows={3}
                    style={{
                      width: "100%", boxSizing: "border-box",
                      border: "1.5px solid #e2e8f0", borderRadius: 10,
                      padding: "0.65rem 0.9rem", fontSize: "0.88rem",
                      fontFamily: "inherit", color: "#334155",
                      resize: "vertical", outline: "none",
                      transition: "border-color 0.15s",
                    }}
                    onFocus={e => (e.currentTarget.style.borderColor = "var(--color-primary)")}
                    onBlur={e  => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  />
                  {postError && (
                    <p style={{ margin: "0.3rem 0 0", fontSize: "0.78rem", color: "#dc2626" }}>{postError}</p>
                  )}
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "0.5rem" }}>
                    <button
                      type="submit"
                      disabled={posting || !newComment.trim()}
                      style={{
                        backgroundColor: posting || !newComment.trim() ? "#86efac" : "var(--color-primary)",
                        color: "#fff", border: "none", borderRadius: 8,
                        padding: "0.55rem 1.4rem", fontWeight: 700,
                        fontSize: "0.88rem",
                        cursor: posting || !newComment.trim() ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {posting ? "جارٍ الإرسال..." : "إرسال التعليق"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div style={{
              backgroundColor: "#f8fafc", borderRadius: 10,
              padding: "0.85rem 1rem",
              borderTop: totalComments > 0 ? "1px solid #f1f5f9" : "none",
              marginTop: totalComments > 0 ? "0.5rem" : 0,
              textAlign: "center", fontSize: "0.85rem", color: "#64748b",
            }}>
              <button
                type="button"
                onClick={openAuthModal}
                style={{
                  color: "var(--color-primary)", fontWeight: 700,
                  background: "none", border: "none", padding: 0,
                  cursor: "pointer", fontSize: "inherit",
                }}
              >
                سجّل دخولك
              </button>
              {" "}للرد على هذا الطلب
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
