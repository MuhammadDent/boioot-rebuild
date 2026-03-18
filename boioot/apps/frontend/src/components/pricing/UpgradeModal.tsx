"use client";

import { useState } from "react";
import { billingApi } from "@/features/billing/api";
import type { InvoiceResponse } from "@/features/billing/types";
import type { UpgradeIntentResponse } from "@/features/subscription/types";

interface UpgradeModalProps {
  intent:    UpgradeIntentResponse;
  pricingId: string;
  onClose:   () => void;
}

const REASON_ICONS: Record<string, string> = {
  upgrade:            "⬆️",
  downgrade:          "⬇️",
  cycle_change:       "🔄",
  new_subscription:   "🎉",
  already_subscribed: "✓",
  no_account:         "⚠️",
};

const REASON_COLORS: Record<string, string> = {
  upgrade:            "var(--color-primary)",
  downgrade:          "#e65100",
  cycle_change:       "#1565c0",
  new_subscription:   "var(--color-primary)",
  already_subscribed: "var(--color-text-muted)",
  no_account:         "#c62828",
};

// ── Invoice created screen ───────────────────────────────────────────────────

function InvoiceRow({
  label, value, bold, color,
}: {
  label: string; value: string; bold?: boolean; color?: string;
}) {
  return (
    <div style={{
      display:        "flex",
      justifyContent: "space-between",
      padding:        "0.35rem 0",
      borderBottom:   "1px solid var(--color-border)",
    }}>
      <span style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>{label}</span>
      <span style={{
        fontWeight: bold ? 700 : 400,
        color:      color ?? "var(--color-text-primary)",
        fontSize:   "0.88rem",
      }}>
        {value}
      </span>
    </div>
  );
}

