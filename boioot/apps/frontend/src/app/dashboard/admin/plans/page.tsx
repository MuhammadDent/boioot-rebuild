"use client";

import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { AdminPlanSummary, AdminPlanDetail, AdminPlanPricingEntry, PlanLimitItem, PlanFeatureItem } from "@/types";

// ── Toast ─────────────────────────────────────────────────────────────────────
function Toast({ msg, type }: { msg: string; type: "ok" | "err" }) {
  return (
    <div style={{
      position: "fixed", bottom: "1.5rem", left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, padding: "0.75rem 1.5rem", borderRadius: 10,
      background: type === "ok" ? "#166534" : "#991b1b",
      color: "#fff", fontWeight: 600, fontSize: "0.9rem",
      boxShadow: "0 4px 20px rgba(0,0,0,0.25)", whiteSpace: "nowrap",
    }}>
      {msg}
    </div>
  );
}

// ── Feature group labels ───────────────────────────────────────────────────────

const FEATURE_GROUP_LABELS: Record<string, string> = {
  marketing:     "📢 التسويق والظهور",
  content:       "🏠 محتوى الإعلان",
  business:      "📊 إدارة الأعمال",
  communication: "💬 التواصل",
  support:       "🛠 الدعم الفني",
  // legacy keys kept for backward compatibility
  analytics:     "📊 إدارة الأعمال",
  listing:       "🏠 محتوى الإعلان",
  media:         "🏠 محتوى الإعلان",
  team:          "📊 إدارة الأعمال",
  projects:      "📊 إدارة الأعمال",
  general:       "عام",
};

function featureGroupLabel(raw?: string): string {
  if (!raw) return "عام";
  return FEATURE_GROUP_LABELS[raw] ?? raw;
}

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
  background: "#ffffff", color: "var(--color-text-primary)", boxSizing: "border-box",
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

// ── CollapsibleSection ─────────────────────────────────────────────────────────

