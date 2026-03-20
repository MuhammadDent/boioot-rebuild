"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { api, normalizeError } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";
import Spinner from "@/components/ui/Spinner";

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
  createdAt: string;
}

// ─── Avatar ───────────────────────────────────────────────────────────────────
function Avatar({ name, size = 36 }: { name: string; size?: number }) {
  const letter = name?.trim()?.[0]?.toUpperCase() ?? "؟";
  const colors = ["#0ea5e9","#8b5cf6","#f59e0b","#10b981","#ef4444","#3b82f6"];
  const bg = colors[name.charCodeAt(0) % colors.length] ?? "#64748b";
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

// ─── Comment card ─────────────────────────────────────────────────────────────
function CommentCard({
  comment,
  currentUserId,
  onDelete,
  deletingId,
}: {
  comment: Comment;
  currentUserId?: string;
  onDelete: (id: string) => void;
  deletingId: string | null;
}) {
  const isOwn = currentUserId && comment.userId === currentUserId;
  return (
    <div style={{
      display: "flex", gap: "0.75rem",
      padding: "0.85rem 0",
      borderBottom: "1px solid #f1f5f9",
    }}>
      <Avatar name={comment.userName} size={36} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.25rem" }}>
          <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#1e293b" }}>
            {comment.userName}
          </span>
          <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
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
                color: "#ef4444", fontSize: "0.72rem",
                cursor: deletingId === comment.id ? "not-allowed" : "pointer",
                fontFamily: "inherit", fontWeight: 600, opacity: deletingId === comment.id ? 0.5 : 1,
              }}
            >
              حذف
            </button>
          )}
        </div>
        <p style={{ margin: 0, fontSize: "0.88rem", color: "#334155", lineHeight: 1.6, whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
          {comment.content}
        </p>
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

  const [request, setRequest]     = useState<BuyerRequest | null>(null);
  const [reqLoading, setReqLoading] = useState(true);
  const [reqError, setReqError]   = useState("");

  const [comments, setComments]         = useState<Comment[]>([]);
  const [cmtLoading, setCmtLoading]     = useState(true);
  const [cmtError, setCmtError]         = useState("");
  const [newComment, setNewComment]     = useState("");
  const [posting, setPosting]           = useState(false);
  const [postError, setPostError]       = useState("");
  const [deletingId, setDeletingId]     = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

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
      .then(setComments)
      .catch(e => setCmtError(normalizeError(e)))
      .finally(() => setCmtLoading(false));
  }, [id]);

  async function handlePostComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setPosting(true);
    setPostError("");
    try {
      const added = await api.post<Comment>(`/buyer-requests/${id}/comments`, {
        content: newComment.trim(),
      });
      setComments(prev => [...prev, added]);
      setNewComment("");
      if (request) setRequest(r => r ? { ...r, commentsCount: r.commentsCount + 1 } : r);
      textareaRef.current?.focus();
    } catch (e) {
      setPostError(normalizeError(e));
    } finally {
      setPosting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    setDeletingId(commentId);
    try {
      await api.delete(`/buyer-requests/comments/${commentId}`);
      setComments(prev => prev.filter(c => c.id !== commentId));
      if (request) setRequest(r => r ? { ...r, commentsCount: Math.max(0, r.commentsCount - 1) } : r);
    } catch (e) {
      setCmtError(normalizeError(e));
    } finally {
      setDeletingId(null);
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  if (reqLoading) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <Spinner />
      </div>
    );
  }

  if (reqError || !request) {
    return (
      <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", padding: "2rem 1.25rem", textAlign: "center" }}>
        <p style={{ color: "#dc2626", fontWeight: 600 }}>{reqError || "الطلب غير موجود"}</p>
        <Link href="/requests" style={{ color: "var(--color-primary)", fontWeight: 700 }}>← العودة للطلبات</Link>
      </div>
    );
  }

  const colors = PROPERTY_TYPE_COLORS[request.propertyType] ?? PROPERTY_TYPE_COLORS.Building;

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "3rem" }}>

      {/* ── Header bar ───────────────────────────────────────────────────────── */}
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

        {/* ── Request card ─────────────────────────────────────────────────────── */}
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
          <div style={{
            display: "flex", flexWrap: "wrap", gap: "1rem",
            paddingTop: "1rem", borderTop: "1px solid #f1f5f9",
          }}>
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
                <p style={{ margin: 0, fontSize: "0.82rem", fontWeight: 700, color: "#1e293b" }}>{comments.length}</p>
                <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>رد</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Comments section ──────────────────────────────────────────────────── */}
        <div style={{
          backgroundColor: "#fff", borderRadius: 16,
          boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
          padding: "1.25rem",
        }}>
          <h2 style={{ margin: "0 0 0.1rem", fontSize: "1rem", fontWeight: 700, color: "#0f172a" }}>
            الردود والتعليقات
          </h2>
          <p style={{ margin: "0 0 1.1rem", fontSize: "0.78rem", color: "#94a3b8" }}>
            {comments.length === 0 ? "لا توجد ردود بعد — كن أول من يرد" : `${comments.length} رد`}
          </p>

          {/* Comments error */}
          {cmtError && (
            <p style={{ fontSize: "0.82rem", color: "#dc2626", margin: "0 0 0.75rem" }}>{cmtError}</p>
          )}

          {/* Comments list */}
          {cmtLoading ? (
            <div style={{ display: "flex", justifyContent: "center", padding: "1.5rem 0" }}>
              <Spinner />
            </div>
          ) : comments.length === 0 ? (
            <div style={{ textAlign: "center", padding: "1.5rem 0", color: "#94a3b8", fontSize: "0.85rem" }}>
              لا توجد ردود حتى الآن
            </div>
          ) : (
            <div style={{ marginBottom: "1.25rem" }}>
              {comments.map(c => (
                <CommentCard
                  key={c.id}
                  comment={c}
                  currentUserId={user?.id}
                  onDelete={handleDeleteComment}
                  deletingId={deletingId}
                />
              ))}
            </div>
          )}

          {/* Add comment form — below the list */}
          {user ? (
            <form onSubmit={handlePostComment} style={{ borderTop: comments.length > 0 ? "1px solid #f1f5f9" : "none", paddingTop: comments.length > 0 ? "1.1rem" : 0 }}>
              <div style={{ display: "flex", gap: "0.65rem", alignItems: "flex-start" }}>
                <Avatar name={user.fullName} size={36} />
                <div style={{ flex: 1 }}>
                  <textarea
                    ref={textareaRef}
                    value={newComment}
                    onChange={e => setNewComment(e.target.value)}
                    placeholder="اكتب ردك هنا..."
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
                    onFocus={e => e.currentTarget.style.borderColor = "var(--color-primary)"}
                    onBlur={e => e.currentTarget.style.borderColor = "#e2e8f0"}
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
                        fontSize: "0.88rem", cursor: posting || !newComment.trim() ? "not-allowed" : "pointer",
                        fontFamily: "inherit",
                      }}
                    >
                      {posting ? "جارٍ الإرسال..." : "إرسال الرد"}
                    </button>
                  </div>
                </div>
              </div>
            </form>
          ) : (
            <div style={{
              backgroundColor: "#f8fafc", borderRadius: 10,
              padding: "0.85rem 1rem",
              borderTop: comments.length > 0 ? "1px solid #f1f5f9" : "none",
              marginTop: comments.length > 0 ? "0.5rem" : 0,
              textAlign: "center", fontSize: "0.85rem", color: "#64748b",
            }}>
              <Link href="/login" style={{ color: "var(--color-primary)", fontWeight: 700 }}>
                سجّل دخولك
              </Link>
              {" "}للرد على هذا الطلب
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
