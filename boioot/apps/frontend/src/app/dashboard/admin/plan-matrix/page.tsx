"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { PlanMatrixData, MatrixFeatureDef, MatrixPlanCol } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────────

const COL_W    = 108;
const ROW_H    = 40;
const LABEL_W  = 220;

const FEATURE_GROUP_LABELS: Record<string, string> = {
  marketing:     "📢 التسويق والظهور",
  content:       "🏠 محتوى الإعلان",
  business:      "📊 إدارة الأعمال",
  communication: "💬 التواصل",
  support:       "🛠 الدعم الفني",
};

const AUDIENCE_AR: Record<string, string> = {
  seeker:  "باحث",
  owner:   "مالك",
  broker:  "وسيط",
  office:  "مكتب",
  company: "شركة",
};

const AUDIENCE_COLORS: Record<string, { bg: string; text: string }> = {
  seeker:  { bg: "rgba(37,99,235,0.25)",  text: "#93c5fd" },
  owner:   { bg: "rgba(22,163,74,0.25)",  text: "#86efac" },
  broker:  { bg: "rgba(234,88,12,0.25)",  text: "#fdba74" },
  office:  { bg: "rgba(124,58,237,0.25)", text: "#c4b5fd" },
  company: { bg: "rgba(220,38,38,0.25)",  text: "#fca5a5" },
};

const TIER_AR: Record<string, string> = {
  free:       "مجاني",
  basic:      "أساسي",
  advanced:   "متقدم",
  enterprise: "مؤسسي",
};

const TIER_COLORS: Record<string, { bg: string; text: string }> = {
  free:       { bg: "rgba(107,114,128,0.2)",  text: "rgba(255,255,255,0.4)" },
  basic:      { bg: "rgba(37,99,235,0.15)",   text: "#93c5fd" },
  advanced:   { bg: "rgba(99,102,241,0.2)",   text: "#a5b4fc" },
  enterprise: { bg: "rgba(167,139,250,0.2)",  text: "#c4b5fd" },
};

