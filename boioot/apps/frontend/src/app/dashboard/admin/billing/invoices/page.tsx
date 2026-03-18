"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import {
  INVOICE_STATUS_LABELS,
  INVOICE_STATUS_BADGE,
} from "@/features/admin/constants";
import { normalizeError } from "@/lib/api";
import type { AdminInvoiceResponse } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  return `${amount.toLocaleString("ar-SY")} ${currency === "SYP" ? "ل.س" : currency}`;
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-SY", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function shortId(id: string) {
  return id.slice(0, 8).toUpperCase();
}

const BILLING_CYCLE_LABEL: Record<string, string> = {
  Monthly:  "شهري",
  Yearly:   "سنوي",
  OneTime:  "مرة واحدة",
};

const FILTER_TABS = [
  { key: "",        label: "الكل"      },
  { key: "Pending", label: "معلقة"     },
  { key: "Paid",    label: "مدفوعة"    },
  { key: "Failed",  label: "مرفوضة"   },
  { key: "Expired", label: "منتهية"   },
];

// ── Summary cards ─────────────────────────────────────────────────────────────

interface SummaryCardsProps {
  invoices: AdminInvoiceResponse[];
}

function SummaryCards({ invoices }: SummaryCardsProps) {
  const counts = {
    Pending: invoices.filter(i => i.status === "Pending").length,
    Paid:    invoices.filter(i => i.status === "Paid").length,
    Failed:  invoices.filter(i => i.status === "Failed").length,
    Expired: invoices.filter(i => i.status === "Expired").length,
  };

  const cards = [
    { label: "معلقة",   count: counts.Pending, color: "#f57f17", bg: "#fff8e1" },
    { label: "مدفوعة", count: counts.Paid,    color: "#2e7d32", bg: "#e8f5e9" },
    { label: "مرفوضة", count: counts.Failed,  color: "#c62828", bg: "#ffebee" },
    { label: "منتهية", count: counts.Expired, color: "#616161", bg: "#f5f5f5" },
  ];

  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "1rem", marginBottom: "1.75rem" }}>
      {cards.map(c => (
        <div key={c.label} style={{
          background: c.bg, borderRadius: 12,
          padding: "1.25rem 1.5rem",
          borderRight: `4px solid ${c.color}`,
          boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
        }}>
          <div style={{ fontSize: "2rem", fontWeight: 700, color: c.color, lineHeight: 1 }}>{c.count}</div>
          <div style={{ fontSize: "0.875rem", color: "#555", marginTop: "0.35rem" }}>{c.label}</div>
        </div>
      ))}
    </div>
  );
}

// ── Invoice Detail Modal ──────────────────────────────────────────────────────

interface InvoiceModalProps {
  invoice: AdminInvoiceResponse;
  onClose: () => void;
  onConfirmed: (updated: AdminInvoiceResponse) => void;
  onRejected:  (updated: AdminInvoiceResponse) => void;
}

