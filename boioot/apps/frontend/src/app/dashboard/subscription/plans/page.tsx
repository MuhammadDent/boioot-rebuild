"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { pricingApi } from "@/features/pricing/api";
import { paymentRequestsApi } from "@/features/subscriptionPayments/api";
import { subscriptionApi } from "@/features/subscription/api";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_DESC,
  PAYMENT_METHOD_ICON,
  AVAILABLE_METHODS,
  CYCLE_LABELS,
} from "@/features/subscriptionPayments/constants";
import {
  formatLimitValue,
  BILLING_CYCLE_LABELS,
} from "@/features/pricing/labels";
import { normalizeError } from "@/lib/api";
import type { PublicPricingItem, PublicPricingEntry } from "@/features/pricing/types";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  if (amount === 0) return "مجاني";
  return `${amount.toLocaleString("ar-SY")} ${currency}`;
}

const LIMIT_KEYS = ["max_active_listings", "max_agents", "max_projects"];
const LIMIT_ICONS: Record<string, string> = {
  max_active_listings: "📋",
  max_agents:          "👥",
  max_projects:        "🏗️",
};
const LIMIT_LABELS: Record<string, string> = {
  max_active_listings: "إعلان نشط",
  max_agents:          "وكيل",
  max_projects:        "مشروع",
};

// ── PlanCard ─────────────────────────────────────────────────────────────────