function groupLabel(key?: string) {
  if (!key) return "ميزات";
  return FEATURE_GROUP_LABELS[key] ?? key;
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, padding: "0.65rem 1.4rem", borderRadius: 10,
      background: type === "ok" ? "#14532d" : "#7f1d1d",
      color: "#fff", fontWeight: 600, fontSize: "0.88rem",
      boxShadow: "0 4px 24px rgba(0,0,0,0.45)", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

// ── Feature cell (boolean toggle) ────────────────────────────────────────────

function FeatureCell({
  planId, featureKey, enabled, saving,
  onToggle,
}: {
  planId: string; featureKey: string; enabled: boolean; saving: boolean;
  onToggle: (planId: string, key: string, val: boolean) => void;
}) {
  return (
    <td style={{
      width: COL_W, minWidth: COL_W, maxWidth: COL_W,
      height: ROW_H, textAlign: "center", verticalAlign: "middle",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      borderLeft: "1px solid rgba(255,255,255,0.04)",
      padding: 0,
      background: enabled ? "rgba(52,211,153,0.05)" : undefined,
    }}>
      <button
        onClick={() => !saving && onToggle(planId, featureKey, !enabled)}
        disabled={saving}
        style={{
          width: "100%", height: "100%",
          background: "none", border: "none", cursor: saving ? "wait" : "pointer",
          display: "flex", alignItems: "center", justifyContent: "center",
          transition: "background 0.15s",
        }}
        title={enabled ? "مفعّلة — انقر للإلغاء" : "معطّلة — انقر للتفعيل"}
      >
        {saving ? (
          <span style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>…</span>
        ) : (
          <span style={{
            display: "inline-flex", alignItems: "center", justifyContent: "center",
            width: 24, height: 24, borderRadius: "50%", fontSize: 13, fontWeight: 700,
            background: enabled ? "rgba(52,211,153,0.18)" : "rgba(255,255,255,0.06)",
            color: enabled ? "#34d399" : "rgba(255,255,255,0.25)",
            border: `1.5px solid ${enabled ? "rgba(52,211,153,0.4)" : "rgba(255,255,255,0.1)"}`,
          }}>
            {enabled ? "✓" : "✗"}
          </span>
        )}
      </button>
    </td>
  );
}

// ── Limit cell (number input) ─────────────────────────────────────────────────

function LimitCell({
  planId, limitKey, value, saving,
  onSave,
}: {
  planId: string; limitKey: string; value: number; saving: boolean;
  onSave: (planId: string, key: string, val: number) => void;
}) {
  const [local, setLocal] = useState(String(value === -1 ? -1 : value));
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => { setLocal(String(value)); }, [value]);

  function commit(raw: string) {
    const n = parseInt(raw, 10);
    if (isNaN(n)) return;
    if (n === value) return;
    onSave(planId, limitKey, n);
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    setLocal(e.target.value);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => commit(e.target.value), 700);
  }

  const isUnlimited = value === -1;

  return (
    <td style={{
      width: COL_W, minWidth: COL_W, maxWidth: COL_W,
      height: ROW_H, textAlign: "center", verticalAlign: "middle",
      borderBottom: "1px solid rgba(255,255,255,0.04)",
      borderLeft: "1px solid rgba(255,255,255,0.04)",
      padding: "0 6px",
      background: isUnlimited ? "rgba(99,102,241,0.05)" : undefined,
    }}>
      {saving ? (
        <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>…</span>
      ) : (
        <input
          type="number"
          dir="ltr"
          value={local}
          onChange={handleChange}
          onBlur={e => { clearTimeout(timerRef.current); commit(e.target.value); }}
          onKeyDown={e => { if (e.key === "Enter") { clearTimeout(timerRef.current); commit(local); } }}
          min={-1}
          style={{
            width: "100%", background: "none", border: "none", outline: "none",
            textAlign: "center", color: isUnlimited ? "#818cf8" : "rgba(255,255,255,0.85)",
            fontSize: 13, fontWeight: isUnlimited ? 700 : 400,
            fontFamily: "monospace",
          }}
          title={isUnlimited ? "∞ غير محدود" : undefined}
        />
      )}
    </td>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function PlanMatrixPage() {
  useProtectedRoute({ allowedRoles: ["Admin"] });

  const [data, setData]         = useState<PlanMatrixData | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [toast, setToast]       = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  // Saving states: "planId:featureKey" or "planId:limitKey"
  const [saving, setSaving]     = useState<Set<string>>(new Set());
  const [showInactive, setShowInactive] = useState(false);

  function showToast(msg: string, type: "ok" | "err") {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await adminApi.getPlanMatrix();
      setData(d);
      setError("");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleFeatureToggle(planId: string, featureKey: string, newVal: boolean) {
    if (!data) return;
    const cellKey = `${planId}:${featureKey}`;
    const prevVal = data.plans.find(p => p.planId === planId)?.featureValues[featureKey] ?? false;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map(p =>
          p.planId === planId
            ? { ...p, featureValues: { ...p.featureValues, [featureKey]: newVal } }
            : p
        ),
      };
    });

    setSaving(prev => new Set(prev).add(cellKey));
    try {
      await adminApi.setPlanFeature(planId, featureKey, newVal);
    } catch (e) {
      // Rollback
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          plans: prev.plans.map(p =>
            p.planId === planId
              ? { ...p, featureValues: { ...p.featureValues, [featureKey]: prevVal } }
              : p
          ),
        };
      });
      showToast(normalizeError(e), "err");
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(cellKey); return s; });
    }
  }

  async function handleLimitSave(planId: string, limitKey: string, newVal: number) {
    if (!data) return;
    const cellKey = `${planId}:${limitKey}`;
    const prevVal = data.plans.find(p => p.planId === planId)?.limitValues[limitKey] ?? 0;

    // Optimistic update
    setData(prev => {
      if (!prev) return prev;
      return {
        ...prev,
        plans: prev.plans.map(p =>
          p.planId === planId
            ? { ...p, limitValues: { ...p.limitValues, [limitKey]: newVal } }
            : p
        ),
      };
    });

    setSaving(prev => new Set(prev).add(cellKey));
    try {
      await adminApi.setPlanLimit(planId, limitKey, newVal);
    } catch (e) {
      // Rollback
      setData(prev => {
        if (!prev) return prev;
        return {
          ...prev,
          plans: prev.plans.map(p =>
            p.planId === planId
              ? { ...p, limitValues: { ...p.limitValues, [limitKey]: prevVal } }
              : p
          ),
        };
      });
      showToast(normalizeError(e), "err");
    } finally {
      setSaving(prev => { const s = new Set(prev); s.delete(cellKey); return s; });
    }
  }

  if (loading) {
    return (
      <div style={{ minHeight: "60vh", display: "flex", alignItems: "center", justifyContent: "center", color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
        جاري تحميل مصفوفة الخطط…
      </div>
    );
  }

  if (error || !data) {
    return (
      <div style={{ padding: 32, color: "#f87171", fontSize: 14 }}>
        {error || "تعذّر تحميل البيانات"}
      </div>
    );
  }

  const visiblePlans = showInactive ? data.plans : data.plans.filter(p => p.isActive);

  // Group features by featureGroup
  const featureGroups = data.featureDefs.reduce<Record<string, MatrixFeatureDef[]>>((acc, f) => {
    const k = f.featureGroup ?? "other";
    if (!acc[k]) acc[k] = [];
    acc[k].push(f);
    return acc;
  }, {});

  const totalCols = visiblePlans.length + 1; // +1 for label column
  const totalW    = LABEL_W + visiblePlans.length * COL_W;

  // Shared styles
  const thPlan: React.CSSProperties = {
    width: COL_W, minWidth: COL_W, maxWidth: COL_W,
    padding: "8px 4px", textAlign: "center",
    fontSize: 11, fontWeight: 700,
    background: "rgba(255,255,255,0.03)",
    borderLeft: "1px solid rgba(255,255,255,0.06)",
    position: "sticky", top: 0, zIndex: 10,
    verticalAlign: "bottom",
  };

  const groupRowStyle: React.CSSProperties = {
    background: "rgba(167,139,250,0.07)",
    fontSize: 11, fontWeight: 700,
    color: "#a78bfa", letterSpacing: "0.04em",
    borderBottom: "1px solid rgba(167,139,250,0.12)",
  };

  const labelCellStyle: React.CSSProperties = {
    width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W,
    padding: "0 14px 0 8px", textAlign: "right", fontSize: 12,
    color: "rgba(255,255,255,0.75)", height: ROW_H,
    borderBottom: "1px solid rgba(255,255,255,0.04)",
    position: "sticky", left: 0, zIndex: 5,
    background: "#12122a",
    whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
  };

  function planColStyle(plan: MatrixPlanCol): React.CSSProperties {
    return {
      ...thPlan,
      color: plan.isActive ? "rgba(255,255,255,0.85)" : "rgba(255,255,255,0.35)",
      borderTop: plan.isRecommended ? "2px solid #a78bfa" : "1px solid rgba(255,255,255,0.06)",
    };
  }

  function formatPrice(n: number) {
    if (n === 0) return "مجاني";
    return `${n.toLocaleString("ar-SY")} ل.س`;
  }

  return (
    <div dir="rtl" style={{ padding: "1.5rem 1.5rem 4rem", fontFamily: "inherit" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <DashboardBackLink href="/dashboard/admin/plans" label="العودة إلى الخطط" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.3rem", fontWeight: 800, color: "#fff" }}>
            📊 مصفوفة الخطط والميزات
          </h1>
          <p style={{ margin: "4px 0 0", fontSize: 12, color: "rgba(255,255,255,0.4)" }}>
            {data.featureDefs.length} ميزة × {visiblePlans.length} خطة — انقر أي خلية للتعديل الفوري
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "rgba(255,255,255,0.55)", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={showInactive}
              onChange={e => setShowInactive(e.target.checked)}
            />
            إظهار الخطط غير النشطة
          </label>
          <button
            onClick={load}
            style={{
              background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.65)",
              border: "1px solid rgba(255,255,255,0.12)", borderRadius: 7,
              padding: "6px 14px", fontSize: 12, cursor: "pointer",
            }}>
            ↺ تحديث
          </button>
        </div>
      </div>

      {/* Legend */}
      <div style={{ display: "flex", gap: 16, marginBottom: "1rem", flexWrap: "wrap" }}>
        {[
          { color: "#34d399", bg: "rgba(52,211,153,0.12)", label: "✓ مفعّلة" },
          { color: "rgba(255,255,255,0.25)", bg: "rgba(255,255,255,0.04)", label: "✗ معطّلة" },
          { color: "#818cf8", bg: "rgba(99,102,241,0.1)", label: "∞ غير محدود (-1)" },
        ].map(l => (
          <span
            key={l.label}
            style={{ fontSize: 11, padding: "2px 8px", borderRadius: 4, background: l.bg, color: l.color }}>
            {l.label}
          </span>
        ))}
        <span style={{ fontSize: 11, color: "rgba(255,255,255,0.3)", marginRight: 4 }}>
          ← الحدود العددية: اكتب القيمة أو اضغط Enter للحفظ ، -1 = غير محدود
        </span>
      </div>

      {/* Matrix Table */}
      <div style={{
        overflowX: "auto", overflowY: "auto",
        maxHeight: "calc(100vh - 240px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 12,
        background: "#12122a",
      }}>
        <table style={{
          borderCollapse: "collapse",
          width: totalW,
          minWidth: totalW,
          tableLayout: "fixed",
        }}>
          <thead>
            {/* Plan names row */}
            <tr>
              {/* Sticky corner */}
              <th style={{
                width: LABEL_W, minWidth: LABEL_W, maxWidth: LABEL_W,
                padding: "10px 14px", textAlign: "right",
                background: "#12122a",
                fontSize: 11, fontWeight: 700, color: "rgba(255,255,255,0.35)",
                letterSpacing: "0.05em",
                position: "sticky", top: 0, left: 0, zIndex: 20,
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                borderLeft: "1px solid rgba(255,255,255,0.06)",
              }}>
                الميزة / الخطة
              </th>
              {/* Plan columns */}
              {visiblePlans.map(plan => (
                <th key={plan.planId} style={planColStyle(plan)}>
                  {plan.isRecommended && (
                    <div style={{ fontSize: 9, color: "#a78bfa", marginBottom: 2, letterSpacing: "0.05em" }}>
                      ★ مميّزة
                    </div>
                  )}
                  {!plan.isActive && (
                    <div style={{ fontSize: 9, color: "#f87171", marginBottom: 2 }}>
                      ● غير نشط
                    </div>
                  )}
                  <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {plan.displayNameAr ?? plan.planName}
                  </div>
                  {plan.code && (
                    <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", marginBottom: 2 }}>
                      {plan.code}
                    </div>
                  )}
                  {plan.audienceType && (
                    <div style={{ fontSize: 8, marginBottom: 2, display: "flex", gap: 2, justifyContent: "center", flexWrap: "wrap" }}>
                      <span style={{
                        padding: "1px 4px", borderRadius: 4, fontWeight: 600,
                        background: AUDIENCE_COLORS[plan.audienceType]?.bg ?? "rgba(255,255,255,0.1)",
                        color: AUDIENCE_COLORS[plan.audienceType]?.text ?? "#fff",
                      }}>
                        {AUDIENCE_AR[plan.audienceType] ?? plan.audienceType}
                      </span>
                      {plan.tier && (
                        <span style={{
                          padding: "1px 4px", borderRadius: 4, fontWeight: 600,
                          background: TIER_COLORS[plan.tier]?.bg ?? "rgba(255,255,255,0.08)",
                          color: TIER_COLORS[plan.tier]?.text ?? "rgba(255,255,255,0.5)",
                        }}>
                          {TIER_AR[plan.tier] ?? plan.tier}
                        </span>
                      )}
                    </div>
                  )}
                  <div style={{ fontSize: 10, color: "#6ee7b7", fontWeight: 600 }}>
                    {formatPrice(plan.priceMonthly)}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {/* ── Features section ── */}
            {Object.entries(featureGroups).map(([groupKey, feats]) => (
              <>
                {/* Group header */}
                <tr key={`g-${groupKey}`}>
                  <td
                    colSpan={totalCols}
                    style={{
                      ...groupRowStyle,
                      padding: "5px 14px",
                      position: "sticky", left: 0,
                    }}>
                    {groupLabel(groupKey)}
                  </td>
                </tr>
                {/* Feature rows */}
                {feats.map(feat => (
                  <tr key={feat.key} style={{ height: ROW_H }}>
                    {/* Label */}
                    <td style={labelCellStyle}>
                      <span style={{ marginLeft: 6 }}>{feat.icon ?? "•"}</span>
                      {feat.name}
                      {feat.isSystem && (
                        <span style={{ marginRight: 5, fontSize: 9, color: "rgba(234,179,8,0.7)" }}>🔒</span>
                      )}
                    </td>
                    {/* Feature cells */}
                    {visiblePlans.map(plan => (
                      <FeatureCell
                        key={plan.planId}
                        planId={plan.planId}
                        featureKey={feat.key}
                        enabled={plan.featureValues[feat.key] ?? false}
                        saving={saving.has(`${plan.planId}:${feat.key}`)}
                        onToggle={handleFeatureToggle}
                      />
                    ))}
                  </tr>
                ))}
              </>
            ))}

            {/* ── Separator ── */}
            {data.limitDefs.length > 0 && (
              <tr>
                <td
                  colSpan={totalCols}
                  style={{
                    ...groupRowStyle,
                    color: "#2dd4bf",
                    background: "rgba(45,212,191,0.06)",
                    borderBottom: "1px solid rgba(45,212,191,0.15)",
                    padding: "5px 14px",
                    position: "sticky", left: 0,
                  }}>
                  🔢 الحدود العددية
                </td>
              </tr>
            )}

            {/* ── Limit rows ── */}
            {data.limitDefs.map(ld => (
              <tr key={ld.key} style={{ height: ROW_H }}>
                <td style={{ ...labelCellStyle, color: "#2dd4bf" }}>
                  <span style={{ marginLeft: 6, color: "rgba(255,255,255,0.4)" }}>
                    {ld.unit ? `[${ld.unit}]` : "#"}
                  </span>
                  {ld.name}
                </td>
                {visiblePlans.map(plan => (
                  <LimitCell
                    key={plan.planId}
                    planId={plan.planId}
                    limitKey={ld.key}
                    value={plan.limitValues[ld.key] ?? 0}
                    saving={saving.has(`${plan.planId}:${ld.key}`)}
                    onSave={handleLimitSave}
                  />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer summary */}
      <div style={{ marginTop: "1rem", fontSize: 11, color: "rgba(255,255,255,0.25)", textAlign: "left", direction: "ltr" }}>
        {data.plans.length} plans total • {data.plans.filter(p => p.isActive).length} active •{" "}
        {data.featureDefs.length} features • {data.limitDefs.length} limits
      </div>
    </div>
  );
}
