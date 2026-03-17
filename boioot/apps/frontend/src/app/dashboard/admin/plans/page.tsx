"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { AdminPlanSummary, AdminPlanDetail, PlanLimitItem, PlanFeatureItem } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatPrice(n: number) {
  if (n === 0) return "مجاني";
  return n.toLocaleString("ar-SY") + " ل.س";
}

function limitLabel(value: number) {
  if (value === -1) return "غير محدود";
  return String(value);
}

// ── Modal: Edit / Create Plan ─────────────────────────────────────────────────

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

  const [limits, setLimits]     = useState<PlanLimitItem[]>(plan?.limits ?? []);
  const [features, setFeatures] = useState<PlanFeatureItem[]>(plan?.features ?? []);

  const [saving, setSaving]   = useState(false);
  const [error, setError]     = useState("");
  const [limitSaving, setLimitSaving]     = useState<string | null>(null);
  const [featureSaving, setFeatureSaving] = useState<string | null>(null);

  async function handleSavePlan(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
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
    setLimitSaving(key);
    setError("");
    try {
      const updated = await adminApi.setPlanLimit(planId, key, val);
      setLimits(prev => prev.map(l => l.key === key ? updated : l));
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLimitSaving(null);
    }
  }

  async function handleFeatureToggle(key: string, newVal: boolean) {
    const planId = plan?.id;
    if (!planId) return;
    setFeatureSaving(key);
    setError("");
    try {
      const updated = await adminApi.setPlanFeature(planId, key, newVal);
      setFeatures(prev => prev.map(f => f.key === key ? updated : f));
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setFeatureSaving(null);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "flex-start",
        justifyContent: "center", padding: "2rem 1rem",
        overflowY: "auto",
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          backgroundColor: "var(--color-bg)",
          borderRadius: 12, padding: "2rem",
          width: "100%", maxWidth: 620,
          boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700 }}>
            {isNew ? "إنشاء خطة جديدة" : `تعديل: ${plan!.name}`}
          </h2>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1 }}
          >×</button>
        </div>

        {error && (
          <div style={{
            background: "var(--color-error-bg, #fef2f2)",
            color: "var(--color-error)", padding: "0.75rem 1rem",
            borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem"
          }}>
            {error}
          </div>
        )}

        {/* ── Basic Info Form ── */}
        <form onSubmit={handleSavePlan}>
          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>اسم الخطة *</label>
            <input
              required value={name} onChange={e => setName(e.target.value)}
              style={inputStyle} placeholder="مثال: AgentPro"
            />
          </div>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>الوصف</label>
            <textarea
              value={description} onChange={e => setDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
              placeholder="وصف مختصر للخطة..."
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "1rem" }}>
            <div>
              <label style={labelStyle}>السعر الشهري (ل.س)</label>
              <input
                type="number" min={0} value={priceMonthly}
                onChange={e => setPriceMonthly(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>السعر السنوي (ل.س)</label>
              <input
                type="number" min={0} value={priceYearly}
                onChange={e => setPriceYearly(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          {!isNew && (
            <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
              <label style={{ ...labelStyle, marginBottom: 0 }}>الخطة نشطة</label>
              <ToggleSwitch
                checked={isActive}
                onChange={setIsActive}
                disabled={saving}
              />
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: "100%" }}
            disabled={saving}
          >
            {saving ? "جاري الحفظ..." : isNew ? "إنشاء الخطة" : "حفظ المعلومات الأساسية"}
          </button>
        </form>

        {/* ── Limits (only for existing plans) ── */}
        {!isNew && limits.length > 0 && (
          <div style={{ marginTop: "1.75rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>الحدود الكمية</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {limits.map(lim => (
                <LimitRow
                  key={lim.key}
                  limit={lim}
                  saving={limitSaving === lim.key}
                  onSave={(val) => handleLimitChange(lim.key, val)}
                />
              ))}
            </div>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
              استخدم ‑1 لتعيين الحد كـ &quot;غير محدود&quot;
            </p>
          </div>
        )}

        {/* ── Features (only for existing plans) ── */}
        {!isNew && features.length > 0 && (
          <div style={{ marginTop: "1.75rem" }}>
            <h3 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: "0.75rem" }}>الميزات</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {features.map(feat => (
                <div
                  key={feat.key}
                  style={{
                    display: "flex", justifyContent: "space-between",
                    alignItems: "center", padding: "0.5rem 0.75rem",
                    borderRadius: 8,
                    background: "var(--color-bg-secondary, #f9fafb)",
                    opacity: featureSaving === feat.key ? 0.6 : 1,
                    transition: "opacity 0.2s",
                  }}
                >
                  <div>
                    <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>{feat.name}</p>
                    {feat.featureGroup && (
                      <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
                        {feat.featureGroup}
                      </p>
                    )}
                  </div>
                  <ToggleSwitch
                    checked={feat.isEnabled}
                    onChange={(val) => handleFeatureToggle(feat.key, val)}
                    disabled={featureSaving === feat.key}
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── LimitRow ──────────────────────────────────────────────────────────────────

function LimitRow({
  limit, saving, onSave,
}: {
  limit: PlanLimitItem;
  saving: boolean;
  onSave: (val: string) => void;
}) {
  const [val, setVal] = useState(String(limit.value));

  return (
    <div style={{
      display: "grid",
      gridTemplateColumns: "1fr auto auto",
      alignItems: "center",
      gap: "0.5rem",
      padding: "0.5rem 0.75rem",
      borderRadius: 8,
      background: "var(--color-bg-secondary, #f9fafb)",
    }}>
      <div>
        <p style={{ margin: 0, fontSize: "0.9rem", fontWeight: 500 }}>{limit.name}</p>
        {limit.unit && (
          <p style={{ margin: 0, fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
            {limitLabel(limit.value)} {limit.unit}
          </p>
        )}
      </div>
      <input
        type="number"
        value={val}
        onChange={e => setVal(e.target.value)}
        style={{ ...inputStyle, width: 80, textAlign: "center", padding: "0.3rem 0.5rem", margin: 0 }}
        disabled={saving}
      />
      <button
        className="btn btn-primary"
        style={{ padding: "0.3rem 0.75rem", fontSize: "0.8rem" }}
        disabled={saving || val === String(limit.value)}
        onClick={() => onSave(val)}
      >
        {saving ? "..." : "حفظ"}
      </button>
    </div>
  );
}

// ── ToggleSwitch ──────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked, onChange, disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      style={{
        width: 44, height: 24,
        borderRadius: 12,
        border: "none",
        cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "var(--color-primary, #2563eb)" : "#d1d5db",
        position: "relative",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 3, left: checked ? 23 : 3,
        width: 18, height: 18,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
        boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
      }} />
    </button>
  );
}

// ── Shared styles ─────────────────────────────────────────────────────────────

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.85rem",
  fontWeight: 600,
  marginBottom: "0.3rem",
  color: "var(--color-text-secondary)",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: 8,
  border: "1.5px solid var(--color-border, #e5e7eb)",
  fontSize: "0.95rem",
  background: "var(--color-bg)",
  color: "var(--color-text-primary)",
  boxSizing: "border-box",
};

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { user, isLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [plans, setPlans]     = useState<AdminPlanSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [editTarget, setEditTarget]     = useState<AdminPlanDetail | null | undefined>(undefined);
  const [modalOpen, setModalOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState("");

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const data = await adminApi.getPlans();
      setPlans(data);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  async function handleOpenEdit(id: string) {
    setDetailLoading(true);
    setActionError("");
    try {
      const detail = await adminApi.getPlanDetail(id);
      setEditTarget(detail);
      setModalOpen(true);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setDetailLoading(false);
    }
  }

  function handleOpenCreate() {
    setEditTarget(null);
    setModalOpen(true);
  }

  function handleModalClose() {
    setModalOpen(false);
    setEditTarget(undefined as any);
  }

  function handleSaved(updated: AdminPlanDetail) {
    setPlans(prev => {
      const exists = prev.find(p => p.id === updated.id);
      if (exists) return prev.map(p => p.id === updated.id ? updated : p);
      return [...prev, updated];
    });
  }

  async function handleDelete(id: string) {
    setDeleteLoading(true);
    setDeleteError("");
    try {
      await adminApi.deletePlan(id);
      setPlans(prev => prev.filter(p => p.id !== id));
      setDeleteId(null);
    } catch (e) {
      setDeleteError(normalizeError(e));
    } finally {
      setDeleteLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 800, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
                إدارة خطط الاشتراك
              </h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {plans.length} خطة
              </p>
            </div>
            <button
              className="btn btn-primary"
              onClick={handleOpenCreate}
              style={{ flexShrink: 0 }}
            >
              + خطة جديدة
            </button>
          </div>
        </div>

        {/* ── Errors ── */}
        {fetchError  && <InlineBanner message={fetchError} />}
        {actionError && <InlineBanner message={actionError} />}

        {/* ── Loading ── */}
        {fetching && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
            جاري التحميل...
          </div>
        )}

        {/* ── Plans list ── */}
        {!fetching && plans.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
            لا توجد خطط بعد. أنشئ أول خطة!
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {plans.map(plan => (
            <div
              key={plan.id}
              className="form-card"
              style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}
            >
              {/* Info */}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{plan.name}</span>
                  <span className={plan.isActive ? "badge badge-green" : "badge badge-red"}>
                    {plan.isActive ? "نشطة" : "معطلة"}
                  </span>
                  {plan.applicableAccountType && (
                    <span className="badge badge-gray">{plan.applicableAccountType}</span>
                  )}
                </div>
                {plan.description && (
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                    {plan.description}
                  </p>
                )}
                <p style={{ margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                  شهري: {formatPrice(plan.basePriceMonthly)}
                  &nbsp;·&nbsp;
                  سنوي: {formatPrice(plan.basePriceYearly)}
                </p>
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                  disabled={detailLoading}
                  onClick={() => handleOpenEdit(plan.id)}
                >
                  {detailLoading ? "..." : "تعديل"}
                </button>
                <button
                  className="btn"
                  style={{
                    padding: "0.4rem 1rem", fontSize: "0.85rem",
                    border: "1.5px solid var(--color-error)", color: "var(--color-error)",
                    backgroundColor: "transparent",
                  }}
                  onClick={() => { setDeleteId(plan.id); setDeleteError(""); }}
                >
                  حذف
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Delete Confirmation Modal ── */}
      {deleteId && (
        <div
          style={{
            position: "fixed", inset: 0, zIndex: 2000,
            backgroundColor: "rgba(0,0,0,0.45)",
            display: "flex", alignItems: "center", justifyContent: "center",
            padding: "1rem",
          }}
        >
          <div style={{
            background: "var(--color-bg)", borderRadius: 12,
            padding: "2rem", maxWidth: 440, width: "100%",
            boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }}>
            <h3 style={{ margin: "0 0 0.75rem" }}>تأكيد الحذف</h3>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
              سيتم تعطيل هذه الخطة. لا يمكن حذف الخطة إذا كان لها مشتركون نشطون.
            </p>
            {deleteError && (
              <p style={{ color: "var(--color-error)", fontSize: "0.9rem", marginBottom: "1rem" }}>{deleteError}</p>
            )}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                style={{
                  flex: 1, background: "var(--color-error, #dc2626)",
                  borderColor: "var(--color-error, #dc2626)",
                }}
                disabled={deleteLoading}
                onClick={() => handleDelete(deleteId)}
              >
                {deleteLoading ? "جاري الحذف..." : "تأكيد الحذف"}
              </button>
              <button
                className="btn" style={{ flex: 1 }}
                disabled={deleteLoading}
                onClick={() => { setDeleteId(null); setDeleteError(""); }}
              >
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit / Create Modal ── */}
      {modalOpen && (
        <EditPlanModal
          plan={editTarget ?? null}
          onClose={handleModalClose}
          onSaved={(updated) => { handleSaved(updated); }}
        />
      )}
    </div>
  );
}
