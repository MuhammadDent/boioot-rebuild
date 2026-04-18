"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { pricingApi } from "@/features/pricing/api";
import { subscriptionApi } from "@/features/subscription/api";
import { paymentRequestsApi } from "@/features/subscriptionPayments/api";
import {
  getAudienceTypeForUser,
  filterPlansForAudience,
} from "@/features/pricing/planCompatibility";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHOD_DESC,
  PAYMENT_METHOD_ICON,
  AVAILABLE_METHODS,
  RECEIPT_METHODS,
} from "@/features/subscriptionPayments/constants";
import { api, normalizeError } from "@/lib/api";
import type { PublicPricingItem, PublicPricingEntry } from "@/features/pricing/types";
import type { CurrentSubscriptionResponse } from "@/features/subscription/types";
import Spinner from "@/components/ui/Spinner";

// ── helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number, currency: string) {
  if (amount === 0) return "مجاني";
  return `${amount.toLocaleString("ar-SY")} ${currency}`;
}

const BILLING_CYCLE_AR: Record<string, string> = {
  Monthly: "شهري",
  Yearly:  "سنوي",
  OneTime: "دفعة واحدة",
};

// ── NewRequestPage ────────────────────────────────────────────────────────────

export default function NewRequestPage() {
  const { user, isLoading } = useProtectedRoute();
  const router = useRouter();

  // ── data state ──────────────────────────────────────────────────────────────
  const [plans, setPlans]           = useState<PublicPricingItem[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [plansError, setPlansError] = useState<string | null>(null);
  const [currentSub, setCurrentSub] = useState<CurrentSubscriptionResponse | null>(null);
  const [subLoading, setSubLoading] = useState(true);

  // ── form state ──────────────────────────────────────────────────────────────
  const [selectedPlan, setSelectedPlan]       = useState<PublicPricingItem | null>(null);
  const [selectedPricing, setSelectedPricing] = useState<PublicPricingEntry | null>(null);
  const [paymentMethod, setPaymentMethod]     = useState(AVAILABLE_METHODS[0]);
  const [customerNote, setCustomerNote]       = useState("");
  const [salesRep, setSalesRep]               = useState("");
  const [proofFile, setProofFile]             = useState<File | null>(null);
  const fileInputRef                          = useRef<HTMLInputElement>(null);

  // ── submission state ────────────────────────────────────────────────────────
  const [submitting, setSubmitting]     = useState(false);
  const [submitPhase, setSubmitPhase]   = useState<"idle" | "creating" | "uploading" | "attaching">("idle");
  const [submitError, setSubmitError]   = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const isReceiptRequired = RECEIPT_METHODS.has(paymentMethod);

  // ── load data ───────────────────────────────────────────────────────────────
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

  useEffect(() => { loadPlans(); }, [loadPlans]);

  useEffect(() => {
    if (!user) return;
    subscriptionApi.getCurrent()
      .then(sub => setCurrentSub(sub))
      .catch(() => setCurrentSub(null))
      .finally(() => setSubLoading(false));
  }, [user]);

  // Auto-select plan from ?planId= query param
  useEffect(() => {
    if (plans.length === 0) return;
    const params = new URLSearchParams(window.location.search);
    const planId = params.get("planId");
    if (!planId) return;
    const found = plans.find(p => p.planId === planId);
    if (found && found.billingType !== "free_default") {
      setSelectedPlan(found);
      const fallbackPricing = found.pricing[0] ?? null;
      setSelectedPricing(fallbackPricing);
    }
  }, [plans]);

  // ── file handler ─────────────────────────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (!f) { setProofFile(null); return; }
    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    if (!allowed.includes(f.type)) {
      setSubmitError("نوع الملف غير مدعوم. يُقبل JPG أو PNG أو PDF فقط.");
      e.target.value = "";
      return;
    }
    if (f.size > 5 * 1024 * 1024) {
      setSubmitError("حجم الملف يتجاوز 5MB.");
      e.target.value = "";
      return;
    }
    setSubmitError(null);
    setProofFile(f);
  }

  // ── submit ───────────────────────────────────────────────────────────────────
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedPlan || !selectedPricing) {
      setSubmitError("يرجى اختيار الباقة المطلوبة أولاً.");
      return;
    }
    if (isReceiptRequired && !proofFile) {
      setSubmitError("يرجى رفع صورة الإيصال أو ملف الإثبات قبل الإرسال.");
      return;
    }

    const payload = {
      planId:       selectedPlan.planId,
      pricingId:    selectedPricing.pricingId,
      billingCycle: selectedPricing.billingCycle,
      paymentMethod,
      customerNote: customerNote.trim() || undefined,
      salesRepresentativeName:
        paymentMethod === "cash_to_sales_rep" && salesRep.trim()
          ? salesRep.trim()
          : undefined,
    };

    console.log("[NewRequest] user        :", user?.email, "| role:", user?.role);
    console.log("[NewRequest] currentPlan :", currentSub?.planName ?? "لا يوجد");
    console.log("[NewRequest] targetPlan  :", selectedPlan.displayNameAr, selectedPlan.planId);
    console.log("[NewRequest] pricing     :", selectedPricing.billingCycle, selectedPricing.priceAmount, selectedPricing.currencyCode);
    console.log("[NewRequest] proofFile   :", proofFile?.name ?? "none");
    console.log("[NewRequest] payload →   :", payload);

    setSubmitting(true);
    setSubmitError(null);
    try {
      setSubmitPhase("creating");
      const result = await paymentRequestsApi.create(payload);
      console.log("[NewRequest] ← backend response:", result);

      if (proofFile) {
        setSubmitPhase("uploading");
        const form = new FormData();
        form.append("file", proofFile);
        const { url } = await api.upload<{ url: string; fileName: string }>("/upload/proof", form);
        console.log("[NewRequest] proof uploaded:", url);

        setSubmitPhase("attaching");
        await paymentRequestsApi.uploadReceipt(result.id, { receiptImageUrl: url });
      }

      setSubmitSuccess(true);
    } catch (err) {
      const msg = normalizeError(err);
      console.error("[NewRequest] error:", msg);
      setSubmitError(msg);
    } finally {
      setSubmitting(false);
      setSubmitPhase("idle");
    }
  }

  function getSubmitLabel() {
    if (!submitting) return "إرسال طلب الاشتراك";
    if (submitPhase === "creating")  return "جارٍ إنشاء الطلب...";
    if (submitPhase === "uploading") return "جارٍ رفع الملف...";
    if (submitPhase === "attaching") return "جارٍ إرفاق الإيصال...";
    return "جارٍ الإرسال...";
  }

  // ── guards ───────────────────────────────────────────────────────────────────
  if (isLoading || subLoading) return (
    <div style={{ display: "flex", justifyContent: "center", padding: "4rem" }}>
      <Spinner />
    </div>
  );
  if (!user) return null;

  // ── success screen ───────────────────────────────────────────────────────────
  if (submitSuccess) {
    return (
      <div style={{ maxWidth: 520, margin: "0 auto", padding: "3rem 1rem", textAlign: "center" }}>
        <div style={{ fontSize: "3.5rem", marginBottom: "1rem" }}>🎉</div>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.3rem", fontWeight: 800, color: "#1a2e1a" }}>
          تم إرسال طلبك بنجاح!
        </h2>
        <p style={{ margin: "0 0 0.4rem", fontSize: "1rem", fontWeight: 700, color: "#059669" }}>
          {selectedPlan?.displayNameAr ?? selectedPlan?.planName}
        </p>
        <p style={{ margin: "0 0 1.75rem", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.7 }}>
          تم استلام طلبك وهو قيد المراجعة. سيتواصل معك فريق بويوت لتأكيد الاشتراك.
        </p>
        <button
          onClick={() => router.push("/dashboard/subscription/requests")}
          type="button"
          style={{
            display: "block", width: "100%", padding: "0.85rem",
            borderRadius: 10, border: "none", backgroundColor: "#059669",
            color: "#fff", fontSize: "0.95rem", fontWeight: 700, cursor: "pointer",
            marginBottom: "0.65rem",
          }}
        >
          عرض طلباتي
        </button>
        <button
          onClick={() => router.push("/dashboard")}
          type="button"
          style={{
            display: "block", width: "100%", padding: "0.7rem",
            borderRadius: 10, border: "1.5px solid #e2e8f0", backgroundColor: "transparent",
            color: "#374151", fontSize: "0.88rem", cursor: "pointer",
          }}
        >
          العودة للوحة التحكم
        </button>
      </div>
    );
  }

  // ── compute visible plans ────────────────────────────────────────────────────
  const audienceType = getAudienceTypeForUser(user.role, currentSub?.audienceType);
  const selectablePlans = filterPlansForAudience(plans, audienceType)
    .filter(p => p.billingType !== "free_default")   // exclude free plans — no payment needed
    .sort((a, b) => (a.displayOrder ?? a.rank) - (b.displayOrder ?? b.rank));

  // ── main render ──────────────────────────────────────────────────────────────
  return (
    <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 0 3rem" }}>

      {/* Breadcrumb header */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <Link
          href="/dashboard/subscription/requests"
          style={{ fontSize: "0.82rem", color: "#64748b", textDecoration: "none" }}
        >
          طلبات الاشتراك
        </Link>
        <span style={{ color: "#cbd5e1", fontSize: "0.8rem" }}>›</span>
        <span style={{ fontSize: "0.82rem", color: "#1a2e1a", fontWeight: 600 }}>طلب جديد</span>
      </div>

      <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.55rem", fontWeight: 800, color: "#1a2e1a" }}>
        طلب اشتراك جديد
      </h1>
      <p style={{ margin: "0 0 1.75rem", fontSize: "0.875rem", color: "#64748b" }}>
        اختر الباقة المناسبة وأرسل طلبك — سيتواصل معك فريق بويوت لإتمام الاشتراك.
      </p>

      {/* Current plan banner */}
      {currentSub && (
        <div style={{
          backgroundColor: "#f0fdf4", border: "1.5px solid #bbf7d0",
          borderRadius: 12, padding: "0.9rem 1.1rem", marginBottom: "1.5rem",
          display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "0.5rem",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.75rem", color: "#166534", fontWeight: 600 }}>
              اشتراكك الحالي
            </p>
            <p style={{ margin: "0.15rem 0 0", fontSize: "0.95rem", fontWeight: 800, color: "#1a2e1a" }}>
              {currentSub.planName}
            </p>
          </div>
          <span style={{
            display: "inline-block", padding: "0.25rem 0.8rem",
            borderRadius: 20, backgroundColor: "#dcfce7", color: "#166534",
            fontSize: "0.75rem", fontWeight: 700,
          }}>
            ✓ نشط
          </span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>

        {/* ── SECTION 1: Plan selection ── */}
        <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#1a2e1a" }}>
            ١. اختر الباقة المستهدفة
          </h2>

          {plansLoading && (
            <div style={{ display: "flex", justifyContent: "center", padding: "2rem" }}>
              <Spinner />
            </div>
          )}

          {plansError && (
            <div style={{
              backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
              borderRadius: 9, padding: "0.75rem 1rem", fontSize: "0.85rem", color: "#b91c1c",
            }}>
              {plansError}
              <button
                onClick={loadPlans}
                type="button"
                style={{ marginRight: "0.5rem", color: "#b91c1c", textDecoration: "underline", background: "none", border: "none", cursor: "pointer", fontSize: "0.85rem" }}
              >
                إعادة المحاولة
              </button>
            </div>
          )}

          {!plansLoading && !plansError && selectablePlans.length === 0 && (
            <p style={{ color: "#64748b", fontSize: "0.88rem", margin: 0 }}>
              لا توجد باقات متاحة لنوع حسابك حالياً. <Link href="/dashboard/subscription/plans" style={{ color: "#059669" }}>تصفح جميع الباقات</Link>
            </p>
          )}

          {!plansLoading && !plansError && selectablePlans.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "0.65rem" }}>
              {selectablePlans.map(plan => {
                const isSelected   = selectedPlan?.planId === plan.planId;
                const isCurrent    = plan.planId === currentSub?.planId;
                const firstPricing = plan.pricing[0];

                return (
                  <label
                    key={plan.planId}
                    style={{
                      display: "flex", alignItems: "center", gap: "0.85rem",
                      padding: "0.9rem 1rem", borderRadius: 10, cursor: isCurrent ? "default" : "pointer",
                      border: isSelected ? "2px solid #059669" : "1.5px solid #e2e8f0",
                      backgroundColor: isSelected ? "#f0fdf4" : "#fafafa",
                      opacity: isCurrent ? 0.55 : 1,
                    }}
                  >
                    <input
                      type="radio"
                      name="targetPlan"
                      value={plan.planId}
                      disabled={isCurrent}
                      checked={isSelected}
                      onChange={() => {
                        setSelectedPlan(plan);
                        setSelectedPricing(firstPricing ?? null);
                        setSubmitError(null);
                      }}
                      style={{ accentColor: "#059669", width: 17, height: 17, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                        <span style={{ fontWeight: 700, fontSize: "0.92rem", color: "#1a2e1a" }}>
                          {plan.displayNameAr ?? plan.planName}
                        </span>
                        {isCurrent && (
                          <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.6rem", borderRadius: 20, backgroundColor: "#dbeafe", color: "#1d4ed8", fontWeight: 600 }}>
                            باقتك الحالية
                          </span>
                        )}
                        {plan.isRecommended && !isCurrent && (
                          <span style={{ fontSize: "0.7rem", padding: "0.15rem 0.6rem", borderRadius: 20, backgroundColor: "#dcfce7", color: "#166534", fontWeight: 600 }}>
                            ⭐ الأكثر شعبية
                          </span>
                        )}
                      </div>
                      {plan.description && (
                        <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                          {plan.description}
                        </p>
                      )}
                    </div>
                    <div style={{ textAlign: "left", flexShrink: 0 }}>
                      {firstPricing ? (
                        <>
                          <p style={{ margin: 0, fontWeight: 800, fontSize: "0.95rem", color: "#059669" }}>
                            {formatAmount(firstPricing.priceAmount, firstPricing.currencyCode)}
                          </p>
                          <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>
                            {BILLING_CYCLE_AR[firstPricing.billingCycle] ?? firstPricing.billingCycle}
                          </p>
                        </>
                      ) : (
                        <p style={{ margin: 0, fontSize: "0.78rem", color: "#94a3b8" }}>—</p>
                      )}
                    </div>
                  </label>
                );
              })}
            </div>
          )}

          {/* Billing cycle selection if selected plan has multiple cycles */}
          {selectedPlan && selectedPlan.pricing.length > 1 && (
            <div style={{ marginTop: "1rem", paddingTop: "1rem", borderTop: "1px solid #f1f5f9" }}>
              <p style={{ margin: "0 0 0.6rem", fontSize: "0.8rem", color: "#64748b", fontWeight: 600 }}>
                دورة الفاتورة
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {selectedPlan.pricing.map(pr => (
                  <button
                    key={pr.pricingId}
                    type="button"
                    onClick={() => setSelectedPricing(pr)}
                    style={{
                      padding: "0.45rem 1rem", borderRadius: 8,
                      border: selectedPricing?.pricingId === pr.pricingId ? "2px solid #059669" : "1.5px solid #e2e8f0",
                      backgroundColor: selectedPricing?.pricingId === pr.pricingId ? "#f0fdf4" : "#fff",
                      color: selectedPricing?.pricingId === pr.pricingId ? "#059669" : "#374151",
                      fontWeight: 600, fontSize: "0.82rem", cursor: "pointer",
                    }}
                  >
                    {BILLING_CYCLE_AR[pr.billingCycle] ?? pr.billingCycle}
                    {" · "}
                    {formatAmount(pr.priceAmount, pr.currencyCode)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* ── SECTION 2: Payment method (only if plan selected) ── */}
        {selectedPlan && (
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#1a2e1a" }}>
              ٢. طريقة الدفع
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.55rem" }}>
              {AVAILABLE_METHODS.map(method => {
                const isSelected = paymentMethod === method;
                return (
                  <label
                    key={method}
                    style={{
                      display: "flex", alignItems: "flex-start", gap: "0.75rem",
                      padding: "0.85rem 1rem", borderRadius: 10, cursor: "pointer",
                      border: isSelected ? "2px solid #1a2e1a" : "1.5px solid #e2e8f0",
                      backgroundColor: isSelected ? "#f8fafc" : "#fff",
                    }}
                  >
                    <input
                      type="radio"
                      name="paymentMethod"
                      value={method}
                      checked={isSelected}
                      onChange={() => { setPaymentMethod(method); setSubmitError(null); }}
                      style={{ marginTop: 2, accentColor: "#1a2e1a", flexShrink: 0 }}
                    />
                    <div>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "0.88rem", color: "#1a2e1a" }}>
                        {PAYMENT_METHOD_ICON[method]} {PAYMENT_METHOD_LABELS[method]}
                      </p>
                      <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                        {PAYMENT_METHOD_DESC[method]}
                      </p>
                    </div>
                  </label>
                );
              })}
            </div>

            {/* Sales rep field */}
            {paymentMethod === "cash_to_sales_rep" && (
              <div style={{ marginTop: "1rem" }}>
                <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
                  اسم مندوب المبيعات (اختياري)
                </label>
                <input
                  type="text"
                  value={salesRep}
                  onChange={e => setSalesRep(e.target.value)}
                  placeholder="مثال: أحمد محمد"
                  style={{
                    width: "100%", padding: "0.6rem 0.85rem", borderRadius: 8,
                    border: "1.5px solid #e2e8f0", fontSize: "0.88rem",
                    outline: "none", boxSizing: "border-box",
                  }}
                />
              </div>
            )}
          </div>
        )}

        {/* ── SECTION 3: Note + receipt upload ── */}
        {selectedPlan && (
          <div style={{ backgroundColor: "#fff", borderRadius: 14, padding: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.06)" }}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "#1a2e1a" }}>
              ٣. ملاحظات ومستندات
            </h2>

            {/* Note */}
            <div style={{ marginBottom: "1.1rem" }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
                ملاحظة (اختياري)
              </label>
              <textarea
                value={customerNote}
                onChange={e => setCustomerNote(e.target.value)}
                placeholder="أي تفاصيل إضافية تريد إضافتها لطلبك..."
                rows={3}
                style={{
                  width: "100%", padding: "0.65rem 0.9rem", borderRadius: 8,
                  border: "1.5px solid #e2e8f0", fontSize: "0.88rem",
                  resize: "vertical", outline: "none", boxSizing: "border-box",
                  fontFamily: "inherit",
                }}
              />
            </div>

            {/* File upload */}
            <div>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
                {isReceiptRequired ? "إيصال الدفع *" : "مستند إثبات (اختياري)"}
              </label>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.76rem", color: "#94a3b8" }}>
                صيغ مقبولة: JPG، PNG، PDF · الحد الأقصى: 5 ميغابايت
              </p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".jpg,.jpeg,.png,.pdf"
                onChange={handleFileChange}
                style={{ display: "none" }}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                style={{
                  display: "inline-flex", alignItems: "center", gap: "0.4rem",
                  padding: "0.6rem 1.1rem", borderRadius: 9,
                  border: "1.5px dashed #cbd5e1", backgroundColor: "#f8fafc",
                  color: "#475569", fontSize: "0.85rem", fontWeight: 600, cursor: "pointer",
                }}
              >
                📎 {proofFile ? proofFile.name : "اختر ملفاً"}
              </button>
              {proofFile && (
                <button
                  type="button"
                  onClick={() => { setProofFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  style={{
                    marginRight: "0.5rem", fontSize: "0.78rem", color: "#b91c1c",
                    background: "none", border: "none", cursor: "pointer", textDecoration: "underline",
                  }}
                >
                  حذف
                </button>
              )}
            </div>
          </div>
        )}

        {/* ── Error ── */}
        {submitError && (
          <div style={{
            backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
            borderRadius: 9, padding: "0.75rem 1rem", fontSize: "0.88rem", color: "#b91c1c",
          }}>
            {submitError}
          </div>
        )}

        {/* ── Footer info ── */}
        <div style={{
          backgroundColor: "#fffbeb", border: "1.5px solid #fcd34d",
          borderRadius: 10, padding: "0.75rem 1rem", fontSize: "0.8rem", color: "#92400e",
        }}>
          💡 جميع المدفوعات تتم يدوياً وتُراجعها فريق بيعات بويوت قبل تفعيل الباقة. للاستفسار تواصل معنا عبر قنوات الدعم.
        </div>

        {/* ── Submit button ── */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
          <button
            type="submit"
            disabled={submitting || !selectedPlan}
            style={{
              flex: 1, minWidth: 200,
              padding: "0.85rem", borderRadius: 10, border: "none",
              backgroundColor: submitting || !selectedPlan ? "#e2e8f0" : "#1a2e1a",
              color: submitting || !selectedPlan ? "#94a3b8" : "#fff",
              fontSize: "0.95rem", fontWeight: 700,
              cursor: submitting || !selectedPlan ? "default" : "pointer",
            }}
          >
            {submitting ? getSubmitLabel() : "إرسال طلب الاشتراك"}
          </button>
          <Link
            href="/dashboard/subscription/requests"
            style={{
              display: "inline-flex", alignItems: "center", justifyContent: "center",
              padding: "0.85rem 1.25rem", borderRadius: 10,
              border: "1.5px solid #e2e8f0", color: "#374151",
              textDecoration: "none", fontWeight: 600, fontSize: "0.88rem",
            }}
          >
            إلغاء
          </Link>
        </div>

      </form>
    </div>
  );
}