function PlanCard({
  plan,
  cycle,
  currentPlanId,
  onChoose,
  onActivateFree,
  freeActivatingId,
}: {
  plan: PublicPricingItem;
  cycle: "Monthly" | "Yearly";
  currentPlanId: string | null;
  onChoose: (plan: PublicPricingItem, pricing: PublicPricingEntry) => void;
  onActivateFree: (planId: string) => void;
  freeActivatingId: string | null;
}) {
  const pricing = plan.pricing.find(p => p.billingCycle === cycle)
    ?? plan.pricing[0];

  const isFree = pricing ? pricing.priceAmount === 0 : plan.pricing.every(p => p.priceAmount === 0);
  const isCurrent = plan.planId === currentPlanId;
  const isRecommended = plan.isRecommended;
  const isActivatingFree = freeActivatingId === plan.planId;

  const keyLimits = plan.limits.filter(l => LIMIT_KEYS.includes(l.key));

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 16,
      padding: "1.5rem",
      boxShadow: isRecommended
        ? "0 4px 24px rgba(5,150,105,0.18)"
        : "0 1px 4px rgba(0,0,0,0.06)",
      border: isRecommended
        ? "2px solid #059669"
        : isCurrent
          ? "2px solid #2563eb"
          : "1.5px solid #e2e8f0",
      display: "flex",
      flexDirection: "column",
      gap: "0.85rem",
      position: "relative",
    }}>

      {/* Recommended badge */}
      {isRecommended && (
        <div style={{
          position: "absolute",
          top: -12,
          right: "50%",
          transform: "translateX(50%)",
          backgroundColor: "#059669",
          color: "#fff",
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "0.2rem 0.85rem",
          borderRadius: 20,
          whiteSpace: "nowrap",
        }}>
          ⭐ الأكثر شعبية
        </div>
      )}

      {isCurrent && !isRecommended && (
        <div style={{
          position: "absolute",
          top: -12,
          right: "50%",
          transform: "translateX(50%)",
          backgroundColor: "#2563eb",
          color: "#fff",
          fontSize: "0.72rem",
          fontWeight: 700,
          padding: "0.2rem 0.85rem",
          borderRadius: 20,
          whiteSpace: "nowrap",
        }}>
          ✓ باقتك الحالية
        </div>
      )}

      {/* Plan name + category */}
      <div>
        <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 500 }}>
          {plan.planCategory ?? plan.applicableAccountType ?? ""}
        </p>
        <h3 style={{ margin: "0.2rem 0 0", fontSize: "1.15rem", fontWeight: 800, color: "#1a2e1a" }}>
          {plan.planName}
        </h3>
        {plan.description && (
          <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#64748b", lineHeight: 1.5 }}>
            {plan.description}
          </p>
        )}
      </div>

      {/* Price */}
      {pricing && (
        <div style={{ borderBottom: "1px solid #f1f5f9", paddingBottom: "0.85rem" }}>
          <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 900, color: "#059669", lineHeight: 1 }}>
            {formatAmount(pricing.priceAmount, pricing.currencyCode)}
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
            / {BILLING_CYCLE_LABELS[cycle] ?? cycle}
          </p>
        </div>
      )}

      {/* Key limits */}
      {keyLimits.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
          {keyLimits.map(l => (
            <div
              key={l.key}
              style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.82rem" }}
            >
              <span>{LIMIT_ICONS[l.key] ?? "•"}</span>
              <span style={{ color: "#374151", fontWeight: 600 }}>
                {formatLimitValue(l.value, null)}
              </span>
              <span style={{ color: "#64748b" }}>
                {LIMIT_LABELS[l.key] ?? l.name}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <button
        onClick={() => {
          if (isCurrent || isActivatingFree) return;
          if (isFree) {
            onActivateFree(plan.planId);
          } else if (pricing) {
            onChoose(plan, pricing);
          }
        }}
        disabled={isCurrent || isActivatingFree}
        type="button"
        style={{
          marginTop: "auto",
          width: "100%",
          padding: "0.7rem",
          borderRadius: 10,
          border: "none",
          backgroundColor: isCurrent || isActivatingFree
            ? "#e2e8f0"
            : isRecommended
              ? "#059669"
              : "#1a2e1a",
          color: isCurrent || isActivatingFree ? "#94a3b8" : "#fff",
          fontSize: "0.9rem",
          fontWeight: 700,
          cursor: isCurrent || isActivatingFree ? "default" : "pointer",
        }}
      >
        {isCurrent
          ? "باقتك الحالية"
          : isActivatingFree
            ? "جارٍ التفعيل..."
            : isFree
              ? "تفعيل مجاني"
              : "اختر الباقة"}
      </button>
    </div>
  );
}

// ── CheckoutModal ─────────────────────────────────────────────────────────────

function CheckoutModal({
  plan,
  initialPricing,
  onClose,
  onSuccess,
}: {
  plan: PublicPricingItem;
  initialPricing: PublicPricingEntry;
  onClose: () => void;
  onSuccess: (id: string, method: string) => void;
}) {
  const [selectedPricing, setSelectedPricing] = useState<PublicPricingEntry>(initialPricing);
  const [paymentMethod, setPaymentMethod]     = useState(AVAILABLE_METHODS[0]);
  const [customerNote, setCustomerNote]       = useState("");
  const [salesRep, setSalesRep]               = useState("");
  const [submitting, setSubmitting]           = useState(false);
  const [error, setError]                     = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const result = await paymentRequestsApi.create({
        planId:       plan.planId,
        pricingId:    selectedPricing.pricingId,
        billingCycle: selectedPricing.billingCycle,
        paymentMethod,
        customerNote: customerNote.trim() || undefined,
        salesRepresentativeName:
          paymentMethod === "cash_to_sales_rep" && salesRep.trim()
            ? salesRep.trim()
            : undefined,
      });
      onSuccess(result.id, paymentMethod);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 18,
        width: "100%",
        maxWidth: 520,
        maxHeight: "90vh",
        overflowY: "auto",
        padding: "1.75rem",
      }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 800, color: "#1a2e1a" }}>
            إتمام الاشتراك
          </h2>
          <button
            onClick={onClose}
            type="button"
            style={{ background: "none", border: "none", cursor: "pointer", color: "#94a3b8", fontSize: "1.3rem", lineHeight: 1 }}
          >
            ✕
          </button>
        </div>

        {/* Plan summary */}
        <div style={{
          backgroundColor: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: 12,
          padding: "1rem",
          marginBottom: "1.25rem",
        }}>
          <p style={{ margin: 0, fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>
            الباقة المختارة
          </p>
          <p style={{ margin: "0.25rem 0 0", fontSize: "1.05rem", fontWeight: 800, color: "#1a2e1a" }}>
            {plan.planName}
          </p>
          <p style={{ margin: "0.4rem 0 0", fontSize: "1.2rem", fontWeight: 900, color: "#059669" }}>
            {formatAmount(selectedPricing.priceAmount, selectedPricing.currencyCode)}
            <span style={{ fontSize: "0.78rem", fontWeight: 500, color: "#64748b", marginRight: "0.35rem" }}>
              / {BILLING_CYCLE_LABELS[selectedPricing.billingCycle] ?? selectedPricing.billingCycle}
            </span>
          </p>
        </div>

        {/* Billing cycle selector (if multiple options) */}
        {plan.pricing.length > 1 && (
          <div style={{ marginBottom: "1.25rem" }}>
            <p style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
              دورة الفوترة
            </p>
            <div style={{ display: "flex", gap: "0.6rem" }}>
              {plan.pricing.map(p => (
                <button
                  key={p.pricingId}
                  onClick={() => setSelectedPricing(p)}
                  type="button"
                  style={{
                    flex: 1,
                    padding: "0.65rem",
                    borderRadius: 10,
                    border: selectedPricing.pricingId === p.pricingId
                      ? "2px solid #059669"
                      : "1.5px solid #e2e8f0",
                    backgroundColor: selectedPricing.pricingId === p.pricingId ? "#f0fdf4" : "#f8fafc",
                    cursor: "pointer",
                    textAlign: "center",
                  }}
                >
                  <p style={{ margin: 0, fontSize: "0.8rem", fontWeight: 700, color: "#1e293b" }}>
                    {BILLING_CYCLE_LABELS[p.billingCycle] ?? p.billingCycle}
                  </p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.82rem", fontWeight: 800, color: "#059669" }}>
                    {formatAmount(p.priceAmount, p.currencyCode)}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Payment method */}
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.6rem", fontSize: "0.85rem", fontWeight: 700, color: "#374151" }}>
            طريقة الدفع
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {AVAILABLE_METHODS.map(method => (
              <label
                key={method}
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: "0.75rem",
                  padding: "0.85rem",
                  borderRadius: 10,
                  border: paymentMethod === method ? "2px solid #1a2e1a" : "1.5px solid #e2e8f0",
                  backgroundColor: paymentMethod === method ? "#f8fafc" : "#fff",
                  cursor: "pointer",
                }}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={method}
                  checked={paymentMethod === method}
                  onChange={() => setPaymentMethod(method)}
                  style={{ marginTop: 3, flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
                    {PAYMENT_METHOD_ICON[method]} {PAYMENT_METHOD_LABELS[method]}
                  </p>
                  <p style={{ margin: "0.2rem 0 0", fontSize: "0.76rem", color: "#64748b" }}>
                    {PAYMENT_METHOD_DESC[method]}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Sales rep name — only for cash_to_sales_rep */}
        {paymentMethod === "cash_to_sales_rep" && (
          <div style={{ marginBottom: "1.25rem" }}>
            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>
              اسم مندوب المبيعات (اختياري)
            </label>
            <input
              type="text"
              value={salesRep}
              onChange={e => setSalesRep(e.target.value)}
              placeholder="أدخل اسم المندوب الذي دفعت له"
              style={{
                width: "100%",
                padding: "0.65rem 0.85rem",
                borderRadius: 9,
                border: "1.5px solid #e2e8f0",
                fontSize: "0.88rem",
                boxSizing: "border-box",
              }}
            />
          </div>
        )}

        {/* Customer note */}
        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>
            ملاحظة (اختياري)
          </label>
          <textarea
            value={customerNote}
            onChange={e => setCustomerNote(e.target.value)}
            placeholder="أي معلومات إضافية تريد إرفاقها بالطلب..."
            rows={2}
            style={{
              width: "100%",
              padding: "0.65rem 0.85rem",
              borderRadius: 9,
              border: "1.5px solid #e2e8f0",
              fontSize: "0.88rem",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {/* Trust note */}
        <div style={{
          backgroundColor: "#fafafa",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "0.85rem",
          marginBottom: "1.25rem",
          fontSize: "0.78rem",
          color: "#64748b",
          lineHeight: 1.6,
        }}>
          🔒 بعد إرسال الطلب، سيقوم فريق المبيعات بمراجعة الدفع وتفعيل الباقة.
          يمكنك متابعة حالة طلبك من <strong>صفحة طلبات الاشتراك</strong>.
        </div>

        {/* Error */}
        {error && (
          <div style={{
            backgroundColor: "#fee2e2",
            border: "1px solid #fca5a5",
            borderRadius: 9,
            padding: "0.75rem",
            marginBottom: "1rem",
            fontSize: "0.85rem",
            color: "#b91c1c",
          }}>
            {error}
          </div>
        )}

        {/* Actions */}
        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={onClose}
            type="button"
            disabled={submitting}
            style={{
              flex: 1,
              padding: "0.75rem",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              backgroundColor: "#f8fafc",
              color: "#475569",
              fontSize: "0.9rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSubmit}
            type="button"
            disabled={submitting}
            style={{
              flex: 2,
              padding: "0.75rem",
              borderRadius: 10,
              border: "none",
              backgroundColor: submitting ? "#94a3b8" : "#059669",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: submitting ? "default" : "pointer",
            }}
          >
            {submitting ? "جارٍ الإرسال..." : "إرسال طلب الاشتراك"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── SuccessModal ──────────────────────────────────────────────────────────────

function SuccessModal({
  paymentMethod,
  onViewRequests,
  onClose,
}: {
  paymentMethod: string;
  onViewRequests: () => void;
  onClose: () => void;
}) {
  const needsReceipt = ["bank_transfer", "receipt_upload"].includes(paymentMethod);

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 18,
        width: "100%",
        maxWidth: 440,
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>✅</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", fontWeight: 800, color: "#1a2e1a" }}>
          تم إرسال طلبك بنجاح!
        </h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.88rem", color: "#475569", lineHeight: 1.7 }}>
          {needsReceipt
            ? "يمكنك رفع إيصال الدفع من صفحة طلباتي لتسريع عملية المراجعة."
            : paymentMethod === "cash_to_sales_rep"
              ? "سيتواصل معك مندوب المبيعات للتأكيد. يمكنك متابعة الحالة من صفحة طلباتي."
              : "سيراجع فريقنا طلبك ويتواصل معك قريباً. يمكنك متابعة الحالة من صفحة طلباتي."}
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <button
            onClick={onViewRequests}
            type="button"
            style={{
              width: "100%",
              padding: "0.8rem",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#1a2e1a",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            متابعة حالة الطلب
          </button>
          <button
            onClick={onClose}
            type="button"
            style={{
              width: "100%",
              padding: "0.7rem",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              backgroundColor: "transparent",
              color: "#64748b",
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            العودة للباقات
          </button>
        </div>
      </div>
    </div>
  );
}

// ── FreeSuccessModal ──────────────────────────────────────────────────────────

function FreeSuccessModal({
  planName,
  onGoToDashboard,
  onClose,
}: {
  planName: string;
  onGoToDashboard: () => void;
  onClose: () => void;
}) {
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      backgroundColor: "rgba(0,0,0,0.45)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "1rem",
    }}>
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 18,
        width: "100%",
        maxWidth: 420,
        padding: "2rem",
        textAlign: "center",
      }}>
        <div style={{ fontSize: "3rem", marginBottom: "0.75rem" }}>🎉</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.2rem", fontWeight: 800, color: "#1a2e1a" }}>
          تم تفعيل الباقة المجانية!
        </h2>
        <p style={{ margin: "0 0 0.35rem", fontSize: "1rem", fontWeight: 700, color: "#059669" }}>
          {planName}
        </p>
        <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem", color: "#475569", lineHeight: 1.7 }}>
          تم تفعيل اشتراكك المجاني فوراً. يمكنك الآن الاستفادة من جميع مزايا الباقة.
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
          <button
            onClick={onGoToDashboard}
            type="button"
            style={{
              width: "100%",
              padding: "0.8rem",
              borderRadius: 10,
              border: "none",
              backgroundColor: "#059669",
              color: "#fff",
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            الانتقال للوحة التحكم
          </button>
          <button
            onClick={onClose}
            type="button"
            style={{
              width: "100%",
              padding: "0.7rem",
              borderRadius: 10,
              border: "1.5px solid #e2e8f0",
              backgroundColor: "transparent",
              color: "#64748b",
              fontSize: "0.88rem",
              cursor: "pointer",
            }}
          >
            العودة للباقات
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function PlansPage() {
  const { user, isLoading } = useProtectedRoute();
  const router = useRouter();

  const [plans, setPlans]             = useState<PublicPricingItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError]   = useState<string | null>(null);
  const [cycle, setCycle]             = useState<"Monthly" | "Yearly">("Monthly");
  const [currentSub, setCurrentSub]   = useState<CurrentSubscriptionResponse | null>(null);

  const [checkoutPlan, setCheckoutPlan]       = useState<PublicPricingItem | null>(null);
  const [checkoutPricing, setCheckoutPricing] = useState<PublicPricingEntry | null>(null);
  const [successMethod, setSuccessMethod]     = useState<string | null>(null);

  const [freeActivatingId, setFreeActivatingId]   = useState<string | null>(null);
  const [freeSuccessPlan, setFreeSuccessPlan]     = useState<string | null>(null);

  const loadPlans = useCallback(async () => {
    setPlansLoading(true);
    setPlansError(null);
    try {
      const data = await pricingApi.getPublicPricing();
      setPlans(data);
    } catch {
      setPlansError("تعذّر تحميل الباقات. يرجى المحاولة لاحقاً.");
    } finally {
      setPlansLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPlans();
  }, [loadPlans]);

  useEffect(() => {
    if (!user) return;
    subscriptionApi.getCurrent()
      .then(sub => setCurrentSub(sub))
      .catch(() => setCurrentSub(null));
  }, [user]);

  async function handleActivateFree(planId: string) {
    setFreeActivatingId(planId);
    try {
      const result = await paymentRequestsApi.activateFree(planId);
      setFreeSuccessPlan(result.planName);
      // Refresh current subscription banner
      subscriptionApi.getCurrent()
        .then(sub => setCurrentSub(sub))
        .catch(() => {});
    } catch (err) {
      alert(normalizeError(err));
    } finally {
      setFreeActivatingId(null);
    }
  }

  if (isLoading || !user) return null;

  // Group plans by account type / category
  const grouped = plans.reduce<Record<string, PublicPricingItem[]>>((acc, p) => {
    const key = p.applicableAccountType ?? p.planCategory ?? "عام";
    if (!acc[key]) acc[key] = [];
    acc[key].push(p);
    return acc;
  }, {});

  const groups = Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b));

  const hasBothCycles = plans.some(p =>
    p.pricing.some(pr => pr.billingCycle === "Yearly")
  );

  return (
    <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 0 3rem" }}>

      {/* Page header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.65rem", fontWeight: 800, color: "#1a2e1a" }}>
          باقات الاشتراك
        </h1>
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.875rem", color: "#64748b" }}>
          اختر الباقة المناسبة لنشاطك العقاري وابدأ الاشتراك الآن
        </p>
      </div>

      {/* Current subscription banner */}
      {currentSub && (
        <div style={{
          backgroundColor: "#f0fdf4",
          border: "1.5px solid #bbf7d0",
          borderRadius: 12,
          padding: "1rem 1.25rem",
          marginBottom: "1.5rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#166534", fontWeight: 600 }}>اشتراكك الحالي</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "1rem", fontWeight: 800, color: "#1a2e1a" }}>
              {currentSub.planName}
            </p>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
              {currentSub.status === "Active" ? "✓ نشط" : currentSub.status}
              {" · "}
              {currentSub.billingCycle === "Monthly" ? "شهري" : "سنوي"}
            </p>
          </div>
          <button
            onClick={() => router.push("/dashboard/subscription/requests")}
            type="button"
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: 8,
              border: "1.5px solid #059669",
              backgroundColor: "transparent",
              color: "#059669",
              fontSize: "0.82rem",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            طلباتي
          </button>
        </div>
      )}

      {/* Billing cycle toggle */}
      {hasBothCycles && (
        <div style={{
          display: "flex",
          justifyContent: "center",
          marginBottom: "1.75rem",
        }}>
          <div style={{
            display: "flex",
            backgroundColor: "#f1f5f9",
            borderRadius: 12,
            padding: 4,
          }}>
            {(["Monthly", "Yearly"] as const).map(c => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                type="button"
                style={{
                  padding: "0.55rem 1.5rem",
                  borderRadius: 9,
                  border: "none",
                  backgroundColor: cycle === c ? "#fff" : "transparent",
                  color: cycle === c ? "#1a2e1a" : "#64748b",
                  fontWeight: cycle === c ? 700 : 500,
                  fontSize: "0.88rem",
                  cursor: "pointer",
                  boxShadow: cycle === c ? "0 1px 4px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {CYCLE_LABELS[c] ?? c}
                {c === "Yearly" && (
                  <span style={{ marginRight: "0.4rem", fontSize: "0.7rem", color: "#059669", fontWeight: 700 }}>
                    وفّر أكثر
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Loading */}
      {plansLoading && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem" }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              style={{
                height: 320,
                borderRadius: 16,
                background: "linear-gradient(90deg,#f0f0f0 25%,#e8e8e8 50%,#f0f0f0 75%)",
                backgroundSize: "200% 100%",
                animation: "shimmer 1.4s infinite",
              }}
            />
          ))}
        </div>
      )}

      {/* Error */}
      {plansError && (
        <div style={{
          backgroundColor: "#fee2e2",
          border: "1px solid #fca5a5",
          borderRadius: 12,
          padding: "1rem",
          color: "#b91c1c",
          fontSize: "0.88rem",
          textAlign: "center",
        }}>
          {plansError}
          <button
            onClick={loadPlans}
            type="button"
            style={{ marginRight: "0.75rem", color: "#b91c1c", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "0.88rem" }}
          >
            إعادة المحاولة
          </button>
        </div>
      )}

      {/* Plans grid — grouped */}
      {!plansLoading && !plansError && groups.map(([groupName, groupPlans]) => (
        <div key={groupName} style={{ marginBottom: "2.5rem" }}>
          {groups.length > 1 && (
            <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.05em" }}>
              {groupName}
            </p>
          )}
          <div style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: "1rem",
          }}>
            {groupPlans
              .sort((a, b) => (a.displayOrder ?? a.rank) - (b.displayOrder ?? b.rank))
              .map(plan => (
                <PlanCard
                  key={plan.planId}
                  plan={plan}
                  cycle={cycle}
                  currentPlanId={currentSub?.planId ?? null}
                  onChoose={(p, pricing) => {
                    setCheckoutPlan(p);
                    setCheckoutPricing(pricing);
                    setSuccessMethod(null);
                  }}
                  onActivateFree={handleActivateFree}
                  freeActivatingId={freeActivatingId}
                />
              ))}
          </div>
        </div>
      ))}

      {/* Info footer */}
      {!plansLoading && !plansError && (
        <div style={{
          marginTop: "1rem",
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          fontSize: "0.82rem",
          color: "#64748b",
          lineHeight: 1.7,
          textAlign: "center",
        }}>
          🔒 جميع المدفوعات تتم يدوياً ويراجعها فريق المبيعات قبل تفعيل الباقة.
          {" "}
          للاستفسار تواصل معنا عبر الدعم.
        </div>
      )}

      {/* Checkout modal */}
      {checkoutPlan && checkoutPricing && !successMethod && (
        <CheckoutModal
          plan={checkoutPlan}
          initialPricing={checkoutPricing}
          onClose={() => { setCheckoutPlan(null); setCheckoutPricing(null); }}
          onSuccess={(_id, method) => {
            setSuccessMethod(method);
            setCheckoutPlan(null);
            setCheckoutPricing(null);
          }}
        />
      )}

      {/* After success: we need to capture the method before closing modal */}
      {successMethod && (
        <SuccessModal
          paymentMethod={successMethod}
          onViewRequests={() => router.push("/dashboard/subscription/requests")}
          onClose={() => setSuccessMethod(null)}
        />
      )}

      {/* Free plan success modal */}
      {freeSuccessPlan && (
        <FreeSuccessModal
          planName={freeSuccessPlan}
          onGoToDashboard={() => router.push("/dashboard")}
          onClose={() => setFreeSuccessPlan(null)}
        />
      )}

    </div>
  );
}
