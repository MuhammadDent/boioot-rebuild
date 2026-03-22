"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { AdminPlanDetail, AdminPlanPricingEntry, PlanLimitItem, PlanFeatureItem } from "@/types";

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatPrice(n: number, currency = "ل.س") {
  if (n === 0) return "مجاني";
  return n.toLocaleString("ar-SY") + " " + currency;
}

function limitLabel(value: number) {
  if (value === -1) return "غير محدود";
  return String(value);
}

// ── ToggleSwitch ───────────────────────────────────────────────────────────────

function ToggleSwitch({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24, borderRadius: 12, border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "var(--color-primary, #2563eb)" : "#d1d5db",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 3, left: checked ? 23 : 3,
        width: 18, height: 18, borderRadius: "50%", background: "#fff",
        transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ── Shared styles ──────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.85rem", fontWeight: 600,
  marginBottom: "0.3rem", color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "0.55rem 0.75rem", borderRadius: 8,
  border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.95rem",
  background: "var(--color-bg)", color: "var(--color-text-primary)", boxSizing: "border-box",
};

const selectStyle: React.CSSProperties = { ...inputStyle, cursor: "pointer" };

// ── LimitRow ───────────────────────────────────────────────────────────────────

function LimitRow({ limit, saving, onSave }: { limit: PlanLimitItem; saving: boolean; onSave: (val: string) => void }) {
  const [val, setVal] = useState(String(limit.value));
  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", alignItems: "center", gap: "0.5rem", padding: "0.5rem 0.75rem", borderRadius: 8, background: "var(--color-bg-secondary, #f9fafb)" }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>{limit.name}</p>
        {limit.unit && <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{limitLabel(limit.value)} {limit.unit}</p>}
      </div>
      <input type="number" value={val} onChange={e => setVal(e.target.value)} style={{ ...inputStyle, width: 80, textAlign: "center", padding: "0.3rem 0.5rem", margin: 0 }} disabled={saving} />
      <button className="btn btn-primary" style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }} disabled={saving || val === String(limit.value)} onClick={() => onSave(val)}>
        {saving ? "..." : "حفظ"}
      </button>
    </div>
  );
}

// ── PricingPanel ───────────────────────────────────────────────────────────────

interface PricingRowProps {
  entry: AdminPlanPricingEntry;
  planId: string;
  onUpdated: (entry: AdminPlanPricingEntry) => void;
  onDeleted: (id: string) => void;
}