function CollapsibleSection({
  title,
  icon,
  count,
  accent,
  defaultOpen = true,
  children,
}: {
  title: string;
  icon: string;
  count?: number;
  accent?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 10, marginBottom: "0.75rem", overflow: "hidden" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0.75rem 1rem",
          background: open ? "#f0f7ff" : "#f8fafc",
          border: "none",
          borderBottom: open ? "1px solid var(--color-border, #e5e7eb)" : "none",
          cursor: "pointer",
          fontSize: "0.82rem",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          transition: "background 0.15s",
        }}
      >
        <span style={{ fontSize: "0.72rem", color: "var(--color-text-secondary)", display: "flex", alignItems: "center", gap: "0.35rem" }}>
          {open ? "▲" : "▼"}
          {count !== undefined && (
            <span style={{ background: accent ?? "var(--color-primary, #2563eb)", color: "#fff", borderRadius: 20, padding: "0 0.45rem", fontSize: "0.68rem", fontWeight: 700, lineHeight: "1.5" }}>
              {count}
            </span>
          )}
        </span>
        <span style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <span>{title}</span>
          <span style={{ fontSize: "1rem" }}>{icon}</span>
        </span>
      </button>
      {open && (
        <div style={{ padding: "1rem" }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ── PlanPreviewCard ─────────────────────────────────────────────────────────────

function PlanPreviewCard({
  name,
  badgeText,
  planColor,
  isRecommended,
  planCategory,
  basePriceMonthly,
  enabledFeatures,
  limits,
}: {
  name: string;
  badgeText: string;
  planColor: string;
  isRecommended: boolean;
  planCategory: string;
  basePriceMonthly: string;
  enabledFeatures: PlanFeatureItem[];
  limits?: PlanLimitItem[];
}) {
  const accent = planColor.trim() || "#2e7d32";
  const price  = parseFloat(basePriceMonthly);

  // Limit helpers
  const lv = (key: string) => limits?.find(l => l.key === key)?.value ?? 0;
  const lbl = (val: number, unit: string) => val === 0 ? null : val === -1 ? `∞ ${unit}` : `${val} ${unit}`;

  const listingChip  = lbl(lv("max_active_listings"),     "إعلان");
  const imagesChip   = lbl(lv("max_images_per_listing"),  "صورة");
  const featuredChip = lbl(lv("max_featured_slots"),       "مميز");
  const agentsChip   = lbl(lv("max_agents"),               "وسيط");
  const limitsChips  = [listingChip, imagesChip, agentsChip, featuredChip].filter(Boolean) as string[];

  // Show ALL features with ✔ / ✗
  const allFeatures = enabledFeatures.slice(0, 8);

  return (
    <div style={{ border: `2px solid ${accent}`, borderRadius: 14, padding: "1.25rem", background: "#fff", maxWidth: 270, margin: "0 auto", position: "relative", fontFamily: "inherit" }}>
      {isRecommended && (
        <div style={{ position: "absolute", top: -14, right: 16, background: accent, color: "#fff", padding: "0.2rem 0.8rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, whiteSpace: "nowrap" }}>
          ⭐ موصى بها
        </div>
      )}
      {badgeText.trim() && (
        <div style={{ background: accent + "22", color: accent, padding: "0.2rem 0.65rem", borderRadius: 20, fontSize: "0.72rem", fontWeight: 700, display: "inline-block", marginBottom: "0.5rem" }}>
          {badgeText}
        </div>
      )}
      <h3 style={{ margin: "0 0 0.2rem", fontSize: "1.1rem", fontWeight: 800 }}>{name || "اسم الباقة"}</h3>
      {planCategory && (
        <p style={{ margin: "0 0 0.5rem", fontSize: "0.75rem", color: "#888" }}>
          {planCategory === "Individual" ? "للأفراد" : planCategory === "Business" ? "للأعمال" : planCategory}
        </p>
      )}
      <p style={{ margin: "0 0 0.6rem", fontSize: "1.25rem", fontWeight: 800, color: accent }}>
        {price === 0 ? "مجاني" : `${price.toLocaleString("ar-SY")} ل.س / شهر`}
      </p>

      {/* ── Limit chips ── */}
      {limitsChips.length > 0 && (
        <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap", marginBottom: "0.75rem" }}>
          {limitsChips.map(chip => (
            <span key={chip} style={{ background: accent + "18", color: accent, borderRadius: 20, padding: "0.15rem 0.6rem", fontSize: "0.72rem", fontWeight: 700 }}>
              {chip}
            </span>
          ))}
        </div>
      )}

      {/* ── Features with ✔ / ✗ ── */}
      {allFeatures.length > 0 ? (
        <ul style={{ margin: "0 0 0.8rem", padding: 0, listStyle: "none" }}>
          {allFeatures.map(f => (
            <li key={f.key} style={{ fontSize: "0.8rem", padding: "0.2rem 0", display: "flex", gap: "0.45rem", alignItems: "center", color: f.isEnabled ? "#1e293b" : "#94a3b8" }}>
              <span style={{ fontWeight: 700, fontSize: "0.75rem", flexShrink: 0, color: f.isEnabled ? "#059669" : "#cbd5e1" }}>
                {f.isEnabled ? "✔" : "✗"}
              </span>
              <span style={{ textDecoration: f.isEnabled ? "none" : "none" }}>{f.icon ? `${f.icon} ` : ""}{f.name}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p style={{ fontSize: "0.8rem", color: "#bbb", marginBottom: "0.8rem" }}>لا توجد ميزات مضافة بعد</p>
      )}

      <div style={{ background: accent, color: "#fff", borderRadius: 8, padding: "0.5rem", textAlign: "center", fontSize: "0.82rem", fontWeight: 600 }}>
        اشترك الآن
      </div>
    </div>
  );
}

// ── PlanComparisonTable ─────────────────────────────────────────────────────────

function limitCell(val: number) {
  if (val === 0) return { text: "✗", color: "#cbd5e1", weight: 400 };
  if (val === -1) return { text: "∞", color: "#059669", weight: 700 };
  return { text: String(val), color: "#1e293b", weight: 600 };
}

function boolCell(v: boolean) {
  return v
    ? { text: "✔", color: "#059669", weight: 700 }
    : { text: "✗", color: "#cbd5e1", weight: 400 };
}

function PlanComparisonTable({ plans }: { plans: AdminPlanSummary[] }) {
  const active = plans.filter(p => p.isActive && p.isPublic).sort((a, b) => a.displayOrder - b.displayOrder);
  if (active.length === 0) return null;

  type Row = { label: string; icon: string; cell: (p: AdminPlanSummary) => { text: string; color: string; weight: number } };
  const ROWS: Row[] = [
    { label: "الإعلانات النشطة",     icon: "🏠", cell: p => limitCell(p.listingsLimit) },
    { label: "صور لكل إعلان",        icon: "📸", cell: p => limitCell(p.imagesPerListing) },
    { label: "الوسطاء",               icon: "👤", cell: p => limitCell(p.agentsLimit) },
    { label: "المشاريع",              icon: "🏗", cell: p => limitCell(p.projectsLimit) },
    { label: "إعلانات مميزة (Boost)", icon: "⭐", cell: p => limitCell(p.featuredSlots) },
    { label: "لوحة التحليلات",        icon: "📊", cell: p => boolCell(p.hasAnalytics) },
    { label: "الإعلانات المميزة",     icon: "✨", cell: p => boolCell(p.hasFeaturedListings) },
    { label: "إدارة المشاريع",        icon: "🏗", cell: p => boolCell(p.hasProjectMgmt) },
    { label: "تواصل واتساب",         icon: "💬", cell: p => boolCell(p.hasWhatsApp) },
    { label: "شارة موثق",            icon: "✅", cell: p => boolCell(p.hasVerifiedBadge) },
    { label: "دعم فني أولوية",       icon: "🛠", cell: p => boolCell(p.hasPrioritySupport) },
  ];

  const thBase: React.CSSProperties = { padding: "0.55rem 0.85rem", fontWeight: 700, fontSize: "0.78rem", color: "#475569", borderBottom: "2px solid #e2e8f0", textAlign: "center", whiteSpace: "nowrap" };
  const tdLabel: React.CSSProperties = { padding: "0.5rem 0.85rem", fontSize: "0.82rem", color: "#334155", borderBottom: "1px solid #f1f5f9", textAlign: "right", whiteSpace: "nowrap" };
  const tdCell: React.CSSProperties = { padding: "0.5rem 0.85rem", textAlign: "center", borderBottom: "1px solid #f1f5f9" };

  return (
    <div style={{ backgroundColor: "#fff", border: "1px solid #e8ecf0", borderRadius: 14, overflow: "hidden", marginTop: "1.5rem", boxShadow: "0 1px 4px rgba(0,0,0,0.04)" }}>
      <div style={{ padding: "0.9rem 1.1rem", borderBottom: "1px solid #e8ecf0", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <span style={{ fontWeight: 700, fontSize: "0.9rem", color: "#1e293b" }}>مقارنة الخطط</span>
          <span style={{ fontSize: "0.75rem", color: "#94a3b8", marginRight: "0.6rem" }}>الخطط العامة النشطة فقط</span>
        </div>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 480 }}>
          <thead>
            <tr style={{ backgroundColor: "#f8fafc" }}>
              <th style={{ ...thBase, textAlign: "right", minWidth: 160 }}>المزايا والحدود</th>
              {active.map(p => (
                <th key={p.id} style={{ ...thBase, minWidth: 110 }}>
                  {p.planColor && <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: "50%", background: p.planColor, marginLeft: "0.3rem", verticalAlign: "middle" }} />}
                  {p.name}
                  {p.isRecommended && <div style={{ fontSize: "0.62rem", color: "#d97706", fontWeight: 700 }}>⭐ موصى بها</div>}
                  <div style={{ fontSize: "0.7rem", color: p.planColor || "#2563eb", fontWeight: 700, marginTop: "0.1rem" }}>
                    {p.basePriceMonthly === 0 ? "مجاني" : `${p.basePriceMonthly.toLocaleString("ar-SY")} ل.س`}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ROWS.map((row, i) => (
              <tr key={i} style={{ backgroundColor: i % 2 === 0 ? "#ffffff" : "#fafafa" }}>
                <td style={tdLabel}>
                  <span style={{ marginLeft: "0.35rem" }}>{row.icon}</span>{row.label}
                </td>
                {active.map(p => {
                  const c = row.cell(p);
                  return (
                    <td key={p.id} style={tdCell}>
                      <span style={{ fontWeight: c.weight, color: c.color, fontSize: c.text === "✔" || c.text === "✗" ? "1rem" : "0.88rem" }}>
                        {c.text}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
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

  const [name, setName]                           = useState(plan?.name ?? "");
  const [description, setDescription]             = useState(plan?.description ?? "");
  const [applicableAccountType, setApplicableAccountType] = useState(plan?.applicableAccountType ?? "");
  const [priceMonthly, setPriceMonthly]           = useState(String(plan?.basePriceMonthly ?? 0));
  const [priceYearly, setPriceYearly]             = useState(String(plan?.basePriceYearly ?? 0));
  const [isActive, setIsActive]                   = useState(plan?.isActive ?? true);
  const [isPublic, setIsPublic]                   = useState(plan?.isPublic ?? true);
  const [isRecommended, setIsRecommended]         = useState(plan?.isRecommended ?? false);
  const [displayOrder, setDisplayOrder]           = useState(String(plan?.displayOrder ?? 0));
  const [billingMode, setBillingMode]             = useState(plan?.billingMode ?? "InternalOnly");
  const [planCategory, setPlanCategory]           = useState(plan?.planCategory ?? "");
  const [badgeText, setBadgeText]                 = useState(plan?.badgeText ?? "");
  const [planColor, setPlanColor]                 = useState(plan?.planColor ?? "");

  const [limits, setLimits]     = useState<PlanLimitItem[]>(plan?.limits ?? []);
  const [features, setFeatures] = useState<PlanFeatureItem[]>(plan?.features ?? []);

  // ── Trial ──────────────────────────────────────────────────────────────────
  const [hasTrial, setHasTrial]                           = useState(plan?.hasTrial ?? false);
  const [trialDays, setTrialDays]                         = useState(String(plan?.trialDays ?? 0));
  const [requiresPaymentForTrial, setRequiresPaymentForTrial] = useState(plan?.requiresPaymentForTrial ?? false);

  // ── Business Rules ─────────────────────────────────────────────────────────
  const [isDefaultForNewUsers, setIsDefaultForNewUsers]   = useState(plan?.isDefaultForNewUsers ?? false);
  const [availableForSelfSignup, setAvailableForSelfSignup] = useState(plan?.availableForSelfSignup ?? true);
  const [requiresAdminApproval, setRequiresAdminApproval] = useState(plan?.requiresAdminApproval ?? false);
  const [allowAddOns, setAllowAddOns]                     = useState(plan?.allowAddOns ?? false);
  const [allowUpgrade, setAllowUpgrade]                   = useState(plan?.allowUpgrade ?? true);
  const [allowDowngrade, setAllowDowngrade]               = useState(plan?.allowDowngrade ?? true);
  const [autoDowngradeOnExpiry, setAutoDowngradeOnExpiry] = useState(plan?.autoDowngradeOnExpiry ?? true);

  const [pricing, setPricing]               = useState<AdminPlanPricingEntry[]>([]);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [showAddPricing, setShowAddPricing] = useState(false);

  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [limitSaving, setLimitSaving]     = useState<string | null>(null);
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
          name:                   name.trim(),
          description:            description.trim() || undefined,
          basePriceMonthly:       parseFloat(priceMonthly) || 0,
          basePriceYearly:        parseFloat(priceYearly)  || 0,
          applicableAccountType:  applicableAccountType || undefined,
          planCategory:           planCategory || undefined,
          billingMode,
          badgeText:              badgeText.trim() || undefined,
          planColor:              planColor.trim() || undefined,
          hasTrial,
          trialDays:              hasTrial ? (parseInt(trialDays) || 0) : 0,
          requiresPaymentForTrial: hasTrial ? requiresPaymentForTrial : false,
          isDefaultForNewUsers,
          availableForSelfSignup,
          requiresAdminApproval,
          allowAddOns,
          allowUpgrade,
          allowDowngrade,
          autoDowngradeOnExpiry,
        });
      } else {
        result = await adminApi.updatePlan(plan!.id, {
          name:                   name.trim(),
          description:            description.trim() || undefined,
          basePriceMonthly:       parseFloat(priceMonthly) || 0,
          basePriceYearly:        parseFloat(priceYearly)  || 0,
          isActive,
          applicableAccountType:  applicableAccountType || undefined,
          displayOrder:           parseInt(displayOrder) || 0,
          isPublic,
          isRecommended,
          planCategory:           planCategory || undefined,
          billingMode,
          badgeText:              badgeText.trim() || undefined,
          planColor:              planColor.trim() || undefined,
          hasTrial,
          trialDays:               hasTrial ? (parseInt(trialDays) || 0) : 0,
          requiresPaymentForTrial: hasTrial ? requiresPaymentForTrial : false,
          isDefaultForNewUsers,
          availableForSelfSignup,
          requiresAdminApproval,
          allowAddOns,
          allowUpgrade,
          allowDowngrade,
          autoDowngradeOnExpiry,
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
    const val = parseInt(rawVal, 10);
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

  const featureGroups = features.reduce<Record<string, PlanFeatureItem[]>>((acc, feat) => {
    const grp = featureGroupLabel(feat.featureGroup);
    if (!acc[grp]) acc[grp] = [];
    acc[grp].push(feat);
    return acc;
  }, {});

  const enabledCount = features.filter(f => f.isEnabled).length;

  const modalContent = (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 3000, backgroundColor: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ backgroundColor: "#ffffff", borderRadius: 14, width: "100%", maxWidth: 780, maxHeight: "90vh", display: "flex", flexDirection: "column", boxShadow: "0 8px 40px rgba(0,0,0,0.22)", overflow: "hidden" }}>

        {/* ── Sticky Header ── */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.1rem 1.5rem", borderBottom: "1px solid var(--color-border, #e5e7eb)", flexShrink: 0, backgroundColor: "#ffffff" }}>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", fontSize: "1.4rem", cursor: "pointer", lineHeight: 1, color: "var(--color-text-secondary)", padding: "0.15rem 0.5rem", borderRadius: 6 }}
          >
            ×
          </button>
          <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700 }}>
            {isNew ? "✦ إنشاء خطة جديدة" : `تعديل: ${plan!.name}`}
          </h2>
        </div>

        {/* ── Scrollable Body ── */}
        <div style={{ overflowY: "auto", flex: 1, padding: "1.25rem 1.5rem" }}>

          {error && (
            <div style={{ background: "#fef2f2", color: "var(--color-error)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSavePlan}>

            {/* ── Section 1: Basic Info ── */}
            <CollapsibleSection title="المعلومات الأساسية" icon="📋" defaultOpen={true}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>اسم الخطة *</label>
                  <input
                    required
                    value={name}
                    onChange={e => setName(e.target.value)}
                    style={inputStyle}
                    placeholder="مثال: AgentPro"
                  />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label style={labelStyle}>الوصف</label>
                  <textarea
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
                    placeholder="وصف مختصر للخطة..."
                  />
                </div>
                <div>
                  <label style={labelStyle}>نوع الحساب المستهدف</label>
                  <select
                    value={applicableAccountType}
                    onChange={e => setApplicableAccountType(e.target.value)}
                    style={selectStyle}
                  >
                    <option value="">— للجميع —</option>
                    <option value="Individual">فرد (Individual)</option>
                    <option value="Office">مكتب (Office)</option>
                    <option value="Company">شركة (Company)</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>فئة الخطة</label>
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
                <div>
                  <label style={labelStyle}>نص الشارة (Badge)</label>
                  <input
                    value={badgeText}
                    onChange={e => setBadgeText(e.target.value)}
                    style={inputStyle}
                    placeholder="مثال: الأكثر مبيعاً"
                    maxLength={80}
                  />
                </div>
                <div>
                  <label style={labelStyle}>لون الخطة</label>
                  <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                    <input
                      type="color"
                      value={planColor || "#2e7d32"}
                      onChange={e => setPlanColor(e.target.value)}
                      style={{ width: 44, height: 36, borderRadius: 6, border: "1.5px solid var(--color-border, #e5e7eb)", cursor: "pointer", padding: 2, flexShrink: 0 }}
                    />
                    <input
                      value={planColor}
                      onChange={e => setPlanColor(e.target.value)}
                      style={{ ...inputStyle, flex: 1 }}
                      placeholder="#2e7d32"
                      maxLength={20}
                    />
                  </div>
                </div>
                {!isNew && (
                  <div>
                    <label style={labelStyle}>ترتيب العرض</label>
                    <input
                      type="number"
                      value={displayOrder}
                      onChange={e => setDisplayOrder(e.target.value)}
                      style={inputStyle}
                    />
                  </div>
                )}
              </div>
            </CollapsibleSection>

            {/* ── Section 2: Pricing ── */}
            <CollapsibleSection title="التسعير الأساسي" icon="💰" defaultOpen={true}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.85rem" }}>
                <div>
                  <label style={labelStyle}>السعر الشهري (ل.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceMonthly}
                    onChange={e => setPriceMonthly(e.target.value)}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>السعر السنوي (ل.س)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceYearly}
                    onChange={e => setPriceYearly(e.target.value)}
                    style={inputStyle}
                  />
                </div>
              </div>
              <p style={{ margin: "0.6rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                أسعار الاشتراك المفصّلة (بعملات متعددة) تُضاف في قسم &quot;أسعار الاشتراك&quot; بعد الحفظ.
              </p>
            </CollapsibleSection>

            {/* ── Section 3: Status & Visibility (existing plans only) ── */}
            {!isNew && (
              <CollapsibleSection title="الحالة والظهور" icon="👁" defaultOpen={true}>
                <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1rem" }}>
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
                <div>
                  <label style={labelStyle}>وضع الفوترة</label>
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
              </CollapsibleSection>
            )}

            {/* ── Section 4: Trial Settings ── */}
            <CollapsibleSection title="إعدادات الفترة التجريبية" icon="🎁" defaultOpen={false}>
              <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", marginBottom: "1rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>يوفّر فترة تجريبية</label>
                  <ToggleSwitch checked={hasTrial} onChange={setHasTrial} disabled={saving} />
                </div>
                {hasTrial && (
                  <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                    <label style={{ ...labelStyle, marginBottom: 0 }}>يتطلب طريقة دفع للتجربة</label>
                    <ToggleSwitch checked={requiresPaymentForTrial} onChange={setRequiresPaymentForTrial} disabled={saving} />
                  </div>
                )}
              </div>
              {hasTrial && (
                <div style={{ maxWidth: 220 }}>
                  <label style={labelStyle}>عدد أيام التجربة المجانية</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={trialDays}
                    onChange={e => setTrialDays(e.target.value)}
                    style={inputStyle}
                    placeholder="مثال: 14"
                  />
                </div>
              )}
              {!hasTrial && (
                <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                  فعّل هذا الخيار لمنح المشتركين الجدد فترة تجريبية مجانية قبل الدفع.
                </p>
              )}
            </CollapsibleSection>

            {/* ── Section 5: Business Rules ── */}
            <CollapsibleSection title="قواعد الاشتراك التجاري" icon="⚙️" defaultOpen={false}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem 2.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>الخطة الافتراضية للمستخدمين الجدد</label>
                  <ToggleSwitch checked={isDefaultForNewUsers} onChange={setIsDefaultForNewUsers} disabled={saving} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>متاحة للتسجيل الذاتي</label>
                  <ToggleSwitch checked={availableForSelfSignup} onChange={setAvailableForSelfSignup} disabled={saving} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>تتطلب موافقة الإدارة</label>
                  <ToggleSwitch checked={requiresAdminApproval} onChange={setRequiresAdminApproval} disabled={saving} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>تسمح بالإضافات (Add-ons)</label>
                  <ToggleSwitch checked={allowAddOns} onChange={setAllowAddOns} disabled={saving} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>تسمح بالترقية</label>
                  <ToggleSwitch checked={allowUpgrade} onChange={setAllowUpgrade} disabled={saving} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>تسمح بالتخفيض</label>
                  <ToggleSwitch checked={allowDowngrade} onChange={setAllowDowngrade} disabled={saving} />
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <label style={{ ...labelStyle, marginBottom: 0 }}>تخفيض تلقائي عند الانتهاء</label>
                  <ToggleSwitch checked={autoDowngradeOnExpiry} onChange={setAutoDowngradeOnExpiry} disabled={saving} />
                </div>
              </div>
              <p style={{ margin: "0.75rem 0 0", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                هذه الإعدادات تحدد كيف تتصرف المنصة مع مشتركي هذه الخطة تجارياً.
              </p>
            </CollapsibleSection>

            {/* ── Save Button ── */}
            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", marginBottom: "0.75rem" }}
              disabled={saving}
            >
              {saving ? "جاري الحفظ..." : isNew ? "إنشاء الخطة" : "حفظ المعلومات الأساسية"}
            </button>
          </form>

          {/* ── Section 4: Pricing Entries (existing plans only) ── */}
          {!isNew && (
            <CollapsibleSection
              title="أسعار الاشتراك"
              icon="🏷"
              count={pricing.length}
              defaultOpen={false}
            >
              {!showAddPricing && (
                <div style={{ marginBottom: "0.75rem" }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ padding: "0.3rem 0.85rem", fontSize: "0.82rem" }}
                    onClick={() => setShowAddPricing(true)}
                  >
                    + إضافة سعر
                  </button>
                </div>
              )}
              {pricingLoading && <p style={{ color: "var(--color-text-secondary)", fontSize: "0.88rem" }}>جاري التحميل...</p>}
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
            </CollapsibleSection>
          )}

          {/* ── Section 5: Limits (existing plans only) ── */}
          {!isNew && limits.length > 0 && (
            <CollapsibleSection
              title="الحدود الكمية"
              icon="📊"
              count={limits.length}
              defaultOpen={false}
            >
              {/* ── Tier Preset Quick-Fill ── */}
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.85rem", padding: "0.6rem 0.75rem", background: "var(--color-bg-secondary, #f9fafb)", borderRadius: 8, alignItems: "center" }}>
                <span style={{ fontSize: "0.74rem", color: "var(--color-text-secondary)", fontWeight: 600, flexShrink: 0 }}>تعبئة سريعة:</span>
                {(([
                  { label: "Starter", vals: { max_active_listings: 2,  max_images_per_listing: 5,  max_featured_slots: 0,  max_agents: 1, max_projects: 0 } },
                  { label: "Pro",     vals: { max_active_listings: 20, max_images_per_listing: 20, max_featured_slots: 3,  max_agents: 5, max_projects: 3 } },
                  { label: "Premium", vals: { max_active_listings: -1, max_images_per_listing: 50, max_featured_slots: -1, max_agents: -1, max_projects: -1 } },
                ]) as { label: string; vals: Record<string, number> }[]).map(preset => (
                  <button
                    key={preset.label}
                    type="button"
                    style={{ padding: "0.25rem 0.7rem", borderRadius: 6, border: "1.5px solid var(--color-border, #e5e7eb)", background: "#ffffff", fontSize: "0.76rem", fontWeight: 600, cursor: "pointer", color: "var(--color-text-primary, #1e293b)" }}
                    onClick={() => {
                      Object.entries(preset.vals).forEach(([key, val]) => {
                        handleLimitChange(key, String(val));
                      });
                    }}
                  >
                    {preset.label}
                  </button>
                ))}
                <span style={{ fontSize: "0.7rem", color: "#94a3b8", marginRight: "auto" }}>‑1 = غير محدود</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
            </CollapsibleSection>
          )}

          {/* ── Section 6: Features grouped (existing plans only) ── */}
          {!isNew && features.length > 0 && (
            <CollapsibleSection
              title="الميزات"
              icon="⭐"
              count={enabledCount}
              defaultOpen={false}
            >
              {Object.entries(featureGroups).map(([grp, feats]) => (
                <div key={grp} style={{ marginBottom: "0.85rem" }}>
                  <p style={{ margin: "0 0 0.4rem", fontSize: "0.73rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--color-text-secondary)" }}>
                    {grp}
                  </p>
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.4rem" }}>
                    {feats.map(feat => (
                      <div
                        key={feat.key}
                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0.5rem 0.75rem", borderRadius: 8, background: feat.isEnabled ? "#f0fdf4" : "var(--color-bg-secondary, #f9fafb)", border: feat.isEnabled ? "1px solid #bbf7d0" : "1px solid transparent", opacity: featureSaving === feat.key ? 0.55 : 1, transition: "all 0.18s" }}
                      >
                        <div style={{ display: "flex", alignItems: "flex-start", gap: "0.5rem" }}>
                          {feat.icon && (
                            <span style={{ fontSize: "1rem", marginTop: "0.05rem", flexShrink: 0 }}>{feat.icon}</span>
                          )}
                          <div>
                            <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: feat.isEnabled ? 600 : 400 }}>{feat.name}</p>
                            {feat.description && (
                              <p style={{ margin: 0, fontSize: "0.73rem", color: "var(--color-text-secondary)", lineHeight: 1.35 }}>{feat.description}</p>
                            )}
                          </div>
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
              ))}
            </CollapsibleSection>
          )}

          {/* ── Section 7: Live Plan Preview (existing plans only) ── */}
          {!isNew && (
            <CollapsibleSection title="معاينة الخطة" icon="🔍" defaultOpen={false}>
              <p style={{ margin: "0 0 0.9rem", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
                معاينة مباشرة لكيفية ظهور الخطة في صفحة التسعير.
              </p>
              <PlanPreviewCard
                name={name}
                badgeText={badgeText}
                planColor={planColor}
                isRecommended={isRecommended}
                planCategory={planCategory}
                basePriceMonthly={priceMonthly}
                enabledFeatures={features}
                limits={limits}
              />
            </CollapsibleSection>
          )}

        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}

// ── Main Page ──────────────────────────────────────────────────────────────────

export default function AdminPlansPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });

  const [plans, setPlans]         = useState<AdminPlanSummary[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [activeFilter, setActiveFilter] = useState<"active" | "archived" | "all">("active");

  const [toastMsg,  setToastMsg]  = useState("");
  const [toastType, setToastType] = useState<"ok" | "err">("ok");
  const [toastKey,  setToastKey]  = useState(0);

  const showToast = useCallback((msg: string, type: "ok" | "err" = "ok") => {
    setToastMsg(msg);
    setToastType(type);
    setToastKey(k => k + 1);
    setTimeout(() => setToastMsg(""), 3500);
  }, []);

  const [editTarget, setEditTarget]     = useState<AdminPlanDetail | null | undefined>(undefined);
  const [modalOpen, setModalOpen]       = useState(false);
  const [detailLoading, setDetailLoading] = useState<string | null>(null);

  const [deleteId, setDeleteId]         = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError]   = useState("");

  const [duplicating, setDuplicating]   = useState<string | null>(null);

  const [actionError, setActionError] = useState("");

  const load = useCallback(async () => {
    setFetching(true); setFetchError("");
    try {
      const data = await adminApi.getPlans();
      setPlans(data);
    } catch (e) { setFetchError(normalizeError(e)); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  async function handleOpenEdit(id: string) {
    setDetailLoading(id); setActionError("");
    try {
      const detail = await adminApi.getPlanDetail(id);
      setEditTarget(detail);
      setModalOpen(true);
    } catch (e) { setActionError(normalizeError(e)); }
    finally { setDetailLoading(null); }
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
      setPlans(prev => prev.map(p => p.id === id ? { ...p, isActive: false } : p));
      setDeleteId(null);
      showToast("تمت أرشفة الخطة بنجاح");
    } catch (e) { setDeleteError(normalizeError(e)); }
    finally { setDeleteLoading(false); }
  }

  async function handleDuplicate(id: string) {
    setDuplicating(id); setActionError("");
    try {
      const copy = await adminApi.duplicatePlan(id);
      setPlans(prev => [...prev, copy]);
    } catch (e) { setActionError(normalizeError(e)); }
    finally { setDuplicating(null); }
  }

  const sorted   = [...plans].sort((a, b) => a.displayOrder - b.displayOrder || a.name.localeCompare(b.name));
  const filtered = sorted.filter(p =>
    activeFilter === "all"      ? true :
    activeFilter === "active"   ? p.isActive :
    /* archived */                !p.isActive
  );
  const activeCount   = plans.filter(p =>  p.isActive).length;
  const archivedCount = plans.filter(p => !p.isActive).length;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-background, #f9f9f9)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 860, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
            <div>
              <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>إدارة خطط الاشتراك</h1>
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {activeFilter === "active"   ? `${activeCount} خطة نشطة` :
                 activeFilter === "archived" ? `${archivedCount} خطة مؤرشفة` :
                 `${plans.length} خطة (${activeCount} نشطة · ${archivedCount} مؤرشفة)`}
              </p>
            </div>
            <div style={{ display: "flex", gap: "0.6rem", flexShrink: 0 }}>
              <a
                href="/dashboard/admin/plan-catalog"
                style={{ display: "inline-flex", alignItems: "center", padding: "0.4rem 1rem", borderRadius: 8, fontSize: "0.85rem", border: "1.5px solid var(--color-border, #e5e7eb)", color: "var(--color-text-secondary)", textDecoration: "none", background: "#ffffff" }}>
                كتالوج الميزات والحدود
              </a>
              <button
                className="btn btn-primary"
                onClick={handleOpenCreate}
                style={{ flexShrink: 0 }}>
                + خطة جديدة
              </button>
            </div>
          </div>
        </div>

        {(fetchError || actionError) && <InlineBanner message={fetchError || actionError} />}

        {/* ── Filter Tabs ── */}
        {!fetching && (
          <div style={{ display: "flex", gap: "0.4rem", marginBottom: "1rem", borderBottom: "2px solid var(--color-border, #e5e7eb)", paddingBottom: "0" }}>
            {(["active", "archived", "all"] as const).map(tab => {
              const label = tab === "active" ? `النشطة (${activeCount})` : tab === "archived" ? `المؤرشفة (${archivedCount})` : `الكل (${plans.length})`;
              const isSelected = activeFilter === tab;
              return (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  style={{
                    padding: "0.45rem 1.1rem", fontSize: "0.85rem", fontWeight: isSelected ? 700 : 500,
                    border: "none", background: "none", cursor: "pointer",
                    borderBottom: isSelected ? "2.5px solid var(--color-primary, #2563eb)" : "2.5px solid transparent",
                    color: isSelected ? "var(--color-primary, #2563eb)" : "var(--color-text-secondary)",
                    marginBottom: "-2px", transition: "color 0.15s",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        {fetching && <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>جاري التحميل...</div>}

        {!fetching && filtered.length === 0 && (
          <div style={{ textAlign: "center", padding: "3rem", color: "var(--color-text-secondary)" }}>
            {activeFilter === "archived" ? "لا توجد خطط مؤرشفة." : activeFilter === "active" ? "لا توجد خطط نشطة. أنشئ أول خطة!" : "لا توجد خطط بعد. أنشئ أول خطة!"}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {filtered.map(plan => {
            const isLoadingThis = detailLoading === plan.id;
            const monthlyPrice  = plan.basePriceMonthly === 0 ? "مجاني" : `${plan.basePriceMonthly.toLocaleString("ar-SY")} ل.س/شهر`;
            const yearlyPrice   = plan.basePriceYearly  === 0 ? null     : `${plan.basePriceYearly.toLocaleString("ar-SY")} ل.س/سنة`;
            return (
            <div key={plan.id} className="form-card" style={{ padding: "1.25rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>
              <div style={{ flex: 1, minWidth: 200 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap", marginBottom: "0.35rem" }}>
                  {plan.planColor && (
                    <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: "50%", background: plan.planColor, flexShrink: 0 }} />
                  )}
                  <span style={{ fontWeight: 700, fontSize: "1rem" }}>{plan.name}</span>
                  {plan.code && <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{plan.code}</span>}
                  <span className={plan.isActive ? "badge badge-green" : "badge badge-red"}>{plan.isActive ? "نشطة" : "معطلة"}</span>
                  <span className={plan.isPublic ? "badge badge-blue" : "badge badge-gray"}>{plan.isPublic ? "عامة" : "مخفية"}</span>
                  {plan.isRecommended && <span className="badge badge-yellow">⭐ موصى بها</span>}
                  {plan.hasTrial && <span className="badge badge-green">🎁 تجريبية {plan.trialDays}ي</span>}
                  {plan.planCategory && <span className="badge badge-gray">{plan.planCategory === "Individual" ? "أفراد" : plan.planCategory === "Business" ? "أعمال" : plan.planCategory}</span>}
                </div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "0.75rem", marginBottom: "0.25rem" }}>
                  <span style={{ fontWeight: 700, fontSize: "0.95rem", color: plan.planColor || "var(--color-primary, #2563eb)" }}>{monthlyPrice}</span>
                  {yearlyPrice && <span style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>{yearlyPrice}</span>}
                </div>
                {plan.description && <p style={{ margin: "0 0 0.4rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>{plan.description}</p>}
                <p style={{ margin: "0 0 0.35rem", fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
                  ترتيب: {plan.displayOrder}
                  &nbsp;·&nbsp;رتبة: {plan.rank}
                  &nbsp;·&nbsp;{plan.billingMode === "InternalOnly" ? "داخلي" : plan.billingMode === "StripeOnly" ? "Stripe" : "هجين"}
                </p>
                {/* ── Key Commercial Data ── */}
                <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", alignItems: "center" }}>
                  {plan.listingsLimit !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      🏠 {plan.listingsLimit === -1 ? "∞" : plan.listingsLimit} إعلان
                    </span>
                  )}
                  {plan.agentsLimit !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      👤 {plan.agentsLimit === -1 ? "∞" : plan.agentsLimit} وكيل
                    </span>
                  )}
                  {plan.projectsLimit !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      🏗 {plan.projectsLimit === -1 ? "∞" : plan.projectsLimit} مشروع
                    </span>
                  )}
                  {plan.imagesPerListing !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      📸 {plan.imagesPerListing === -1 ? "∞" : plan.imagesPerListing} صورة
                    </span>
                  )}
                  {plan.featuredSlots !== 0 && (
                    <span style={{ fontSize: "0.72rem", background: "var(--color-bg-secondary, #f3f4f6)", border: "1px solid var(--color-border, #e5e7eb)", borderRadius: 4, padding: "0.1rem 0.45rem", color: "var(--color-text-secondary)" }}>
                      ⭐ {plan.featuredSlots === -1 ? "∞" : plan.featuredSlots} مميز
                    </span>
                  )}
                  {plan.hasAnalytics        && <span style={{ fontSize: "0.72rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#1d4ed8" }}>📊 تحليلات</span>}
                  {plan.hasFeaturedListings && <span style={{ fontSize: "0.72rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#1d4ed8" }}>⭐ إعلانات مميزة</span>}
                  {plan.hasProjectMgmt      && <span style={{ fontSize: "0.72rem", background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#1d4ed8" }}>🏗 إدارة مشاريع</span>}
                  {plan.hasWhatsApp         && <span style={{ fontSize: "0.72rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#15803d" }}>💬 واتساب</span>}
                  {plan.hasVerifiedBadge    && <span style={{ fontSize: "0.72rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#15803d" }}>✅ شارة موثق</span>}
                  {plan.hasPrioritySupport  && <span style={{ fontSize: "0.72rem", background: "#faf5ff", border: "1px solid #e9d5ff", borderRadius: 4, padding: "0.1rem 0.45rem", color: "#7e22ce" }}>🛠 دعم أولوية</span>}
                </div>
              </div>
              <div style={{ display: "flex", gap: "0.5rem", flexShrink: 0 }}>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                  disabled={isLoadingThis || !!detailLoading}
                  onClick={() => handleOpenEdit(plan.id)}
                >
                  {isLoadingThis ? "..." : "تعديل"}
                </button>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", opacity: duplicating === plan.id ? 0.5 : 1 }}
                  disabled={duplicating === plan.id}
                  onClick={() => handleDuplicate(plan.id)}
                >
                  {duplicating === plan.id ? "..." : "نسخ"}
                </button>
                <button
                  className="btn"
                  style={{ padding: "0.4rem 1rem", fontSize: "0.85rem", border: "1.5px solid var(--color-error)", color: "var(--color-error)", backgroundColor: "transparent" }}
                  onClick={() => { setDeleteId(plan.id); setDeleteError(""); }}
                >
                  أرشفة
                </button>
              </div>
            </div>
            );
          })}
        </div>

        {/* ── Plan Comparison Table ── */}
        {!fetching && plans.length > 0 && (
          <PlanComparisonTable plans={plans} />
        )}

      </div>

      {/* ── Archive Confirmation ── */}
      {deleteId && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, backgroundColor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center", padding: "1rem" }}>
          <div style={{ background: "#ffffff", borderRadius: 12, padding: "2rem", maxWidth: 440, width: "100%", boxShadow: "0 8px 40px rgba(0,0,0,0.18)" }}>
            <h3 style={{ margin: "0 0 0.75rem" }}>تأكيد الأرشفة</h3>
            <p style={{ color: "var(--color-text-secondary)", marginBottom: "1rem" }}>سيتم إخفاء هذه الخطة وتعطيلها. لا يمكن أرشفة خطة لها مشتركون نشطون. يمكن إعادة تفعيلها لاحقاً من خلال التعديل.</p>
            {deleteError && <p style={{ color: "var(--color-error)", fontSize: "0.9rem", marginBottom: "1rem" }}>{deleteError}</p>}
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <button
                className="btn btn-primary"
                style={{ flex: 1, background: "var(--color-error, #dc2626)", borderColor: "var(--color-error, #dc2626)" }}
                disabled={deleteLoading}
                onClick={() => handleDelete(deleteId)}
              >
                {deleteLoading ? "جاري الأرشفة..." : "تأكيد الأرشفة"}
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
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
          onSaved={(updated) => handleSaved(updated)}
        />
      )}

      {/* ── Toast ── */}
      {toastMsg && <Toast msg={toastMsg} type={toastType} key={toastKey} />}
    </div>
  );
}