function InvoiceModal({ invoice, onClose, onConfirmed, onRejected }: InvoiceModalProps) {
  const [note, setNote]           = useState("");
  const [actionLoading, setLoading] = useState<"confirm" | "reject" | null>(null);
  const [actionError, setError]   = useState("");

  const isPending = invoice.status === "Pending";

  async function handleConfirm() {
    setLoading("confirm");
    setError("");
    try {
      const updated = await adminApi.confirmInvoice(invoice.id, note.trim() || undefined);
      onConfirmed(updated);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(null);
    }
  }

  async function handleReject() {
    setLoading("reject");
    setError("");
    try {
      const updated = await adminApi.rejectInvoice(invoice.id, note.trim() || undefined);
      onRejected(updated);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(null);
    }
  }

  const statusBadge = INVOICE_STATUS_BADGE[invoice.status] ?? "badge badge-gray";
  const statusLabel = INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status;

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{
        position: "fixed", inset: 0, zIndex: 1200,
        backgroundColor: "rgba(0,0,0,0.5)",
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        padding: "2rem 1rem", overflowY: "auto",
      }}
    >
      <div style={{
        background: "var(--color-surface)",
        borderRadius: 14,
        width: "100%", maxWidth: 640,
        boxShadow: "0 12px 48px rgba(0,0,0,0.22)",
        overflow: "hidden",
      }}>
        {/* Header */}
        <div style={{
          padding: "1.25rem 1.5rem",
          borderBottom: "1px solid var(--color-border)",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          background: "var(--color-bg-secondary)",
        }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
              تفاصيل الفاتورة
            </h2>
            <span style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", fontFamily: "monospace" }}>
              #{shortId(invoice.id)}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <span className={statusBadge}>{statusLabel}</span>
            <button
              onClick={onClose}
              style={{
                background: "none", border: "none", cursor: "pointer",
                fontSize: "1.4rem", color: "var(--color-text-secondary)",
                lineHeight: 1, padding: "0.25rem",
              }}
            >×</button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: "1.5rem" }}>

          {/* User info */}
          <Section title="معلومات المستخدم">
            <Row label="الاسم"        value={invoice.userName  || "—"} />
            <Row label="البريد"       value={invoice.userEmail || "—"} />
            <Row label="معرّف المستخدم" value={shortId(invoice.userId)} mono />
          </Section>

          {/* Plan info */}
          <Section title="معلومات الباقة">
            <Row label="الباقة"   value={invoice.planName} />
            <Row label="دورة الفاتورة" value={BILLING_CYCLE_LABEL[invoice.billingCycle] ?? invoice.billingCycle} />
            <Row label="المبلغ"   value={formatAmount(invoice.amount, invoice.currency)} />
            <Row label="مزود الدفع" value={invoice.providerName} />
            {invoice.externalRef && <Row label="مرجع خارجي" value={invoice.externalRef} mono />}
          </Section>

          {/* Timing */}
          <Section title="التواريخ">
            <Row label="تاريخ الإنشاء"  value={formatDate(invoice.createdAt)} />
            <Row label="تاريخ الانتهاء" value={formatDate(invoice.expiresAt)} />
            {invoice.approvedAt && <Row label="تاريخ الموافقة" value={formatDate(invoice.approvedAt)} />}
            {invoice.rejectedAt && <Row label="تاريخ الرفض"   value={formatDate(invoice.rejectedAt)} />}
          </Section>

          {/* Admin note if any */}
          {invoice.adminNote && (
            <Section title="ملاحظة المدير">
              <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                {invoice.adminNote}
              </p>
            </Section>
          )}

          {/* Payment proof */}
          {invoice.proof ? (
            <Section title="إثبات الدفع">
              <div style={{ borderRadius: 10, overflow: "hidden", border: "1px solid var(--color-border)", marginBottom: "0.75rem" }}>
                <Image
                  src={invoice.proof.imageUrl}
                  alt="إثبات الدفع"
                  width={600}
                  height={400}
                  style={{ width: "100%", height: "auto", display: "block", objectFit: "contain" }}
                  unoptimized
                />
              </div>
              {invoice.proof.notes && (
                <p style={{ margin: "0.5rem 0 0", fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
                  {invoice.proof.notes}
                </p>
              )}
              <p style={{ margin: "0.35rem 0 0", fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                رُفع في: {formatDate(invoice.proof.createdAt)}
              </p>
            </Section>
          ) : (
            isPending && (
              <Section title="إثبات الدفع">
                <p style={{ margin: 0, color: "var(--color-text-muted)", fontSize: "0.875rem" }}>
                  لم يتم إرفاق إثبات دفع بعد.
                </p>
              </Section>
            )
          )}

          {/* Admin actions — only for Pending invoices */}
          {isPending && (
            <Section title="إجراء المدير">
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="ملاحظة اختيارية (سيُرفق مع الفاتورة)"
                rows={3}
                style={{
                  width: "100%", padding: "0.75rem",
                  border: "1px solid var(--color-border)",
                  borderRadius: 8, fontSize: "0.9rem",
                  fontFamily: "inherit", resize: "vertical",
                  background: "var(--color-bg-secondary)",
                  marginBottom: "1rem",
                }}
              />

              {actionError && (
                <p style={{ color: "var(--color-error)", fontSize: "0.875rem", marginBottom: "0.75rem" }}>
                  {actionError}
                </p>
              )}

              <div style={{ display: "flex", gap: "0.75rem" }}>
                <button
                  className="btn btn-primary"
                  onClick={handleConfirm}
                  disabled={!!actionLoading}
                  style={{ flex: 1 }}
                >
                  {actionLoading === "confirm" ? "جارٍ التأكيد..." : "✓ تأكيد الدفع"}
                </button>
                <button
                  className="btn btn-danger"
                  onClick={handleReject}
                  disabled={!!actionLoading}
                  style={{ flex: 1 }}
                >
                  {actionLoading === "reject" ? "جارٍ الرفض..." : "✕ رفض الدفع"}
                </button>
              </div>
            </Section>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Small layout helpers ───────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: "1.25rem" }}>
      <h3 style={{
        fontSize: "0.8rem", fontWeight: 700, textTransform: "uppercase",
        letterSpacing: "0.06em", color: "var(--color-text-muted)",
        marginBottom: "0.6rem",
      }}>
        {title}
      </h3>
      <div style={{
        background: "var(--color-bg-secondary)",
        borderRadius: 10, padding: "0.75rem 1rem",
        border: "1px solid var(--color-border)",
      }}>
        {children}
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "flex-start",
      padding: "0.35rem 0",
      borderBottom: "1px solid var(--color-border)",
    }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.875rem", minWidth: 120 }}>{label}</span>
      <span style={{
        fontWeight: 600, fontSize: "0.875rem", textAlign: "start",
        fontFamily: mono ? "monospace" : "inherit",
        wordBreak: "break-all",
      }}>{value}</span>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminBillingInvoicesPage() {
  const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [invoices, setInvoices] = useState<AdminInvoiceResponse[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [activeFilter, setActiveFilter] = useState("");
  const [selectedInvoice, setSelectedInvoice] = useState<AdminInvoiceResponse | null>(null);

  const load = useCallback(async (status: string) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getInvoices(status || undefined);
      setInvoices(result);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load("");
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleFilterChange(key: string) {
    setActiveFilter(key);
    load(key);
  }

  function handleUpdatedInvoice(updated: AdminInvoiceResponse) {
    setInvoices(prev => prev.map(i => i.id === updated.id ? updated : i));
    setSelectedInvoice(updated);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 1100, margin: "0 auto" }}>

        {/* ── Header ── */}
        <DashboardBackLink href="/dashboard/admin" label="← لوحة الإدارة" />
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 800 }}>إدارة الفواتير</h1>
            <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
              مراجعة طلبات الدفع اليدوي وتأكيد أو رفض الفواتير
            </p>
          </div>
          <button
            className="btn btn-outline"
            onClick={() => load(activeFilter)}
            disabled={fetching}
            style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
          >
            ↻ تحديث
          </button>
        </div>

        {/* ── Summary cards (computed from all-invoices load) ── */}
        {!fetching && !fetchError && <SummaryCards invoices={invoices} />}

        {/* ── Filter tabs ── */}
        <div style={{
          display: "flex", gap: "0.5rem", flexWrap: "wrap",
          marginBottom: "1.25rem",
        }}>
          {FILTER_TABS.map(tab => (
            <button
              key={tab.key}
              onClick={() => handleFilterChange(tab.key)}
              style={{
                padding: "0.45rem 1.1rem",
                borderRadius: 24,
                border: "1.5px solid",
                borderColor: activeFilter === tab.key ? "var(--color-primary)" : "var(--color-border)",
                background: activeFilter === tab.key ? "var(--color-primary-subtle)" : "var(--color-surface)",
                color: activeFilter === tab.key ? "var(--color-primary-dark)" : "var(--color-text-secondary)",
                fontWeight: activeFilter === tab.key ? 700 : 400,
                fontSize: "0.875rem",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <InlineBanner message={fetchError} />

        {/* ── Table ── */}
        {fetching ? (
          <LoadingRow message="جارٍ تحميل الفواتير..." />
        ) : invoices.length === 0 ? (
          <div style={{ textAlign: "center", padding: "4rem 0", color: "var(--color-text-muted)" }}>
            لا توجد فواتير
          </div>
        ) : (
          <div style={{
            background: "var(--color-surface)",
            borderRadius: 12,
            border: "1px solid var(--color-border)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
            overflow: "hidden",
          }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "var(--color-bg-secondary)", borderBottom: "2px solid var(--color-border)" }}>
                    {["#", "المستخدم", "الباقة", "دورة الفاتورة", "المبلغ", "الحالة", "تاريخ الإنشاء", "تاريخ الانتهاء", ""].map(h => (
                      <th key={h} style={{
                        padding: "0.875rem 1rem", textAlign: "right",
                        fontWeight: 700, color: "var(--color-text-secondary)",
                        whiteSpace: "nowrap",
                      }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, idx) => {
                    const statusBadge = INVOICE_STATUS_BADGE[inv.status] ?? "badge badge-gray";
                    const statusLabel = INVOICE_STATUS_LABELS[inv.status] ?? inv.status;
                    const isEven = idx % 2 === 0;

                    return (
                      <tr
                        key={inv.id}
                        style={{
                          background: isEven ? "var(--color-surface)" : "var(--color-bg-secondary)",
                          borderBottom: "1px solid var(--color-border)",
                          transition: "background 0.12s",
                          cursor: "pointer",
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = "var(--color-primary-subtle)")}
                        onMouseLeave={e => (e.currentTarget.style.background = isEven ? "var(--color-surface)" : "var(--color-bg-secondary)")}
                        onClick={() => setSelectedInvoice(inv)}
                      >
                        <td style={{ padding: "0.8rem 1rem", fontFamily: "monospace", color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
                          {shortId(inv.id)}
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <div style={{ fontWeight: 600 }}>{inv.userName || "—"}</div>
                          <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)" }}>{inv.userEmail}</div>
                        </td>
                        <td style={{ padding: "0.8rem 1rem", fontWeight: 500 }}>{inv.planName}</td>
                        <td style={{ padding: "0.8rem 1rem", color: "var(--color-text-secondary)" }}>
                          {BILLING_CYCLE_LABEL[inv.billingCycle] ?? inv.billingCycle}
                        </td>
                        <td style={{ padding: "0.8rem 1rem", fontWeight: 700, whiteSpace: "nowrap" }}>
                          {formatAmount(inv.amount, inv.currency)}
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <span className={statusBadge}>{statusLabel}</span>
                          {inv.proof && <span title="يوجد إثبات دفع" style={{ marginRight: "0.4rem", fontSize: "0.85rem" }}>📎</span>}
                        </td>
                        <td style={{ padding: "0.8rem 1rem", color: "var(--color-text-secondary)", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                          {formatDate(inv.createdAt)}
                        </td>
                        <td style={{ padding: "0.8rem 1rem", color: inv.isExpired ? "var(--color-error)" : "var(--color-text-secondary)", whiteSpace: "nowrap", fontSize: "0.82rem" }}>
                          {formatDate(inv.expiresAt)}
                        </td>
                        <td style={{ padding: "0.8rem 1rem" }}>
                          <button
                            className="btn btn-sm btn-outline"
                            onClick={e => { e.stopPropagation(); setSelectedInvoice(inv); }}
                          >
                            عرض
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Footer count */}
            <div style={{
              padding: "0.75rem 1rem",
              borderTop: "1px solid var(--color-border)",
              color: "var(--color-text-muted)",
              fontSize: "0.82rem",
              background: "var(--color-bg-secondary)",
            }}>
              إجمالي النتائج: <strong>{invoices.length}</strong>
            </div>
          </div>
        )}
      </div>

      {/* ── Invoice detail modal ── */}
      {selectedInvoice && (
        <InvoiceModal
          invoice={selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          onConfirmed={handleUpdatedInvoice}
          onRejected={handleUpdatedInvoice}
        />
      )}
    </div>
  );
}