function PricingRow({ entry, planId, onUpdated, onDeleted }: PricingRowProps) {
  const [editing, setEditing]     = useState(false);
  const [price, setPrice]         = useState(String(entry.priceAmount));
  const [currency, setCurrency]   = useState(entry.currencyCode);
  const [cycle, setCycle]         = useState(entry.billingCycle);
  const [isActive, setIsActive]   = useState(entry.isActive);
  const [isPublic, setIsPublic]   = useState(entry.isPublic);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");
  const [deleting, setDeleting]   = useState(false);

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const updated = await adminApi.updatePlanPricing(planId, entry.id, {
        billingCycle:  cycle,
        priceAmount:   parseFloat(price) || 0,
        currencyCode:  currency,
        isActive,
        isPublic,
      });
      onUpdated(updated);
      setEditing(false);
    } catch (e) { setError(normalizeError(e)); }
    finally { setSaving(false); }
  }

  async function handleDelete() {
    if (!confirm("حذف هذا السعر نهائياً؟")) return;
    setDeleting(true); setError("");
    try {
      await adminApi.deletePlanPricing(planId, entry.id);
      onDeleted(entry.id);
    } catch (e) { setError(normalizeError(e)); }
    finally { setDeleting(false); }
  }

  const cycleLabel = entry.billingCycle === "Monthly" ? "شهري" : entry.billingCycle === "Yearly" ? "سنوي" : entry.billingCycle;

  if (!editing) {
    return (
      <div style={{ padding: "0.75rem 1rem", borderRadius: 8, background: "var(--color-bg-secondary, #f9fafb)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{formatPrice(entry.priceAmount, entry.currencyCode)}</span>
          <span className="badge badge-gray">{cycleLabel}</span>
          {entry.isActive ? <span className="badge badge-green">نشط</span> : <span className="badge badge-red">معطل</span>}
          {entry.isPublic ? <span className="badge badge-blue">عام</span> : <span className="badge badge-gray">خاص</span>}
        </div>
        <div style={{ display: "flex", gap: "0.4rem" }}>
          <button className="btn" style={{ padding: "0.25rem 0.7rem", fontSize: "0.8rem" }} onClick={() => setEditing(true)}>تعديل</button>
          <button className="btn" style={{ padding: "0.25rem 0.7rem", fontSize: "0.8rem", color: "var(--color-error)", borderColor: "var(--color-error)" }} onClick={handleDelete} disabled={deleting}>{deleting ? "..." : "حذف"}</button>
        </div>
        {error && <p style={{ color: "var(--color-error)", fontSize: "0.82rem", width: "100%", margin: 0 }}>{error}</p>}
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", borderRadius: 8, border: "1.5px solid var(--color-primary)", background: "var(--color-bg-secondary, #f9fafb)" }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={labelStyle}>دورة الفوترة</label>
          <select value={cycle} onChange={e => setCycle(e.target.value)} style={selectStyle}>
            <option value="Monthly">شهري</option>
            <option value="Yearly">سنوي</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>السعر</label>
          <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>العملة</label>
          <input value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle} placeholder="SYP" />
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>نشط</label>
          <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>مرئي للعموم</label>
          <ToggleSwitch checked={isPublic} onChange={setIsPublic} disabled={saving} />
        </div>
      </div>
      {error && <p style={{ color: "var(--color-error)", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>{saving ? "جاري الحفظ..." : "حفظ"}</button>
        <button className="btn" style={{ flex: 1 }} onClick={() => { setEditing(false); setError(""); }} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

interface AddPricingFormProps {
  planId: string;
  onCreated: (entry: AdminPlanPricingEntry) => void;
  onCancel: () => void;
}

function AddPricingForm({ planId, onCreated, onCancel }: AddPricingFormProps) {
  const [cycle, setCycle]         = useState("Monthly");
  const [price, setPrice]         = useState("0");
  const [currency, setCurrency]   = useState("SYP");
  const [isActive, setIsActive]   = useState(true);
  const [isPublic, setIsPublic]   = useState(true);
  const [saving, setSaving]       = useState(false);
  const [error, setError]         = useState("");

  async function handleSave() {
    setSaving(true); setError("");
    try {
      const entry = await adminApi.createPlanPricing(planId, {
        billingCycle:  cycle,
        priceAmount:   parseFloat(price) || 0,
        currencyCode:  currency,
        isActive,
        isPublic,
      });
      onCreated(entry);
    } catch (e) { setError(normalizeError(e)); }
    finally { setSaving(false); }
  }

  return (
    <div style={{ padding: "1rem", borderRadius: 8, border: "1.5px dashed var(--color-primary)", background: "var(--color-bg-secondary, #f9fafb)" }}>
      <p style={{ margin: "0 0 0.75rem", fontWeight: 600, fontSize: "0.9rem" }}>إضافة سعر جديد</p>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div>
          <label style={labelStyle}>دورة الفوترة</label>
          <select value={cycle} onChange={e => setCycle(e.target.value)} style={selectStyle}>
            <option value="Monthly">شهري</option>
            <option value="Yearly">سنوي</option>
          </select>
        </div>
        <div>
          <label style={labelStyle}>السعر</label>
          <input type="number" min={0} value={price} onChange={e => setPrice(e.target.value)} style={inputStyle} />
        </div>
        <div>
          <label style={labelStyle}>العملة</label>
          <input value={currency} onChange={e => setCurrency(e.target.value)} style={inputStyle} placeholder="SYP" />
        </div>
      </div>
      <div style={{ display: "flex", gap: "1.5rem", marginBottom: "0.75rem", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>نشط</label>
          <ToggleSwitch checked={isActive} onChange={setIsActive} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <label style={{ ...labelStyle, marginBottom: 0 }}>مرئي للعموم</label>
          <ToggleSwitch checked={isPublic} onChange={setIsPublic} />
        </div>
      </div>
      {error && <p style={{ color: "var(--color-error)", fontSize: "0.82rem", marginBottom: "0.5rem" }}>{error}</p>}
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="btn btn-primary" style={{ flex: 1 }} onClick={handleSave} disabled={saving}>{saving ? "جاري الإضافة..." : "إضافة"}</button>
        <button className="btn" style={{ flex: 1 }} onClick={onCancel} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

// ── EditPlanModal ──────────────────────────────────────────────────────────────

interface EditModalProps {
  plan: AdminPlanDetail | null;
  onClose: () => void;
  onSaved: (updated: AdminPlanDetail) => void;
}

function EditPlanModal({ plan, onClose, onSaved }: EditModalProps) {
  const isNew = plan === null;

  const [name, setName]                 = useState(plan?.name ?? "");
  const [description, setDescription]   = useState(plan?.description ?? "");
  const [priceMonthly, setPriceMonthly] = useState(String(plan?.basePriceMonthly ?? 0));
  const [priceYearly, setPriceYearly]   = useState(String(plan?.basePriceYearly ?? 0));
  const [isActive, setIsActive]         = useState(plan?.isActive ?? true);
  const [isPublic, setIsPublic]         = useState(plan?.isPublic ?? true);
  const [isRecommended, setIsRecommended] = useState(plan?.isRecommended ?? false);
  const [displayOrder, setDisplayOrder] = useState(String(plan?.displayOrder ?? 0));
  const [billingMode, setBillingMode]   = useState(plan?.billingMode ?? "InternalOnly");
  const [planCategory, setPlanCategory] = useState(plan?.planCategory ?? "");
  const [rank, setRank]                 = useState(String(plan?.rank ?? 0));

  const [limits, setLimits]     = useState<PlanLimitItem[]>(plan?.limits ?? []);
  const [features, setFeatures] = useState<PlanFeatureItem[]>(plan?.features ?? []);

  const [pricing, setPricing]           = useState<AdminPlanPricingEntry[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [showAddPricing, setShowAddPricing] = useState(false);

  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [limitSaving, setLimitSaving] = useState<string | null>(null);
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!isNew && plan?.id) {
      setPricingLoading(true);
      adminApi.getPlanPricing(plan.id)
        .then(setPricing)
        .catch(() => {})
        .finally(() => setPricingLoading(false));
    }
  }, [isNew, plan?.id]);

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError("");
    try {
      let result: AdminPlanDetail;
      if (isNew) {
        result = await adminApi.createPlan({
          name: name.trim(),
          description: description.trim() || undefined,
          basePriceMonthly: parseFloat(priceMonthly) || 0,
          basePriceYearly:  parseFloat(priceYearly)  || 0,
        });
      } else {
        result = await adminApi.updatePlan(plan!.id, {
          name: name.trim(),
          description: description.trim() || undefined,
          basePriceMonthly: parseFloat(priceMonthly) || 0,
          basePriceYearly:  parseFloat(priceYearly)  || 0,
          isActive,
          displayOrder: parseInt(displayOrder) || 0,
          isPublic,
          isRecommended,
          planCategory: planCategory || undefined,
          billingMode,
        });
      }
      setLimits(result.limits);
      setFeatures(result.features);
      onSaved(result);
      if (isNew) onClose();
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  async function handleLimitChange(key: string, rawVal: string) {
    const planId = plan?.id;
    if (!planId) return;
    const val = parseFloat(rawVal);
    if (isNaN(val)) return;
    setLimitSaving(key); setError("");
    try {
      const updated = await adminApi.setPlanLimit(planId, key, val);
      setLimits(prev => prev.map(l => l.key === key ? updated : l));
    } catch (e) { setError(normalizeError(e)); }
    finally { setLimitSaving(null); }
  }

  async function handleFeatureToggle(key: string, newVal: boolean) {
    const planId = plan?.id;
    if (!planId) return;
    setFeatureSaving(key); setError("");
    try {
      const updated = await adminApi.setPlanFeature(planId, key, newVal);
      setFeatures(prev => prev.map(f => f.key === key ? updated : f));
    } catch (e) { setError(normalizeError(e)); }
    finally { setFeatureSaving(null); }
  }

  void rank; // rank is read-only for now (updated via existing Rank seed)

  const sectionHeadStyle: React.CSSProperties = {
    margin: "0 0 1rem",
    fontWeight: 700,
    fontSize: "0.78rem",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    color: "var(--color-text-secondary)",
  };

  const sectionDivStyle: React.CSSProperties = {
    borderTop: "1px solid var(--color-border, #e5e7eb)",
    paddingTop: "1.25rem",
    marginTop: "1.5rem",
  };

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 1200, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: "var(--color-bg)", borderRadius: 14, width: "100%", maxWidth: 760, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.2)", overflow: "hidden" }}>

        {/* ── Sticky Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 1.75rem", borderBottom: "1px solid var(--color-border, #e5e7eb)", flexShrink: 0, backgroundColor: "var(--color-bg)" }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, color: "var(--color-text-secondary)", padding: "0.15rem 0.5rem", borderRadius: 6 }}
          >
            ×
          </button>
          <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>
            {isNew ? "إنشاء خطة جديدة" : `تعديل: ${plan!.name}`}
          </h2>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1.75rem" }}>

          {error && (
            <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1.25rem", fontSize: "0.9rem" }}>
              {error}
            </div>
          )}

          {/* ── Basic Info Form ── */}
          <form onSubmit={handleSavePlan}>

            {/* Section: Basic Info */}
            <p style={sectionHeadStyle}>المعلومات الأساسية</p>

            <div style={{ marginBottom: "1rem" }}>
              <label style={labelStyle}>اسم الخطة *</label>
              <input
                required
                value={name}
                onChange={e => setName(e.target.value)}
                style={inputStyle}
                placeholder="مثال: AgentPro"
              />
            </div>

            <div style={{ marginBottom: "0.25rem" }}>
              <label style={labelStyle}>الوصف</label>
              <textarea
                value={description}
                onChange={e => setDescription(e.target.value)}
                style={{ ...inputStyle, minHeight: 90, resize: "vertical" }}
                placeholder="وصف مختصر للخطة..."
              />
            </div>

            {/* Section: Pricing */}
            <div style={sectionDivStyle}>
              <p style={sectionHeadStyle}>التسعير الأساسي</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                <div>
                  <label style={labelStyle}>السعر الشهري الأساسي (ل.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceMonthly}
                    onChange={e => setPriceMonthly(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>السعر السنوي الأساسي (ل.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceYearly}
                    onChange={e => setPriceYearly(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
            </div>

            {!isNew && (
              <>
                {/* Section: Visibility & Display */}
                <div style={sectionDivStyle}>
                  <p style={sectionHeadStyle}>الظهور والترتيب</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
                    <div>
                      <label style={labelStyle}>ترتيب العرض (رقم أصغر = يظهر أولاً)</label>
                      <input
                        type="number"
                        value={displayOrder}
                        onChange={e => setDisplayOrder(e.target.value)}
                        style={inputStyle}
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>الفئة</label>
                      <select
                        value={planCategory}
                        onChange={e => setPlanCategory(e.target.value)}
                        style={selectStyle}
                      >
                        <option value="">— بدون فئة —</option>
                        <option value="Individual">أفراد (Individual)</option>
                        <option value="Business">أعمال (Business)</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "1.75rem", flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>نشطة</label>
                      <ToggleSwitch checked={isActive} onChange={setIsActive} disabled={saving} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>مرئية للعموم</label>
                      <ToggleSwitch checked={isPublic} onChange={setIsPublic} disabled={saving} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>موصى بها ⭐</label>
                      <ToggleSwitch checked={isRecommended} onChange={setIsRecommended} disabled={saving} />
                    </div>
                  </div>
                </div>

                {/* Section: Billing Mode */}
                <div style={sectionDivStyle}>
                  <p style={sectionHeadStyle}>وضع الفوترة</p>
                  <select
                    value={billingMode}
                    onChange={e => setBillingMode(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="InternalOnly">داخلي فقط (تحويل بنكي)</option>
                    <option value="StripeOnly">Stripe فقط</option>
                    <option value="Hybrid">هجين (داخلي + Stripe)</option>
                  </select>
                </div>
              </>
            )}

            {/* ── Save Button ── */}
            <div style={{ borderTop: "1px solid var(--color-border, #e5e7eb)", paddingTop: "1.25rem", marginTop: "1.5rem" }}>
              <button
                type="submit"
                className="btn btn-primary"
                style={{ width: "100%" }}
                disabled={saving}
              >
                {saving ? "جاري الحفظ..." : isNew ? "إنشاء الخطة" : "حفظ المعلومات الأساسية"}
              </button>
            </div>
          </form>

          {/* ── Pricing entries (only for existing plans) ── */}
          {!isNew && (
            <div style={sectionDivStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.9rem" }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "0.3rem 0.85rem", fontSize: "0.82rem", visibility: showAddPricing ? "hidden" : "visible" }}
                  onClick={() => setShowAddPricing(true)}
                >
                  + إضافة سعر
                </button>
                <p style={sectionHeadStyle}>أسعار الاشتراك</p>
              </div>
              {pricingLoading && <p style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>جاري التحميل...</p>}
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {pricing.map(entry => (
                  <PricingRow
                    key={entry.id}
                    entry={entry}
                    planId={plan!.id}
                    onUpdated={updated => setPricing(prev => prev.map(p => p.id === updated.id ? updated : p))}
                    onDeleted={id => setPricing(prev => prev.filter(p => p.id !== id))}
                  />
                ))}
                {!pricingLoading && pricing.length === 0 && !showAddPricing && (
                  <p style={{ color: "var(--color-text-secondary)", fontSize: "0.85rem", textAlign: "center", padding: "0.75rem 0" }}>لا توجد أسعار بعد.</p>
                )}
                {showAddPricing && (
                  <AddPricingForm
                    planId={plan!.id}
                    onCreated={entry => { setPricing(prev => [...prev, entry]); setShowAddPricing(false); }}
                    onCancel={() => setShowAddPricing(false)}
                  />
                )}
              </div>
            </div>
          )}

          {/* ── Limits (only for existing plans) ── */}
          {!isNew && limits.length > 0 && (
            <div style={sectionDivStyle}>
              <p style={sectionHeadStyle}>الحدود الكمية</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {limits.map(lim => (
                  <LimitRow key={lim.key} limit={lim} saving={limitSaving === lim.key} onSave={(val) => handleLimitChange(lim.key, val)} />
                ))}
              </div>
              <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>استخدم ‑1 لتعيين الحد كـ &quot;غير محدود&quot;</p>
            </div>
          )}

          {/* ── Features (only for existing plans) ── */}
          {!isNew && features.length > 0 && (
            <div style={sectionDivStyle}>
              <p style={sectionHeadStyle}>الميزات</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                {features.map(feat => (
                  <div
                    key={feat.key}
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.55rem 0.75rem", borderRadius: 8, background: "var(--color-bg-secondary, #f9fafb)", opacity: featureSaving === feat.key ? 0.6 : 1, transition: "opacity 0.2s" }}
                  >
                    <div>
                      <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>{feat.name}</p>
                      {feat.featureGroup && <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>{feat.featureGroup}</p>}
                    </div>
                    <ToggleSwitch checked={feat.isEnabled} onChange={(val) => handleFeatureToggle(feat.key, val)} disabled={featureSaving === feat.key} />
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });

  const [plans, setPlans]         = useState<AdminPlanDetail[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [editTarget, setEditTarget]     = useState<AdminPlanDetail | null | undefined>(undefined);
  const [modalOpen, setModalOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState("");

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setFetching(true); setFetchError("");
    try {
      const data = await adminApi.getPlans();
      setPlans(data as AdminPlanDetail[]);
    } catch (e) { setFetchError(normalizeError(e)); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  async function handleOpenEdit(id: string) {
    setDetailLoading(true); setActionError("");
    try {
      const detail = await adminApi.getPlanDetail(id);
      setEditTarget(detail);
      setModalOpen(true);
    } catch (e) { setActionError(normalizeError(e)); }
    finally { setDetailLoading(false); }
  }

  function handleOpenCreate() { setEditTarget(null); setModalOpen(true); }
  function handleModalClose() { setModalOpen(false); setEditTarget(undefined as any); }

  function handleSaved(updated: AdminPlanDetail) {
    setPlans(prev => {
      const exists = prev.find(p => p.id === updated.id);
      if (exists) return prev.map(p => p.id === updated.id ? updated : p);
      return [...prev, updated];
    });
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true); setDeleteError("");
    try {
      await adminApi.deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      setDeleteId(null);
    } catch (e) { setDeleteError(normalizeError(e)); }
    finally { setDeleteLoading(false); }
  }

  const sorted = [...plans].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>إدارة خطط الاشتراك</h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{plans.length} خطة</p>
            </div>
            <button className="btn btn-primary" onClick={handleOpenCreate} style={{ flexShrink: 0 }}>+ خطة جديدة</button>
          </div>
        </div>

        {(fetchError || actionError) && <InlineBanner message={fetchError || actionError} />}

        {fetching && <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>جاري التحميل...</div>}

        {!fetching && plans.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>لا توجد خطط بعد. أنشئ أول خطة!</div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {sorted.map(plan => (
            <div key={plan.id} className="form-card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{plan.name}</span>
                  <span className={plan.isActive ? "badge badge-green" : "badge badge-red"}>{plan.isActive ? "نشطة" : "معطلة"}</span>
                  <span className={plan.isPublic ? "badge badge-blue" : "badge badge-gray"}>{plan.isPublic ? "عامة" : "مخفية"}</span>
                  {plan.isRecommended && <span className="badge badge-yellow">⭐ موصى بها</span>}
                  {plan.planCategory && <span className="badge badge-gray">{plan.planCategory === "Individual" ? "أفراد" : plan.planCategory === "Business" ? "أعمال" : plan.planCategory}</span>}
                </div>
                {plan.description && <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{plan.description}</p>}
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  ترتيب: {plan.displayOrder}
                  &nbsp;·&nbsp;رتبة: {plan.rank}
                  &nbsp;·&nbsp;{plan.billingMode === "InternalOnly" ? "داخلي" : plan.billingMode === "StripeOnly" ? "Stripe" : "هجين"}
                </p>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button className="btn" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }} disabled={detailLoading} onClick={() => handleOpenEdit(plan.id)}>
                  {detailLoading ? "..." : "تعديل"}
                </button>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", border: "1.5px solid var(--color-error)", color: "var(--color-error)", backgroundColor: "transparent" }}
                  onClick={() => { setDeleteId(plan.id); setDeleteError(""); }}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete Confirmation ── */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "var(--color-bg)", borderRadius: 12, padding: "2rem", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 0.75rem" }}>تأكيد الحذف</h3>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>سيتم تعطيل هذه الخطة. لا يمكن حذف خطة لها مشتركون نشطون.</p>
            {deleteError && <p style={{ color: "var(--color-error)", fontSize: "0.9rem", marginBottom: "1rem" }}>{deleteError}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button className="btn btn-primary" style={{ flex: 1, background: "var(--color-error, #dc2626)", borderColor: "var(--color-error, #dc2626)" }} disabled={deleteLoading} onClick={() => handleDelete(deleteId)}>
                {deleteLoading ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
              <button className="btn" style={{ flex: 1 }} disabled={deleteLoading} onClick={() => { setDeleteId(null); setDeleteError(""); }}>إلغاء</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {modalOpen && (
        <EditPlanModal
          plan={editTarget ?? null}
          onClose={handleModalClose}
          onSaved={(updated) => handleSaved(updated)}
        />
      )}
    </div>
  );
}