function InvoiceCreatedView({
  invoice, onClose,
}: {
  invoice: InvoiceResponse;
  onClose: () => void;
}) {
  const shortId = invoice.id.slice(0, 8).toUpperCase();

  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
        <div style={{ fontSize: "2.5rem", marginBottom: "0.5rem" }}>🧾</div>
        <h3 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 800, color: "var(--color-primary)" }}>
          تم إنشاء الفاتورة بنجاح
        </h3>
        <p style={{ margin: "0.4rem 0 0", fontSize: "0.85rem", color: "var(--color-text-muted)" }}>
          رقم الفاتورة: <strong style={{ fontFamily: "monospace" }}>#{shortId}</strong>
        </p>
      </div>

      <div style={{
        background:   "var(--color-bg-secondary)",
        borderRadius: "var(--radius-md)",
        padding:      "1rem",
        marginBottom: "1.25rem",
      }}>
        <InvoiceRow label="الباقة" value={`${invoice.planName} — ${invoice.billingCycle === "Yearly" ? "سنوي" : "شهري"}`} />
        <InvoiceRow label="المبلغ" value={`${invoice.amount.toLocaleString("ar-SY")} ${invoice.currency}`} bold />
        <InvoiceRow label="الحالة" value="بانتظار الدفع" color="#e65100" />
      </div>

      <div style={{
        border:       "1px solid var(--color-border)",
        borderRadius: "var(--radius-md)",
        padding:      "1rem",
        marginBottom: "1.25rem",
        fontSize:     "0.88rem",
        color:        "var(--color-text-secondary)",
        lineHeight:   1.7,
      }}>
        <p style={{ margin: "0 0 0.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          تعليمات الدفع بالتحويل البنكي
        </p>
        <ol style={{ margin: 0, paddingRight: "1.2rem" }}>
          <li>حوّل المبلغ إلى الحساب البنكي الموضح أدناه.</li>
          <li>احتفظ بإيصال التحويل.</li>
          <li>ارفع صورة الإيصال من لوحة التحكم تحت "فواتيري".</li>
          <li>سيقوم الفريق بتفعيل اشتراكك خلال 24 ساعة من التحقق.</li>
        </ol>
        <div style={{
          marginTop:    "0.75rem",
          background:   "var(--color-surface)",
          borderRadius: "6px",
          padding:      "0.6rem 0.8rem",
          fontFamily:   "monospace",
          fontSize:     "0.85rem",
          color:        "var(--color-text-primary)",
        }}>
          <div>البنك: بنك سوريا والمهجر</div>
          <div>رقم الحساب: 0123-456-7890</div>
          <div>اسم الحساب: Boioot Real Estate</div>
        </div>
      </div>

      <button
        onClick={onClose}
        style={{
          width:        "100%",
          padding:      "0.75rem",
          borderRadius: "var(--radius-md)",
          border:       "none",
          background:   "var(--color-primary)",
          color:        "#fff",
          fontFamily:   "inherit",
          fontSize:     "0.95rem",
          fontWeight:   700,
          cursor:       "pointer",
        }}
      >
        حسناً، سأرفع الإيصال لاحقاً
      </button>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

export default function UpgradeModal({ intent, pricingId, onClose }: UpgradeModalProps) {
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [invoice, setInvoice] = useState<InvoiceResponse | null>(null);

  const icon  = REASON_ICONS[intent.reason]  ?? "📋";
  const color = REASON_COLORS[intent.reason] ?? "var(--color-primary)";
  const isFree = intent.priceAmount === 0;

  const handleConfirm = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await billingApi.checkout(pricingId);
      setInvoice(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         1000,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "rgba(0,0,0,0.45)",
        backdropFilter: "blur(3px)",
        padding:        "1rem",
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !loading) onClose(); }}
    >
      <div style={{
        background:   "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding:      "2rem",
        maxWidth:     "460px",
        width:        "100%",
        boxShadow:    "0 24px 64px rgba(0,0,0,0.22)",
        direction:    "rtl",
        animation:    "fadeInUp 0.2s ease",
      }}>

        {invoice ? (
          <InvoiceCreatedView invoice={invoice} onClose={onClose} />
        ) : (
          <>
            <div style={{ fontSize: "2.5rem", textAlign: "center", marginBottom: "1rem" }}>
              {icon}
            </div>

            <div style={{ textAlign: "center", marginBottom: "1.5rem" }}>
              <div style={{
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                gap:            "0.75rem",
                fontSize:       "1rem",
                fontWeight:     700,
                color:          "var(--color-text-primary)",
                marginBottom:   "0.5rem",
              }}>
                <span style={{ background: `${color}18`, color, padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
                  {intent.currentPlanName}
                </span>
                <span style={{ color: "var(--color-text-muted)", fontSize: "1.1rem" }}>→</span>
                <span style={{ background: `${color}18`, color, padding: "0.2rem 0.6rem", borderRadius: "6px" }}>
                  {intent.targetPlanName}
                </span>
              </div>

              <p style={{
                fontSize:   "0.92rem",
                color:      "var(--color-text-secondary)",
                margin:     "0.75rem 0",
                lineHeight: 1.6,
              }}>
                {intent.message}
              </p>

              {intent.allowed && !isFree && (
                <div style={{
                  background:     "var(--color-bg-secondary)",
                  borderRadius:   "var(--radius-md)",
                  padding:        "0.75rem 1rem",
                  marginTop:      "1rem",
                  display:        "flex",
                  alignItems:     "center",
                  justifyContent: "space-between",
                  fontSize:       "0.9rem",
                }}>
                  <span style={{ color: "var(--color-text-secondary)" }}>السعر المستحق</span>
                  <span style={{ fontWeight: 800, color, fontSize: "1.05rem" }}>
                    {intent.priceAmount.toLocaleString("ar-SY")} {intent.currencyCode}
                    <span style={{
                      fontWeight: 400, fontSize: "0.8rem",
                      color: "var(--color-text-muted)", marginRight: "0.3rem",
                    }}>
                      / {intent.billingCycle === "Yearly" ? "سنوياً" : "شهرياً"}
                    </span>
                  </span>
                </div>
              )}
            </div>

            {error && (
              <p style={{
                textAlign:    "center",
                color:        "#c62828",
                fontSize:     "0.88rem",
                marginBottom: "0.75rem",
                background:   "#ffebee",
                padding:      "0.5rem 0.75rem",
                borderRadius: "var(--radius-sm)",
              }}>
                {error}
              </p>
            )}

            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                onClick={onClose}
                disabled={loading}
                style={{
                  flex:         1,
                  padding:      "0.7rem",
                  borderRadius: "var(--radius-md)",
                  border:       "1px solid var(--color-border)",
                  background:   "transparent",
                  cursor:       loading ? "not-allowed" : "pointer",
                  fontFamily:   "inherit",
                  fontSize:     "0.92rem",
                  color:        "var(--color-text-secondary)",
                  opacity:      loading ? 0.5 : 1,
                }}
              >
                إلغاء
              </button>

              {intent.allowed ? (
                <button
                  onClick={handleConfirm}
                  disabled={loading}
                  style={{
                    flex:         2,
                    padding:      "0.7rem",
                    borderRadius: "var(--radius-md)",
                    border:       "none",
                    background:   color,
                    color:        "#fff",
                    cursor:       loading ? "not-allowed" : "pointer",
                    fontFamily:   "inherit",
                    fontSize:     "0.92rem",
                    fontWeight:   700,
                    opacity:      loading ? 0.75 : 1,
                  }}
                >
                  {loading ? "جارٍ الإنشاء..." : "تأكيد وإنشاء فاتورة 🧾"}
                </button>
              ) : (
                <button
                  onClick={onClose}
                  style={{
                    flex:         2,
                    padding:      "0.7rem",
                    borderRadius: "var(--radius-md)",
                    border:       "none",
                    background:   "var(--color-bg-secondary)",
                    color:        "var(--color-text-muted)",
                    cursor:       "pointer",
                    fontFamily:   "inherit",
                    fontSize:     "0.92rem",
                    fontWeight:   600,
                  }}
                >
                  حسناً
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
