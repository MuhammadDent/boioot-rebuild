"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { normalizeError } from "@/lib/api";
import {
  adminGetSpecialRequests,
  adminGetSpecialRequestById,
  adminUpdateSpecialRequest,
  adminDeleteSpecialRequest,
  type SpecialRequest,
} from "@/features/special-requests/api";

// ─── Constants ────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

const STATUS_OPTIONS = [
  { value: "",          label: "جميع الحالات" },
  { value: "New",       label: "جديد" },
  { value: "Contacted", label: "تم التواصل" },
  { value: "Closed",    label: "مغلق" },
  { value: "Archived",  label: "أرشيف" },
];

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  New:       { bg: "#eff6ff", color: "#1d4ed8", label: "جديد" },
  Contacted: { bg: "#f0fdf4", color: "#15803d", label: "تم التواصل" },
  Closed:    { bg: "#fff7ed", color: "#c2410c", label: "مغلق" },
  Archived:  { bg: "#f1f5f9", color: "#475569", label: "أرشيف" },
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSpecialRequestsPage() {
  useProtectedRoute({ allowedRoles: ["Admin"] });

  const [requests,    setRequests]    = useState<SpecialRequest[]>([]);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search,      setSearch]      = useState("");
  const [statusFilter,setStatusFilter]= useState("");
  const [selected,    setSelected]    = useState<SpecialRequest | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const fetchPage = useCallback(async (p: number, q: string, st: string) => {
    setLoading(true);
    setError("");
    try {
      const result = await adminGetSpecialRequests({ search: q || undefined, status: st || undefined, page: p, pageSize: PAGE_SIZE });
      setRequests(result.items ?? []);
      setTotal(result.totalCount ?? 0);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPage(page, search, statusFilter); }, [page, search, statusFilter, fetchPage]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  }

  async function openDetail(id: string) {
    setDetailLoading(true);
    try {
      const detail = await adminGetSpecialRequestById(id);
      setSelected(detail);
    } catch {
      // fallback to row data
      const row = requests.find(r => r.id === id) ?? null;
      setSelected(row);
    } finally {
      setDetailLoading(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الطلب؟")) return;
    try {
      await adminDeleteSpecialRequest(id);
      setRequests(prev => prev.filter(r => r.id !== id));
      setTotal(prev => prev - 1);
      if (selected?.id === id) setSelected(null);
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function handleStatusChange(id: string, status: string) {
    try {
      const updated = await adminUpdateSpecialRequest(id, { status });
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status } : r));
      if (selected?.id === id) setSelected(updated);
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  async function handleNotesUpdate(id: string, notes: string) {
    try {
      const updated = await adminUpdateSpecialRequest(id, { notesInternal: notes });
      if (selected?.id === id) setSelected(updated);
    } catch (err) {
      setError(normalizeError(err));
    }
  }

  return (
    <div style={{ padding: "24px", maxWidth: 1100, margin: "0 auto" }}>
      <DashboardBackLink href="/dashboard/admin" label="العودة للوحة الإدارة" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: 0, color: "#1a1a2e" }}>الطلبات الخاصة</h1>
          <p style={{ color: "#777", marginTop: 4, fontSize: 14 }}>{total} طلب في النظام</p>
        </div>
      </div>

      {/* ── Filters ─────────────────────────────────────────────────────────── */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>
        <form onSubmit={handleSearch} style={{ display: "flex", gap: 8, flex: 1, minWidth: 200 }}>
          <input
            type="text"
            placeholder="بحث بالاسم، الهاتف، أو نص الطلب..."
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            style={{
              flex: 1, padding: "9px 14px", borderRadius: 8,
              border: "1.5px solid #e0e0e0", fontSize: 14, fontFamily: "inherit",
            }}
          />
          <button type="submit" style={{
            padding: "9px 20px", borderRadius: 8, background: "#1a1a2e",
            color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
          }}>بحث</button>
          {search && (
            <button type="button" onClick={() => { setSearch(""); setSearchInput(""); setPage(1); }} style={{
              padding: "9px 14px", borderRadius: 8, background: "#f1f5f9",
              color: "#333", border: "none", cursor: "pointer", fontSize: 14,
            }}>× مسح</button>
          )}
        </form>

        <select
          value={statusFilter}
          onChange={e => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: "9px 14px", borderRadius: 8, border: "1.5px solid #e0e0e0", fontSize: 14, background: "#fff", cursor: "pointer" }}
        >
          {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      </div>

      {error && <InlineBanner type="error" message={error} style={{ marginBottom: 16 }} />}

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f8fafc", borderBottom: "1px solid #e5e7eb" }}>
              {["الكود", "الاسم", "الهاتف", "نص الطلب", "الحالة", "تاريخ الإرسال", "إجراء"].map(h => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "#999" }}>جاري التحميل...</td></tr>
            ) : requests.length === 0 ? (
              <tr><td colSpan={7} style={{ textAlign: "center", padding: 48, color: "#999" }}>لا توجد طلبات</td></tr>
            ) : requests.map(r => {
              const st = STATUS_STYLES[r.status] ?? STATUS_STYLES.New;
              return (
                <tr key={r.id} style={{ borderBottom: "1px solid #f1f5f9" }}>
                  <td style={{ padding: "12px 16px", color: "#6b7280", fontFamily: "monospace", whiteSpace: "nowrap" }}>
                    {r.publicCode}
                  </td>
                  <td style={{ padding: "12px 16px", fontWeight: 600, color: "#1a1a2e", whiteSpace: "nowrap" }}>
                    {r.fullName || "—"}
                  </td>
                  <td style={{ padding: "12px 16px", direction: "ltr", textAlign: "left" }}>
                    <a href={`tel:${r.phone}`} style={{ color: "#1d4ed8", textDecoration: "none" }}>{r.phone}</a>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#374151", maxWidth: 240 }}>
                    <span style={{
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>{r.message}</span>
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    <span style={{ background: st.bg, color: st.color, padding: "3px 10px", borderRadius: 20, fontSize: 13, fontWeight: 600 }}>
                      {st.label}
                    </span>
                  </td>
                  <td style={{ padding: "12px 16px", color: "#6b7280", whiteSpace: "nowrap" }}>
                    {new Date(r.createdAt).toLocaleDateString("ar-SY")}
                  </td>
                  <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button
                        onClick={() => openDetail(r.id)}
                        style={{
                          padding: "6px 14px", borderRadius: 7, background: "#eff6ff",
                          color: "#1d4ed8", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                        }}
                      >
                        {detailLoading ? "..." : "تفاصيل"}
                      </button>
                      <button
                        onClick={() => handleDelete(r.id)}
                        style={{
                          padding: "6px 14px", borderRadius: 7, background: "#fff5f5",
                          color: "#dc2626", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 13,
                        }}
                      >
                        حذف
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* ── Pagination ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginTop: 24 }}>
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={pagerBtn(page === 1)}>السابق</button>
          <span style={{ padding: "8px 16px", fontSize: 14, color: "#555" }}>{page} / {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={pagerBtn(page === totalPages)}>التالي</button>
        </div>
      )}

      {/* ── Detail Modal ───────────────────────────────────────────────────── */}
      {selected && (
        <DetailModal
          request={selected}
          onClose={() => setSelected(null)}
          onStatusChange={handleStatusChange}
          onDelete={handleDelete}
          onNotesUpdate={handleNotesUpdate}
        />
      )}
    </div>
  );
}

// ─── Detail Modal ─────────────────────────────────────────────────────────────

function DetailModal({
  request,
  onClose,
  onStatusChange,
  onDelete,
  onNotesUpdate,
}: {
  request: SpecialRequest;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onNotesUpdate: (id: string, notes: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(request.notesInternal ?? "");
  const [savingNotes, setSavingNotes] = useState(false);
  const st = STATUS_STYLES[request.status] ?? STATUS_STYLES.New;

  async function saveNotes() {
    setSavingNotes(true);
    await onNotesUpdate(request.id, notes);
    setSavingNotes(false);
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "center", justifyContent: "center",
        zIndex: 9000, padding: 16,
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: "#fff", borderRadius: 16, width: "100%", maxWidth: 580,
          maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
        }}
      >
        {/* Header */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: "1px solid #f0f0f0",
        }}>
          <div>
            <p style={{ fontSize: 12, color: "#999", margin: 0 }}>{request.publicCode}</p>
            <h2 style={{ fontSize: 20, fontWeight: 800, margin: "4px 0 0", color: "#1a1a2e" }}>
              {request.fullName || "طلب خاص"}
            </h2>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "#666" }}>×</button>
        </div>

        <div style={{ padding: "24px" }}>

          {/* Message */}
          <Section title="نص الطلب">
            <p style={{
              background: "#f8fafc", borderRadius: 10, padding: "16px",
              lineHeight: 1.8, color: "#1a1a2e", fontSize: 15, margin: 0,
              border: "1px solid #e5e7eb",
            }}>
              {request.message}
            </p>
          </Section>

          {/* Contact Info */}
          <Section title="معلومات التواصل">
            <InfoRow label="الهاتف" value={<a href={`tel:${request.phone}`} style={{ color: "#1d4ed8" }}>{request.phone}</a>} />
            {request.whatsApp && (
              <InfoRow label="واتساب" value={
                <a href={`https://wa.me/${request.whatsApp.replace(/\D/g,"")}`} target="_blank" rel="noreferrer" style={{ color: "#16a34a" }}>
                  {request.whatsApp}
                </a>
              } />
            )}
            {request.email && <InfoRow label="البريد" value={request.email} />}
            {request.createdByUserName && <InfoRow label="المستخدم" value={request.createdByUserName} />}
          </Section>

          {/* Status */}
          <Section title="الحالة">
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              {["New", "Contacted", "Closed", "Archived"].map(s => {
                const info = STATUS_STYLES[s];
                const isActive = request.status === s;
                return (
                  <button
                    key={s}
                    onClick={() => onStatusChange(request.id, s)}
                    style={{
                      padding: "7px 16px", borderRadius: 20, fontSize: 13, fontWeight: 600,
                      border: isActive ? `2px solid ${info.color}` : "2px solid #e5e7eb",
                      background: isActive ? info.bg : "#fff",
                      color: isActive ? info.color : "#6b7280",
                      cursor: "pointer",
                    }}
                  >
                    {info.label}
                  </button>
                );
              })}
            </div>
          </Section>

          {/* Attachments */}
          {request.attachmentUrls && request.attachmentUrls.length > 0 && (
            <Section title={`المرفقات (${request.attachmentUrls.length})`}>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {request.attachmentUrls.map((url, i) => {
                  const isPdf = url.toLowerCase().endsWith(".pdf");
                  const name  = url.split("/").pop() ?? `ملف-${i + 1}`;
                  return (
                    <a
                      key={i}
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        display: "flex", alignItems: "center", gap: 10,
                        background: "#f0f4ff", borderRadius: 8, padding: "10px 14px",
                        border: "1px solid #dbeafe", textDecoration: "none", color: "#1d4ed8",
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{isPdf ? "📄" : "🖼️"}</span>
                      <span style={{ fontSize: 13, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {isPdf ? "عرض PDF" : "عرض الصورة"} — {name}
                      </span>
                      <span style={{ marginRight: "auto", fontSize: 12, color: "#6b7280" }}>↗</span>
                    </a>
                  );
                })}
              </div>
            </Section>
          )}

          {/* Notes */}
          <Section title="ملاحظات داخلية">
            <textarea
              rows={3}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="أضف ملاحظة داخلية للفريق..."
              style={{
                width: "100%", padding: "10px 14px", borderRadius: 8,
                border: "1.5px solid #e0e0e0", fontSize: 14, fontFamily: "inherit",
                resize: "vertical", boxSizing: "border-box",
              }}
            />
            <button
              onClick={saveNotes}
              disabled={savingNotes}
              style={{
                marginTop: 8, padding: "8px 20px", borderRadius: 8, background: "#1a1a2e",
                color: "#fff", border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
            >
              {savingNotes ? "جاري الحفظ..." : "حفظ الملاحظة"}
            </button>
          </Section>

          {/* Dates */}
          <div style={{ display: "flex", gap: 16, fontSize: 13, color: "#999", marginTop: 16 }}>
            <span>تاريخ الإرسال: {new Date(request.createdAt).toLocaleDateString("ar-SY")}</span>
            {request.closedAt && <span>تاريخ الإغلاق: {new Date(request.closedAt).toLocaleDateString("ar-SY")}</span>}
          </div>

          {/* Delete */}
          <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #f1f5f9" }}>
            <button
              onClick={() => onDelete(request.id)}
              style={{
                padding: "9px 20px", borderRadius: 8, background: "#fff5f5",
                color: "#dc2626", border: "1px solid #fecaca", cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
            >
              حذف الطلب
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tiny helpers ─────────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <h3 style={{ fontSize: 13, fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 10px" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 8, fontSize: 14 }}>
      <span style={{ color: "#999", minWidth: 80 }}>{label}:</span>
      <span style={{ color: "#1a1a2e", fontWeight: 500 }}>{value}</span>
    </div>
  );
}

function pagerBtn(disabled: boolean): React.CSSProperties {
  return {
    padding: "8px 18px", borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: disabled ? "default" : "pointer",
    background: disabled ? "#f1f5f9" : "#1a1a2e", color: disabled ? "#999" : "#fff", border: "none",
  };
}
