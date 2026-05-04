"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgencyDetail {
  id:                 string;
  fullName:           string;
  role:               string;
  roleLabel:          string;
  city:               string | null;
  bio:                string | null;
  logoUrl:            string | null;
  phone:              string | null;
  isVerified:         boolean;
  verificationStatus: string;
  verificationLevel:  number;
  verificationBadge:  string | null;
  isFeatured:         boolean;
  listingCount:       number;
  createdAt:          string;
  averageRating:      number;
  ratingsCount:       number;
}

interface AgencyRatingItem {
  id:           string;
  reviewerId:   string;
  reviewerName: string;
  rating:       number;
  comment:      string | null;
  createdAt:    string;
}

interface RatingsResult {
  items:         AgencyRatingItem[];
  page:          number;
  pageSize:      number;
  totalCount:    number;
  averageRating: number;
  ratingsCount:  number;
}

// ── Star display ──────────────────────────────────────────────────────────────

function Stars({ value, size = "1rem" }: { value: number; size?: string }) {
  return (
    <span style={{ fontSize: size, lineHeight: 1 }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ color: n <= value ? "#f59e0b" : "#d1d5db" }}>★</span>
      ))}
    </span>
  );
}

// ── Interactive star picker ───────────────────────────────────────────────────

function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div style={{ display: "flex", gap: "0.15rem", cursor: "pointer" }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span
          key={n}
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          style={{
            fontSize:   "1.8rem",
            color:      n <= (hover || value) ? "#f59e0b" : "#d1d5db",
            transition: "color 0.1s",
            userSelect: "none",
          }}
        >
          ★
        </span>
      ))}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AgencyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { user, token, isAuthenticated } = useAuth();

  const [agency,  setAgency]  = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  // Ratings state
  const [ratings,      setRatings]      = useState<RatingsResult | null>(null);
  const [ratingsLoad,  setRatingsLoad]  = useState(true);
  const [ratingsPage,  setRatingsPage]  = useState(1);

  // Rating form state
  const [myRating,     setMyRating]     = useState(0);
  const [myComment,    setMyComment]    = useState("");
  const [submitting,   setSubmitting]   = useState(false);
  const [submitMsg,    setSubmitMsg]    = useState("");

  // ── Fetch agency detail ────────────────────────────────────────────────────

  useEffect(() => {
    if (!params.id) return;
    fetch(`/api/agencies/${params.id}`, { cache: "no-store" })
      .then(res => {
        if (res.status === 404) throw new Error("not_found");
        if (!res.ok) throw new Error("error");
        return res.json();
      })
      .then(setAgency)
      .catch(e => setError(e.message === "not_found" ? "404" : "error"))
      .finally(() => setLoading(false));
  }, [params.id]);

  // ── Fetch ratings ──────────────────────────────────────────────────────────

  const fetchRatings = useCallback(async (page: number) => {
    if (!params.id) return;
    setRatingsLoad(true);
    try {
      const res  = await fetch(`/api/agencies/${params.id}/ratings?page=${page}&pageSize=5`, { cache: "no-store" });
      if (!res.ok) return;
      const data: RatingsResult = await res.json();
      setRatings(data);
      // Pre-fill form if user already rated (found in this page)
      if (isAuthenticated && user) {
        const mine = data.items.find(r => r.reviewerId === user.id);
        if (mine) {
          setMyRating(mine.rating);
          setMyComment(mine.comment ?? "");
        }
      }
    } finally {
      setRatingsLoad(false);
    }
  }, [params.id, isAuthenticated, user]);

  useEffect(() => { fetchRatings(ratingsPage); }, [ratingsPage, fetchRatings]);

  // ── Submit rating ──────────────────────────────────────────────────────────

  async function handleSubmitRating(e: React.FormEvent) {
    e.preventDefault();
    if (!token || myRating === 0) return;
    setSubmitting(true);
    setSubmitMsg("");
    try {
      const res = await fetch(`/api/agencies/${params.id}/ratings`, {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ rating: myRating, comment: myComment || null }),
      });
      if (res.ok) {
        setSubmitMsg("تم حفظ تقييمك بنجاح ✓");
        await fetchRatings(1);
        setRatingsPage(1);
      } else {
        const data = await res.json().catch(() => ({}));
        setSubmitMsg(data.error ?? "حدث خطأ أثناء الحفظ");
      }
    } catch {
      setSubmitMsg("حدث خطأ في الاتصال");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Loading / error states ─────────────────────────────────────────────────

  if (loading) return (
    <div dir="rtl" style={{ maxWidth: 720, margin: "3rem auto", padding: "0 1rem" }}>
      {[200, 120, 300, 80].map((w, i) => (
        <div key={i} style={{
          height: i === 0 ? 80 : 24, width: `${w}px`, maxWidth: "100%",
          background: "#f1f5f9", borderRadius: 8, marginBottom: "1rem",
          animation: "pulse 1.5s infinite",
        }} />
      ))}
    </div>
  );

  if (error === "404") return (
    <div dir="rtl" style={{ textAlign: "center", padding: "4rem 1rem" }}>
      <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🏢</div>
      <h2 style={{ fontWeight: 700, margin: "0 0 0.5rem", color: "#0f172a" }}>لم يُعثر على الملف</h2>
      <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>هذا المكتب أو الوسيط غير موجود أو لم يُفعَّل بعد.</p>
      <Link href="/agencies" className="btn btn-primary" style={{ textDecoration: "none", padding: "0.6rem 1.5rem" }}>
        ← العودة للقائمة
      </Link>
    </div>
  );

  if (error || !agency) return (
    <div dir="rtl" style={{ textAlign: "center", padding: "4rem 1rem", color: "#dc2626" }}>
      حدث خطأ أثناء تحميل الصفحة.
    </div>
  );

  const initial    = agency.fullName.trim()[0] ?? "؟";
  const autoBadge  = agency.role === "Office" ? "مكتب موثوق ✓" : "وسيط موثوق ✓";
  const badgeLabel = agency.verificationBadge?.trim() || autoBadge;
  const isSelf     = isAuthenticated && user?.id === agency.id;
  const myExisting = ratings?.items.find(r => r.reviewerId === user?.id);

  return (
    <div dir="rtl" style={{ maxWidth: 720, margin: "0 auto", padding: "2rem 1rem" }}>

      {/* ── Back ── */}
      <button
        onClick={() => router.back()}
        style={{
          background: "none", border: "none", cursor: "pointer",
          color: "#64748b", fontSize: "0.88rem", marginBottom: "1.5rem",
          display: "flex", alignItems: "center", gap: "0.3rem", padding: 0,
        }}
      >
        ← العودة
      </button>

      {/* ── Profile card ── */}
      <div style={{
        background: "#fff", border: `1.5px solid ${agency.isFeatured ? "#0f766e" : "#e2e8f0"}`,
        borderRadius: 16, padding: "2rem", marginBottom: "1.5rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
      }}>

        {/* Logo + header */}
        <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div style={{
            width: 90, height: 90, borderRadius: 14, overflow: "hidden", flexShrink: 0,
            background: "#e8f5e9", display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px solid #e2e8f0",
          }}>
            {agency.logoUrl ? (
              <img src={agency.logoUrl} alt={agency.fullName}
                style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            ) : (
              <span style={{ fontSize: "2.2rem", fontWeight: 700, color: "#0f766e" }}>{initial}</span>
            )}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", fontWeight: 800, color: "#0f172a" }}>
              {agency.fullName}
            </h1>

            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "0.5rem" }}>
              <span style={{
                fontSize: "0.8rem", padding: "0.2rem 0.7rem", borderRadius: "999px",
                background: agency.role === "Broker" ? "#eff6ff" : "#f0fdf4",
                color: agency.role === "Broker" ? "#1d4ed8" : "#15803d", fontWeight: 600,
              }}>
                {agency.roleLabel}
              </span>

              {agency.isVerified && (
                <span style={{
                  fontSize: "0.8rem", padding: "0.2rem 0.7rem", borderRadius: "999px",
                  background: "#fefce8", color: "#92400e", fontWeight: 600,
                }}>
                  {badgeLabel}
                </span>
              )}

              {agency.isFeatured && (
                <span style={{
                  fontSize: "0.8rem", padding: "0.2rem 0.7rem", borderRadius: "999px",
                  background: "#0f766e", color: "#fff", fontWeight: 600,
                }}>
                  مميز ⭐
                </span>
              )}
            </div>

            {/* Rating summary */}
            {agency.ratingsCount > 0 && (
              <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginBottom: "0.5rem" }}>
                <Stars value={Math.round(agency.averageRating)} />
                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>
                  {agency.averageRating.toFixed(1)} ({agency.ratingsCount} تقييم)
                </span>
              </div>
            )}

            <div style={{ display: "flex", gap: "1.25rem", fontSize: "0.85rem", color: "#64748b", flexWrap: "wrap" }}>
              {agency.city && <span>📍 {agency.city}</span>}
              <span>🏠 {agency.listingCount} إعلان</span>
              <span>📅 عضو منذ {new Date(agency.createdAt).getFullYear()}</span>
            </div>
          </div>
        </div>

        {/* Bio */}
        {agency.bio && (
          <div style={{
            padding: "1rem", background: "#f8fafc", borderRadius: 10, marginBottom: "1.5rem",
          }}>
            <h3 style={{ margin: "0 0 0.5rem", fontSize: "0.88rem", fontWeight: 700, color: "#475569" }}>
              نبذة تعريفية
            </h3>
            <p style={{ margin: 0, color: "#334155", lineHeight: 1.7, fontSize: "0.92rem" }}>
              {agency.bio}
            </p>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <Link
            href={`/dashboard/messages?userId=${agency.id}`}
            style={{
              padding: "0.65rem 1.5rem", background: "#0f766e", color: "#fff",
              borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.92rem",
            }}
          >
            💬 مراسلة
          </Link>

          {agency.phone && (
            <a
              href={`https://wa.me/${agency.phone.replace(/\D/g, "")}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "0.65rem 1.5rem", background: "#22c55e", color: "#fff",
                borderRadius: 10, textDecoration: "none", fontWeight: 700, fontSize: "0.92rem",
              }}
            >
              واتساب
            </a>
          )}
        </div>
      </div>

      {/* ── Ratings section ── */}
      <div style={{
        background: "#fff", border: "1px solid #e2e8f0",
        borderRadius: 14, padding: "1.5rem", marginBottom: "1.5rem",
      }}>
        <h2 style={{ margin: "0 0 1.25rem", fontSize: "1.1rem", fontWeight: 700, color: "#0f172a" }}>
          التقييمات
          {ratings && ratings.ratingsCount > 0 && (
            <span style={{ marginRight: "0.5rem", fontWeight: 400, fontSize: "0.9rem", color: "#64748b" }}>
              ({ratings.ratingsCount} تقييم · متوسط {ratings.averageRating.toFixed(1)})
            </span>
          )}
        </h2>

        {/* ── Rating form (logged-in, non-owner) ── */}
        {isAuthenticated && !isSelf && (
          <form
            onSubmit={handleSubmitRating}
            style={{
              background: "#f8fafc", borderRadius: 10, padding: "1.25rem",
              marginBottom: "1.5rem", border: "1px solid #e2e8f0",
            }}
          >
            <h3 style={{ margin: "0 0 0.75rem", fontSize: "0.92rem", fontWeight: 700, color: "#334155" }}>
              {myExisting ? "تعديل تقييمك" : "أضف تقييمك"}
            </h3>

            <StarPicker value={myRating} onChange={setMyRating} />

            <textarea
              value={myComment}
              onChange={e => setMyComment(e.target.value)}
              placeholder="تعليق اختياري..."
              rows={3}
              style={{
                width: "100%", marginTop: "0.75rem", padding: "0.65rem",
                border: "1px solid #e2e8f0", borderRadius: 8, resize: "vertical",
                fontSize: "0.88rem", fontFamily: "inherit", direction: "rtl", boxSizing: "border-box",
              }}
            />

            {submitMsg && (
              <p style={{
                margin: "0.5rem 0 0",
                color: submitMsg.includes("✓") ? "#15803d" : "#dc2626",
                fontSize: "0.85rem",
              }}>
                {submitMsg}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting || myRating === 0}
              className="btn btn-primary"
              style={{ marginTop: "0.75rem", padding: "0.5rem 1.25rem" }}
            >
              {submitting ? "جارٍ الحفظ..." : myExisting ? "تحديث التقييم" : "إرسال التقييم"}
            </button>
          </form>
        )}

        {!isAuthenticated && (
          <p style={{
            background: "#f8fafc", borderRadius: 10, padding: "1rem",
            marginBottom: "1.5rem", color: "#64748b", fontSize: "0.88rem",
            border: "1px solid #e2e8f0",
          }}>
            <Link href="/login" style={{ color: "#0f766e", fontWeight: 600, textDecoration: "none" }}>
              سجّل دخولك
            </Link>{" "}
            لتتمكن من تقييم هذا المكتب / الوسيط.
          </p>
        )}

        {/* ── Ratings list ── */}
        {ratingsLoad ? (
          <div style={{ color: "#94a3b8", fontSize: "0.88rem", textAlign: "center", padding: "1rem" }}>
            جارٍ التحميل...
          </div>
        ) : ratings && ratings.items.length > 0 ? (
          <>
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {ratings.items.map(r => (
                <div key={r.id} style={{
                  padding: "1rem", background: "#f8fafc", borderRadius: 10,
                  border: "1px solid #e2e8f0",
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.35rem" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <Stars value={r.rating} size="0.9rem" />
                      <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>
                        {r.reviewerName}
                        {r.reviewerId === user?.id && (
                          <span style={{ marginRight: "0.35rem", color: "#0f766e", fontSize: "0.75rem" }}>(أنت)</span>
                        )}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                      {new Date(r.createdAt).toLocaleDateString("ar-SY")}
                    </span>
                  </div>
                  {r.comment && (
                    <p style={{ margin: 0, fontSize: "0.85rem", color: "#475569", lineHeight: 1.6 }}>
                      {r.comment}
                    </p>
                  )}
                </div>
              ))}
            </div>

            {/* Ratings pagination */}
            {ratings.totalCount > 5 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1rem" }}>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                  disabled={ratingsPage <= 1}
                  onClick={() => setRatingsPage(p => Math.max(1, p - 1))}
                >
                  ← السابق
                </button>
                <span style={{ alignSelf: "center", fontSize: "0.82rem", color: "#64748b" }}>
                  {ratingsPage} / {Math.ceil(ratings.totalCount / 5)}
                </span>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                  disabled={ratingsPage >= Math.ceil(ratings.totalCount / 5)}
                  onClick={() => setRatingsPage(p => p + 1)}
                >
                  التالي →
                </button>
              </div>
            )}
          </>
        ) : (
          <p style={{ color: "#94a3b8", fontSize: "0.88rem", textAlign: "center", margin: 0 }}>
            لا توجد تقييمات بعد. كن أول من يقيّم!
          </p>
        )}
      </div>
    </div>
  );
}
