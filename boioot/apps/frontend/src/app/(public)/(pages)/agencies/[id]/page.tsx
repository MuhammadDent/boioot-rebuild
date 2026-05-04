"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AgencyDetail {
  id:           string;
  fullName:     string;
  role:         string;
  roleLabel:    string;
  city:         string | null;
  bio:          string | null;
  logoUrl:      string | null;
  phone:        string | null;
  isVerified:   boolean;
  isFeatured:   boolean;
  listingCount: number;
  createdAt:    string;
}

export default function AgencyDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [agency,  setAgency]  = useState<AgencyDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

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

  const initial = agency.fullName.trim()[0] ?? "؟";

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
                  ✓ موثق
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

      {/* ── More info ── */}
      <div style={{
        background: "#fff", border: "1px solid #e2e8f0",
        borderRadius: 12, padding: "1.25rem 1.5rem",
      }}>
        <p style={{ margin: 0, color: "#94a3b8", fontSize: "0.85rem", textAlign: "center" }}>
          سيتم قريباً عرض إعلانات هذا المكتب / الوسيط وتقييماته في هذه الصفحة.
        </p>
      </div>
    </div>
  );
}
