"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { api, normalizeError } from "@/lib/api";
import { propertiesApi } from "@/features/properties/api";
import { requestsApi } from "@/features/requests/api";
import {
  REQUEST_STATUS_LABELS,
  REQUEST_STATUS_BADGE,
} from "@/features/dashboard/requests/constants";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import type { RequestResponse, PagedResult, PropertyResponse } from "@/types";

const PAGE_SIZE = 10;

const myRequestsApi = {
  getList(page: number, pageSize: number): Promise<PagedResult<RequestResponse>> {
    return api.get(`/requests/my?page=${page}&pageSize=${pageSize}`);
  },
};

// ─── Add Request Modal (2-step) ───────────────────────────────────────────────

function AddRequestModal({
  user,
  onClose,
  onSuccess,
}: {
  user: { fullName: string; phone?: string | null; email: string };
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<1 | 2>(1);

  // step 1 — property search
  const [properties, setProperties]     = useState<PropertyResponse[]>([]);
  const [propLoading, setPropLoading]   = useState(true);
  const [selectedProp, setSelectedProp] = useState<PropertyResponse | null>(null);

  // step 2 — form fields
  const [name, setName]       = useState(user.fullName);
  const [phone, setPhone]     = useState(user.phone ?? "");
  const [email, setEmail]     = useState(user.email ?? "");
  const [message, setMessage] = useState("");
  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");

  useEffect(() => {
    setPropLoading(true);
    propertiesApi.getList({ page: 1, pageSize: 12 })
      .then(r => setProperties(r.items))
      .catch(() => setProperties([]))
      .finally(() => setPropLoading(false));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProp) return;
    setSaving(true);
    setError("");
    try {
      await requestsApi.submit({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        message: message.trim() || undefined,
        propertyId: selectedProp.id,
      });
      onSuccess();
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "flex-end",
    }} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: "20px 20px 0 0",
        width: "100%",
        maxHeight: "90vh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}>
        {/* Modal header */}
        <div style={{
          padding: "1rem 1.25rem 0.75rem",
          borderBottom: "1px solid #f1f5f9",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
            {step === 1 ? "اختر العقار" : "تفاصيل الطلب"}
          </h2>
          <button onClick={onClose} style={{
            background: "#f1f5f9", border: "none", borderRadius: 8,
            width: 32, height: 32, cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        {/* Step indicator */}
        <div style={{ padding: "0.6rem 1.25rem", display: "flex", gap: "0.4rem", alignItems: "center" }}>
          {[1, 2].map(s => (
            <div key={s} style={{
              flex: 1, height: 3, borderRadius: 3,
              backgroundColor: s <= step ? "var(--color-primary)" : "#e2e8f0",
              transition: "background 0.3s",
            }} />
          ))}
        </div>

        {/* ── Step 1: Pick a property ── */}
        {step === 1 && (
          <div style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.25rem 1.25rem" }}>
            <p style={{ margin: "0 0 0.75rem", fontSize: "0.82rem", color: "#64748b" }}>
              اختر العقار الذي تريد الاستفسار عنه
            </p>

            {propLoading ? (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {[0, 1, 2].map(i => (
                  <div key={i} style={{
                    height: 70, borderRadius: 10,
                    background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                    backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
                  }} />
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div style={{ textAlign: "center", color: "#94a3b8", padding: "2rem 0" }}>
                لا توجد عقارات متاحة حالياً
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {properties.map(p => (
                  <button key={p.id} onClick={() => { setSelectedProp(p); setStep(2); }}
                    style={{
                      background: "#fff", border: "1.5px solid #e2e8f0",
                      borderRadius: 10, padding: "0.75rem 1rem",
                      cursor: "pointer", textAlign: "right", width: "100%",
                      display: "flex", alignItems: "center", gap: "0.75rem",
                      fontFamily: "inherit",
                      transition: "border-color 0.15s",
                    }}
                  >
                    {p.thumbnailUrl ? (
                      <img src={p.thumbnailUrl} alt="" style={{
                        width: 54, height: 54, borderRadius: 8, objectFit: "cover", flexShrink: 0,
                      }} />
                    ) : (
                      <div style={{
                        width: 54, height: 54, borderRadius: 8,
                        backgroundColor: "#f1f5f9", flexShrink: 0,
                        display: "flex", alignItems: "center", justifyContent: "center",
                      }}>
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="1.5">
                          <rect x="3" y="10" width="18" height="11" rx="2"/>
                          <path d="M9 21V12h6v9M3 10l9-7 9 7"/>
                        </svg>
                      </div>
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#1e293b", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {p.title}
                      </p>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#64748b" }}>
                        {p.city ?? p.province ?? ""}
                        {p.price ? ` • ${p.price.toLocaleString("ar-SY")} ${p.currency ?? ""}` : ""}
                      </p>
                    </div>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2" style={{ flexShrink: 0, transform: "rotate(180deg)" }}>
                      <polyline points="9 18 15 12 9 6"/>
                    </svg>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Fill in form ── */}
        {step === 2 && selectedProp && (
          <form onSubmit={handleSubmit} style={{ flex: 1, overflowY: "auto", padding: "0.75rem 1.25rem 1.25rem" }}>
            {/* Selected property */}
            <div style={{
              backgroundColor: "#f8fafc", borderRadius: 10, padding: "0.65rem 0.9rem",
              marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.6rem",
            }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2">
                <rect x="3" y="10" width="18" height="11" rx="2"/><path d="M9 21V12h6v9M3 10l9-7 9 7"/>
              </svg>
              <span style={{ fontSize: "0.82rem", fontWeight: 700, color: "#1e293b", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {selectedProp.title}
              </span>
              <button type="button" onClick={() => setStep(1)} style={{
                background: "none", border: "none", cursor: "pointer",
                color: "#64748b", fontSize: "0.75rem", fontFamily: "inherit", padding: 0,
              }}>
                تغيير
              </button>
            </div>

            <InlineBanner message={error} />

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {/* Name */}
              <div className="form-group">
                <label className="form-label">الاسم الكامل *</label>
                <input
                  className="form-input"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  required
                  minLength={2}
                />
              </div>

              {/* Phone */}
              <div className="form-group">
                <label className="form-label">رقم الهاتف *</label>
                <input
                  className="form-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  required
                  minLength={5}
                  dir="ltr"
                />
              </div>

              {/* Email */}
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني (اختياري)</label>
                <input
                  className="form-input"
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  dir="ltr"
                />
              </div>

              {/* Message */}
              <div className="form-group">
                <label className="form-label">رسالتك (اختياري)</label>
                <textarea
                  className="form-input"
                  value={message}
                  onChange={e => setMessage(e.target.value)}
                  rows={3}
                  maxLength={2000}
                  style={{ resize: "none" }}
                  placeholder="اكتب تفاصيل استفسارك هنا..."
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={saving}
              style={{
                width: "100%", marginTop: "1rem",
                padding: "0.85rem",
                backgroundColor: saving ? "#86efac" : "var(--color-primary)",
                color: "#fff", border: "none", borderRadius: 12,
                fontWeight: 700, fontSize: "0.95rem", cursor: saving ? "not-allowed" : "pointer",
                fontFamily: "inherit",
              }}
            >
              {saving ? "جارٍ الإرسال..." : "إرسال الطلب"}
            </button>
          </form>
        )}
      </div>

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function MyRequestsPage() {
  const router = useRouter();
  const { user, isLoading, logout } = useProtectedRoute();

  const [requests, setRequests]     = useState<RequestResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [showModal, setShowModal]   = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const load = useCallback(async (p: number) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await myRequestsApi.getList(p, PAGE_SIZE);
      setRequests(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setPage(p);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load(1);
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  function handleRequestSuccess() {
    setShowModal(false);
    setSuccessMsg("تم إرسال طلبك بنجاح!");
    load(1);
    setTimeout(() => setSuccessMsg(""), 4000);
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc", paddingBottom: "2rem" }}>

      {/* ── Sticky Header ───────────────────────────────────────────────────── */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        position: "sticky",
        top: 0,
        zIndex: 10,
      }}>
        {/* Top row: back + title + logout */}
        <div style={{
          padding: "0.75rem 1.25rem",
          display: "flex",
          alignItems: "center",
          gap: "0.6rem",
        }}>
          <button
            onClick={() => router.back()}
            style={{
              background: "#f1f5f9", border: "none", borderRadius: 8,
              width: 36, height: 36, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}
            title="السابق"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#475569" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#1e293b" }}>
              طلباتي
            </h1>
            {!fetching && (
              <p style={{ margin: 0, fontSize: "0.74rem", color: "#64748b" }}>
                {totalCount} طلب مُرسَل
              </p>
            )}
          </div>

          <button
            onClick={handleLogout}
            style={{
              background: "#fee2e2", border: "none", borderRadius: 8,
              padding: "0.4rem 0.85rem", cursor: "pointer",
              display: "flex", alignItems: "center", gap: "0.35rem",
              color: "#dc2626", fontSize: "0.78rem", fontWeight: 700,
              fontFamily: "inherit",
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
              <polyline points="16 17 21 12 16 7"/>
              <line x1="21" y1="12" x2="9" y2="12"/>
            </svg>
            خروج
          </button>
        </div>

        {/* Quick nav row */}
        <div style={{
          display: "flex", alignItems: "center",
          padding: "0 1rem",
          borderTop: "1px solid #f1f5f9",
          overflowX: "auto", scrollbarWidth: "none",
        }}>
          {[
            { href: "/",              label: "الرئيسية" },
            { href: "/dashboard",     label: "ملفي الشخصي" },
            { href: "/daily-rentals", label: "الإيجار اليومي" },
            { href: "/projects",      label: "المشاريع" },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{
              textDecoration: "none", color: "#475569",
              fontSize: "0.8rem", fontWeight: 600,
              padding: "0.5rem 0.9rem", whiteSpace: "nowrap", display: "inline-block",
            }}>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* ── Content ─────────────────────────────────────────────────────────── */}
      <div style={{ padding: "1rem 1.25rem" }}>

        {/* Success banner */}
        {successMsg && (
          <div style={{
            backgroundColor: "#f0fdf4", border: "1px solid #86efac",
            borderRadius: 10, padding: "0.75rem 1rem",
            color: "#166534", fontSize: "0.85rem", fontWeight: 600,
            marginBottom: "1rem", display: "flex", alignItems: "center", gap: "0.5rem",
          }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
            {successMsg}
          </div>
        )}

        {/* Add Request button */}
        <button
          onClick={() => setShowModal(true)}
          style={{
            display: "flex", alignItems: "center", justifyContent: "center",
            gap: "0.5rem", width: "100%",
            padding: "0.75rem",
            backgroundColor: "var(--color-primary)", color: "#fff",
            border: "none", borderRadius: 12,
            fontWeight: 700, fontSize: "0.92rem",
            marginBottom: "1rem", cursor: "pointer",
            fontFamily: "inherit",
            boxShadow: "0 2px 8px rgba(34,197,94,0.25)",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          أضف طلب جديد
        </button>

        <InlineBanner message={fetchError} />

        {/* Loading skeleton */}
        {fetching && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                height: 90, borderRadius: 12,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%", animation: "shimmer 1.4s infinite",
              }} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!fetching && requests.length === 0 && !fetchError && (
          <div style={{
            backgroundColor: "#fff", borderRadius: 16, padding: "2.5rem 1.5rem",
            textAlign: "center", boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
            <p style={{ margin: "0 0 0.4rem", fontWeight: 700, fontSize: "1rem", color: "#1e293b" }}>
              لا توجد طلبات بعد
            </p>
            <p style={{ margin: "0 0 1rem", fontSize: "0.85rem", color: "#64748b" }}>
              اضغط على "أضف طلب جديد" للبدء
            </p>
          </div>
        )}

        {/* Requests list */}
        {!fetching && requests.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {requests.map(req => (
              <div key={req.id} style={{
                backgroundColor: "#fff", borderRadius: 12,
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "1rem 1.1rem",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.5rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1e293b" }}>
                    {req.propertyTitle ?? req.projectTitle ?? "طلب استفسار"}
                  </span>
                  <span className={REQUEST_STATUS_BADGE[req.status] ?? "badge badge-gray"} style={{ fontSize: "0.72rem" }}>
                    {REQUEST_STATUS_LABELS[req.status] ?? req.status}
                  </span>
                </div>

                {req.companyName && (
                  <p style={{ margin: "0 0 0.3rem", fontSize: "0.8rem", color: "#64748b" }}>
                    🏢 {req.companyName}
                  </p>
                )}

                {req.message && (
                  <p style={{
                    margin: "0.3rem 0", fontSize: "0.82rem", color: "#475569",
                    backgroundColor: "#f8fafc", borderRadius: 8, padding: "0.5rem 0.75rem",
                    borderRight: "3px solid #e2e8f0",
                  }}>
                    {req.message.length > 120 ? req.message.slice(0, 120) + "…" : req.message}
                  </p>
                )}

                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "0.5rem" }}>
                  <span style={{ fontSize: "0.75rem", color: "#94a3b8" }}>
                    {new Date(req.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" })}
                  </span>
                  {req.propertyId && (
                    <Link href={`/properties/${req.propertyId}`} style={{ fontSize: "0.78rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
                      عرض العقار ←
                    </Link>
                  )}
                  {req.projectId && (
                    <Link href={`/projects/${req.projectId}`} style={{ fontSize: "0.78rem", color: "var(--color-primary)", textDecoration: "none", fontWeight: 600 }}>
                      عرض المشروع ←
                    </Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!fetching && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.25rem" }}>
            <button disabled={page <= 1} onClick={() => load(page - 1)} style={{
              padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0",
              background: page <= 1 ? "#f8fafc" : "#fff", color: page <= 1 ? "#94a3b8" : "#1e293b",
              cursor: page <= 1 ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600,
            }}>السابق</button>
            <span style={{ padding: "0.5rem 0.75rem", fontSize: "0.85rem", color: "#64748b" }}>{page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => load(page + 1)} style={{
              padding: "0.5rem 1rem", borderRadius: 8, border: "1px solid #e2e8f0",
              background: page >= totalPages ? "#f8fafc" : "#fff", color: page >= totalPages ? "#94a3b8" : "#1e293b",
              cursor: page >= totalPages ? "not-allowed" : "pointer", fontFamily: "inherit", fontSize: "0.85rem", fontWeight: 600,
            }}>التالي</button>
          </div>
        )}
      </div>

      {/* ── Add Request Modal ────────────────────────────────────────────────── */}
      {showModal && (
        <AddRequestModal
          user={user}
          onClose={() => setShowModal(false)}
          onSuccess={handleRequestSuccess}
        />
      )}

      <style>{`
        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
