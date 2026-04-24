"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type {
  FeatureDefinitionEntry,
  LimitDefinitionEntry,
  CreateFeatureDefinitionPayload,
  UpdateFeatureDefinitionPayload,
  CreateLimitDefinitionPayload,
  UpdateLimitDefinitionPayload,
} from "@/types";

// ── Group label mapping ───────────────────────────────────────────────────────

const FEATURE_GROUP_LABELS: Record<string, string> = {
  marketing:     "📢 التسويق والظهور",
  content:       "🏠 محتوى الإعلان",
  business:      "📊 إدارة الأعمال",
  communication: "💬 التواصل",
  support:       "🛠 الدعم الفني",
  // legacy
  analytics:     "📊 إدارة الأعمال",
  listing:       "🏠 محتوى الإعلان",
  media:         "🏠 محتوى الإعلان",
  team:          "📊 إدارة الأعمال",
  projects:      "📊 إدارة الأعمال",
};

function groupLabel(key?: string) {
  if (!key) return "—";
  return FEATURE_GROUP_LABELS[key] ?? key;
}

// ── Scoped styles (light theme) ────────────────────────────────────────────────

const SCOPED_CSS = `
  .feature-catalog-light {
    background: #f8fafc;
    color: #1e293b;
  }
  .feature-catalog-light .cat-table-row:nth-child(even) {
    background: #f9fafb;
  }
  .feature-catalog-light .cat-table-row:hover {
    background: #eef2ff !important;
  }
  .feature-catalog-light .cat-edit-btn:hover {
    background: #e0e7ff !important;
    border-color: #6366f1 !important;
    color: #4f46e5 !important;
  }
  .feature-catalog-light .cat-form-label {
    font-size: 12px;
    color: #6b7280;
    display: block;
    margin-bottom: 5px;
    font-weight: 500;
  }
`;

// ── Shared style constants (light) ─────────────────────────────────────────────

const card: React.CSSProperties = {
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 12,
  overflow: "hidden",
  marginBottom: 32,
  boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
};

const thStyle: React.CSSProperties = {
  padding: "12px 16px",
  textAlign: "right",
  fontSize: 12,
  fontWeight: 600,
  color: "#64748b",
  letterSpacing: "0.03em",
  borderBottom: "1px solid #e2e8f0",
  background: "#f1f5f9",
  whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "14px 16px",
  textAlign: "right",
  fontSize: 13,
  color: "#1e293b",
  borderBottom: "1px solid #e2e8f0",
  verticalAlign: "middle",
};

const codeStyle: React.CSSProperties = {
  fontFamily: "monospace",
  fontSize: 12,
  background: "#f1f5f9",
  padding: "2px 7px",
  borderRadius: 4,
  color: "#6366f1",
  border: "1px solid #e2e8f0",
};

const btnPrimary: React.CSSProperties = {
  background: "linear-gradient(135deg, #6d28d9, #4f46e5)",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  padding: "8px 18px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const btnSecondary: React.CSSProperties = {
  background: "#f8fafc",
  color: "#475569",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  padding: "7px 14px",
  fontSize: 13,
  cursor: "pointer",
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  whiteSpace: "nowrap",
};

const btnDanger: React.CSSProperties = {
  background: "#fef2f2",
  color: "#dc2626",
  border: "1px solid #fecaca",
  borderRadius: 8,
  padding: "5px 12px",
  fontSize: 12,
  cursor: "pointer",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  background: "#ffffff",
  border: "1px solid #e2e8f0",
  borderRadius: 8,
  color: "#1e293b",
  fontSize: 13,
  outline: "none",
};

// ── Badge helpers ─────────────────────────────────────────────────────────────

function typeBadge(label: string) {
  return (
    <span style={{ fontSize: 11, background: "#ede9fe", color: "#6d28d9", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
      {label}
    </span>
  );
}

function scopeBadge(label: string) {
  return (
    <span style={{ fontSize: 11, background: "#f0fdfa", color: "#0f766e", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
      {label}
    </span>
  );
}

function groupBadge(label: string) {
  return (
    <span style={{ fontSize: 11, background: "#f5f3ff", color: "#7c3aed", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
      {label}
    </span>
  );
}

function statusBadge(isActive: boolean, activeText: string, inactiveText: string) {
  return (
    <span style={{
      fontSize: 11,
      borderRadius: 5,
      padding: "3px 10px",
      fontWeight: 600,
      background: isActive ? "#f0fdf4" : "#f8fafc",
      color: isActive ? "#16a34a" : "#94a3b8",
      border: `1px solid ${isActive ? "#bbf7d0" : "#e2e8f0"}`,
    }}>
      {isActive ? activeText : inactiveText}
    </span>
  );
}

// ── Feature Section ───────────────────────────────────────────────────────────

const FEATURE_TYPE_LABELS: Record<string, string> = {
  boolean:  "✅ منطقي",
  limit:    "🔢 حد عددي",
  text:     "📝 نصي",
  json:     "⚙️ JSON",
};

const FEATURE_SCOPE_LABELS: Record<string, string> = {
  listing:   "🏠 إعلان",
  user:      "👤 مستخدم",
  system:    "⚙️ نظام",
  messaging: "💬 مراسلة",
  analytics: "📊 تحليلات",
};

function typeLabel(t?: string) {
  if (!t) return "—";
  return FEATURE_TYPE_LABELS[t] ?? t;
}
function scopeLabel(s?: string) {
  if (!s) return "—";
  return FEATURE_SCOPE_LABELS[s] ?? s;
}

type FeatFormMode = "create" | "edit";

interface FeatForm {
  key: string;
  name: string;
  description: string;
  featureGroup: string;
  icon: string;
  isActive: boolean;
  type: string;
  scope: string;
  sortOrder: number;
}

function defaultFeatForm(): FeatForm {
  return { key: "", name: "", description: "", featureGroup: "", icon: "", isActive: true, type: "boolean", scope: "listing", sortOrder: 0 };
}

function featFromEntry(e: FeatureDefinitionEntry): FeatForm {
  return {
    key:          e.key,
    name:         e.name,
    description:  e.description ?? "",
    featureGroup: e.featureGroup ?? "",
    icon:         e.icon ?? "",
    isActive:     e.isActive,
    type:         e.type,
    scope:        e.scope,
    sortOrder:    e.sortOrder,
  };
}

interface FeatureSectionProps {
  items: FeatureDefinitionEntry[];
  onReload: () => Promise<void>;
  globalError: string;
  setGlobalError: (s: string) => void;
  globalSuccess: string;
  setGlobalSuccess: (s: string) => void;
}

function FeatureSection({
  items, onReload, globalError, setGlobalError, globalSuccess, setGlobalSuccess
}: FeatureSectionProps) {
  const [showForm, setShowForm]           = useState(false);
  const [mode, setMode]                   = useState<FeatFormMode>("create");
  const [editId, setEditId]               = useState<string | null>(null);
  const [editItem, setEditItem]           = useState<FeatureDefinitionEntry | null>(null);
  const [form, setForm]                   = useState<FeatForm>(defaultFeatForm());
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<FeatureDefinitionEntry | null>(null);

  function openCreate() {
    setMode("create");
    setEditId(null);
    setEditItem(null);
    setForm(defaultFeatForm());
    setGlobalError("");
    setGlobalSuccess("");
    setShowForm(true);
  }

  function openEdit(item: FeatureDefinitionEntry) {
    setMode("edit");
    setEditId(item.id);
    setEditItem(item);
    setForm(featFromEntry(item));
    setGlobalError("");
    setGlobalSuccess("");
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditId(null);
    setEditItem(null);
  }

  async function handleSave() {
    setSaving(true);
    setGlobalError("");
    setGlobalSuccess("");
    try {
      if (mode === "create") {
        const payload: CreateFeatureDefinitionPayload = {
          key:          form.key.trim(),
          name:         form.name.trim(),
          description:  form.description.trim() || undefined,
          featureGroup: form.featureGroup.trim() || undefined,
          icon:         form.icon.trim() || undefined,
          type:         form.type,
          scope:        form.scope,
          sortOrder:    form.sortOrder,
        };
        await adminApi.createCatalogFeature(payload);
        setGlobalSuccess("تم إضافة تعريف الميزة بنجاح");
      } else {
        const payload: UpdateFeatureDefinitionPayload = {
          name:         form.name.trim(),
          description:  form.description.trim() || undefined,
          featureGroup: form.featureGroup.trim() || undefined,
          icon:         form.icon.trim() || undefined,
          isActive:     form.isActive,
          sortOrder:    form.sortOrder,
        };
        await adminApi.updateCatalogFeature(editId!, payload);
        setGlobalSuccess("تم تحديث تعريف الميزة بنجاح");
      }
      cancel();
      await onReload();
    } catch (err) {
      setGlobalError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: FeatureDefinitionEntry) {
    setDeleting(item.id);
    setGlobalError("");
    setGlobalSuccess("");
    try {
      await adminApi.deleteCatalogFeature(item.id);
      setGlobalSuccess("تم حذف تعريف الميزة");
      setConfirmDelete(null);
      await onReload();
    } catch (err) {
      setGlobalError(normalizeError(err));
    } finally {
      setDeleting(null);
    }
  }

  const isCreateDisabled = saving || !form.name.trim() || !form.key.trim() || !form.type || !form.scope;
  const isEditDisabled   = saving || !form.name.trim();

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>تعريفات الميزات</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
            {items.length} تعريف — المفاتيح والنوع والنطاق ثابتة بعد الإنشاء
          </div>
        </div>
        <button onClick={openCreate} style={btnPrimary}>
          + إضافة ميزة
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{ padding: 22, background: "#faf5ff", borderBottom: "1px solid #ddd6fe" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#7c3aed", marginBottom: 14 }}>
            {mode === "create" ? "إضافة تعريف ميزة جديد" : "تعديل تعريف الميزة"}
          </div>

          {/* System feature notice */}
          {mode === "edit" && editItem?.isSystem && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "#fefce8", border: "1px solid #fde68a", borderRadius: 8, fontSize: 12, color: "#92400e" }}>
              🔒 ميزة نظامية مدمجة — الاسم والوصف والمجموعة والأيقونة وترتيب العرض قابلة للتعديل. النوع والنطاق والمفتاح ثابتة.
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>

            {/* Key — create only */}
            {mode === "create" && (
              <div>
                <label className="cat-form-label">المفتاح (key) *</label>
                <input
                  dir="ltr"
                  value={form.key}
                  onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                  placeholder="my_feature"
                  style={inputStyle}
                />
              </div>
            )}

            {/* Name */}
            <div>
              <label className="cat-form-label">الاسم *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="اسم الميزة"
                style={inputStyle}
              />
            </div>

            {/* Type */}
            {mode === "create" ? (
              <div>
                <label className="cat-form-label">النوع (Type) *</label>
                <select
                  value={form.type}
                  onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                  style={{ ...inputStyle, appearance: "none" }}>
                  {Object.entries(FEATURE_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="cat-form-label">النوع (Type)</label>
                <div style={{ ...inputStyle, background: "#f9fafb", color: "#94a3b8", cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6 }}>
                  🔒 {typeLabel(form.type)}
                </div>
              </div>
            )}

            {/* Scope */}
            {mode === "create" ? (
              <div>
                <label className="cat-form-label">النطاق (Scope) *</label>
                <select
                  value={form.scope}
                  onChange={e => setForm(f => ({ ...f, scope: e.target.value }))}
                  style={{ ...inputStyle, appearance: "none" }}>
                  {Object.entries(FEATURE_SCOPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            ) : (
              <div>
                <label className="cat-form-label">النطاق (Scope)</label>
                <div style={{ ...inputStyle, background: "#f9fafb", color: "#94a3b8", cursor: "not-allowed", display: "flex", alignItems: "center", gap: 6 }}>
                  🔒 {scopeLabel(form.scope)}
                </div>
              </div>
            )}

            {/* Icon */}
            <div>
              <label className="cat-form-label">الأيقونة (إيموجي)</label>
              <input
                value={form.icon}
                onChange={e => setForm(f => ({ ...f, icon: e.target.value }))}
                placeholder="🎯"
                maxLength={8}
                style={{ ...inputStyle, width: 90 }}
              />
            </div>

            {/* Feature Group */}
            <div>
              <label className="cat-form-label">المجموعة</label>
              <select
                value={form.featureGroup}
                onChange={e => setForm(f => ({ ...f, featureGroup: e.target.value }))}
                style={{ ...inputStyle, appearance: "none" }}>
                <option value="">— بدون مجموعة —</option>
                {Object.entries(FEATURE_GROUP_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v} ({k})</option>
                ))}
              </select>
            </div>

            {/* Sort Order */}
            <div>
              <label className="cat-form-label">ترتيب العرض</label>
              <input
                type="number"
                dir="ltr"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) || 0 }))}
                min={0}
                style={{ ...inputStyle, width: 100 }}
              />
            </div>

            {/* Description */}
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="cat-form-label">الوصف</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="وصف موجز للميزة"
                style={inputStyle}
              />
            </div>

            {/* Active toggle (edit only) */}
            {mode === "edit" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="featActive"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                <label htmlFor="featActive" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>
                  مفعّلة
                </label>
              </div>
            )}
          </div>

          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={mode === "create" ? isCreateDisabled : isEditDisabled}
              style={{ ...btnPrimary, opacity: (mode === "create" ? isCreateDisabled : isEditDisabled) ? 0.6 : 1 }}>
              {saving ? "جاري الحفظ…" : mode === "create" ? "إضافة" : "حفظ التعديلات"}
            </button>
            <button onClick={cancel} style={btnSecondary}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>المفتاح</th>
              <th style={thStyle}>الاسم والوصف</th>
              <th style={{ ...thStyle, textAlign: "center", width: 48 }}>أيقونة</th>
              <th style={thStyle}>النوع</th>
              <th style={thStyle}>النطاق</th>
              <th style={thStyle}>المجموعة</th>
              <th style={{ ...thStyle, textAlign: "center" }}>الحالة</th>
              <th style={{ ...thStyle, textAlign: "center" }}>خطط</th>
              <th style={{ ...thStyle, textAlign: "center" }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={9} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 36 }}>
                  لا توجد تعريفات بعد
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="cat-table-row" style={{ opacity: item.isActive ? 1 : 0.55 }}>
                <td style={tdStyle}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
                    <span style={codeStyle}>{item.key}</span>
                    {item.isSystem && (
                      <span style={{ fontSize: 10, background: "#fefce8", color: "#92400e", borderRadius: 4, padding: "1px 6px", border: "1px solid #fde68a", fontWeight: 600 }}>
                        🔒 نظام
                      </span>
                    )}
                  </div>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3, lineHeight: 1.4 }}>{item.description}</div>
                  )}
                </td>
                <td style={{ ...tdStyle, textAlign: "center", fontSize: "1.25rem" }}>
                  {item.icon ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {typeBadge(typeLabel(item.type))}
                </td>
                <td style={tdStyle}>
                  {scopeBadge(scopeLabel(item.scope))}
                </td>
                <td style={tdStyle}>
                  {item.featureGroup ? groupBadge(groupLabel(item.featureGroup)) : <span style={{ color: "#cbd5e1" }}>—</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {statusBadge(item.isActive, "مفعّلة", "معطّلة")}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {item.planFeatureCount > 0 ? (
                    <span style={{ color: "#6d28d9", fontWeight: 700, fontSize: 13 }}>{item.planFeatureCount}</span>
                  ) : <span style={{ color: "#cbd5e1" }}>0</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                    <button
                      onClick={() => openEdit(item)}
                      className="cat-edit-btn"
                      style={btnSecondary}>
                      ✏️ تعديل
                    </button>
                    {item.isSystem ? (
                      <span style={{ fontSize: 11, color: "#cbd5e1", padding: "5px 8px" }}>
                        🔒 محمي
                      </span>
                    ) : confirmDelete?.id === item.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                          style={{ ...btnDanger, opacity: deleting === item.id ? 0.6 : 1 }}>
                          {deleting === item.id ? "…" : "تأكيد الحذف"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={btnSecondary}>
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(item)}
                        disabled={item.planFeatureCount > 0}
                        style={{ ...btnDanger, opacity: item.planFeatureCount > 0 ? 0.4 : 1, cursor: item.planFeatureCount > 0 ? "not-allowed" : "pointer" }}
                        title={item.planFeatureCount > 0 ? "مرتبط بخطط — عطّله بدلاً من حذفه" : undefined}>
                        حذف
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Limit Section ─────────────────────────────────────────────────────────────

type LimitFormMode = "create" | "edit";

interface LimitForm {
  key: string;
  name: string;
  description: string;
  unit: string;
  valueType: string;
  appliesToScope: string;
  isActive: boolean;
}

function defaultLimitForm(): LimitForm {
  return { key: "", name: "", description: "", unit: "", valueType: "integer", appliesToScope: "account", isActive: true };
}

function limitFromEntry(e: LimitDefinitionEntry): LimitForm {
  return {
    key:            e.key,
    name:           e.name,
    description:    e.description ?? "",
    unit:           e.unit ?? "",
    valueType:      e.valueType,
    appliesToScope: e.appliesToScope ?? "",
    isActive:       e.isActive,
  };
}

interface LimitSectionProps {
  items: LimitDefinitionEntry[];
  onReload: () => Promise<void>;
  setGlobalError: (s: string) => void;
  setGlobalSuccess: (s: string) => void;
}

function LimitSection({ items, onReload, setGlobalError, setGlobalSuccess }: LimitSectionProps) {
  const [showForm, setShowForm]           = useState(false);
  const [mode, setMode]                   = useState<LimitFormMode>("create");
  const [editId, setEditId]               = useState<string | null>(null);
  const [form, setForm]                   = useState<LimitForm>(defaultLimitForm());
  const [saving, setSaving]               = useState(false);
  const [deleting, setDeleting]           = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<LimitDefinitionEntry | null>(null);

  function openCreate() {
    setMode("create");
    setEditId(null);
    setForm(defaultLimitForm());
    setGlobalError("");
    setGlobalSuccess("");
    setShowForm(true);
  }

  function openEdit(item: LimitDefinitionEntry) {
    setMode("edit");
    setEditId(item.id);
    setForm(limitFromEntry(item));
    setGlobalError("");
    setGlobalSuccess("");
    setShowForm(true);
  }

  function cancel() {
    setShowForm(false);
    setEditId(null);
  }

  async function handleSave() {
    setSaving(true);
    setGlobalError("");
    setGlobalSuccess("");
    try {
      if (mode === "create") {
        const payload: CreateLimitDefinitionPayload = {
          key:            form.key.trim(),
          name:           form.name.trim(),
          description:    form.description.trim() || undefined,
          unit:           form.unit.trim() || undefined,
          valueType:      form.valueType || "integer",
          appliesToScope: form.appliesToScope.trim() || undefined,
        };
        await adminApi.createCatalogLimit(payload);
        setGlobalSuccess("تم إضافة تعريف الحد بنجاح");
      } else {
        const payload: UpdateLimitDefinitionPayload = {
          name:           form.name.trim(),
          description:    form.description.trim() || undefined,
          unit:           form.unit.trim() || undefined,
          valueType:      form.valueType || "integer",
          appliesToScope: form.appliesToScope.trim() || undefined,
          isActive:       form.isActive,
        };
        await adminApi.updateCatalogLimit(editId!, payload);
        setGlobalSuccess("تم تحديث تعريف الحد بنجاح");
      }
      cancel();
      await onReload();
    } catch (err) {
      setGlobalError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(item: LimitDefinitionEntry) {
    setDeleting(item.id);
    setGlobalError("");
    setGlobalSuccess("");
    try {
      await adminApi.deleteCatalogLimit(item.id);
      setGlobalSuccess("تم حذف تعريف الحد");
      setConfirmDelete(null);
      await onReload();
    } catch (err) {
      setGlobalError(normalizeError(err));
    } finally {
      setDeleting(null);
    }
  }

  return (
    <div style={card}>
      {/* Header */}
      <div style={{ padding: "18px 22px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "1px solid #e2e8f0", background: "#fff" }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: "#0f172a" }}>تعريفات الحدود الكمية</div>
          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 3 }}>
            {items.length} تعريف — -1 يعني بلا حدود
          </div>
        </div>
        <button onClick={openCreate} style={btnPrimary}>
          + إضافة حد
        </button>
      </div>

      {/* Inline form */}
      {showForm && (
        <div style={{ padding: 22, background: "#f5f3ff", borderBottom: "1px solid #ddd6fe" }}>
          <div style={{ fontWeight: 600, fontSize: 14, color: "#6d28d9", marginBottom: 14 }}>
            {mode === "create" ? "إضافة تعريف حد جديد" : "تعديل تعريف الحد"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            {mode === "create" && (
              <div>
                <label className="cat-form-label">المفتاح (key) *</label>
                <input
                  dir="ltr"
                  value={form.key}
                  onChange={e => setForm(f => ({ ...f, key: e.target.value }))}
                  placeholder="max_images_per_listing"
                  style={inputStyle}
                />
              </div>
            )}
            <div>
              <label className="cat-form-label">الاسم *</label>
              <input
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                placeholder="الحد الأقصى للصور"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="cat-form-label">الوحدة</label>
              <input
                value={form.unit}
                onChange={e => setForm(f => ({ ...f, unit: e.target.value }))}
                placeholder="صورة"
                style={inputStyle}
              />
            </div>
            <div>
              <label className="cat-form-label">نوع القيمة</label>
              <select
                value={form.valueType}
                onChange={e => setForm(f => ({ ...f, valueType: e.target.value }))}
                style={{ ...inputStyle, appearance: "none" }}>
                <option value="integer">integer — عدد صحيح</option>
                <option value="decimal">decimal — كسر عشري</option>
              </select>
            </div>
            <div>
              <label className="cat-form-label">نطاق التطبيق</label>
              <select
                value={form.appliesToScope}
                onChange={e => setForm(f => ({ ...f, appliesToScope: e.target.value }))}
                style={{ ...inputStyle, appearance: "none" }}>
                <option value="account">account — الحساب</option>
                <option value="listing">listing — الإعلان</option>
                <option value="user">user — المستخدم</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label className="cat-form-label">الوصف</label>
              <input
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                placeholder="وصف موجز للحد"
                style={inputStyle}
              />
            </div>
            {mode === "edit" && (
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <input
                  type="checkbox"
                  id="limitActive"
                  checked={form.isActive}
                  onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                />
                <label htmlFor="limitActive" style={{ fontSize: 13, color: "#374151", cursor: "pointer" }}>
                  مفعَّل
                </label>
              </div>
            )}
          </div>
          <div style={{ marginTop: 14, display: "flex", gap: 10 }}>
            <button
              onClick={handleSave}
              disabled={saving || !form.name.trim() || (mode === "create" && !form.key.trim())}
              style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
              {saving ? "جاري الحفظ…" : mode === "create" ? "إضافة" : "حفظ التعديلات"}
            </button>
            <button onClick={cancel} style={btnSecondary}>
              إلغاء
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={thStyle}>المفتاح</th>
              <th style={thStyle}>الاسم</th>
              <th style={thStyle}>الوحدة</th>
              <th style={thStyle}>النطاق</th>
              <th style={thStyle}>الوصف</th>
              <th style={{ ...thStyle, textAlign: "center" }}>الحالة</th>
              <th style={{ ...thStyle, textAlign: "center" }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 && (
              <tr>
                <td colSpan={7} style={{ ...tdStyle, textAlign: "center", color: "#94a3b8", padding: 36 }}>
                  لا توجد تعريفات بعد
                </td>
              </tr>
            )}
            {items.map(item => (
              <tr key={item.id} className="cat-table-row" style={{ opacity: item.isActive ? 1 : 0.55 }}>
                <td style={tdStyle}>
                  <span style={codeStyle}>{item.key}</span>
                </td>
                <td style={tdStyle}>
                  <div style={{ fontWeight: 700, color: "#0f172a", fontSize: 13 }}>{item.name}</div>
                  {item.description && (
                    <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{item.description}</div>
                  )}
                </td>
                <td style={{ ...tdStyle, fontSize: 12, color: "#475569" }}>
                  {item.unit ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                </td>
                <td style={tdStyle}>
                  {item.appliesToScope ? (
                    <span style={{ fontSize: 11, background: "#ede9fe", color: "#6d28d9", borderRadius: 5, padding: "2px 8px", fontWeight: 600 }}>
                      {item.appliesToScope}
                    </span>
                  ) : <span style={{ color: "#cbd5e1" }}>—</span>}
                </td>
                <td style={{ ...tdStyle, color: "#64748b", fontSize: 12 }}>
                  {item.description ?? <span style={{ color: "#cbd5e1" }}>—</span>}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  {statusBadge(item.isActive, "مفعَّل", "معطَّل")}
                </td>
                <td style={{ ...tdStyle, textAlign: "center" }}>
                  <div style={{ display: "flex", gap: 6, justifyContent: "center", alignItems: "center" }}>
                    <button
                      onClick={() => openEdit(item)}
                      className="cat-edit-btn"
                      style={btnSecondary}>
                      ✏️ تعديل
                    </button>
                    {confirmDelete?.id === item.id ? (
                      <div style={{ display: "flex", gap: 4 }}>
                        <button
                          onClick={() => handleDelete(item)}
                          disabled={deleting === item.id}
                          style={{ ...btnDanger, opacity: deleting === item.id ? 0.6 : 1 }}>
                          {deleting === item.id ? "…" : "تأكيد الحذف"}
                        </button>
                        <button
                          onClick={() => setConfirmDelete(null)}
                          style={btnSecondary}>
                          إلغاء
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmDelete(item)}
                        style={btnDanger}>
                        حذف
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminPlanCatalogPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });

  const [features, setFeatures]       = useState<FeatureDefinitionEntry[]>([]);
  const [limits, setLimits]           = useState<LimitDefinitionEntry[]>([]);
  const [fetching, setFetching]       = useState(true);
  const [fetchError, setFetchError]   = useState("");
  const [globalError, setGlobalError]     = useState("");
  const [globalSuccess, setGlobalSuccess] = useState("");

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const [feats, lims] = await Promise.all([
        adminApi.getCatalogFeatures(),
        adminApi.getCatalogLimits(),
      ]);
      setFeatures(feats);
      setLimits(lims);
    } catch (err) {
      setFetchError(normalizeError(err));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  if (authLoading || fetching) {
    return (
      <div style={{ padding: 32 }}>
        <LoadingRow />
      </div>
    );
  }

  return (
    <div className="feature-catalog-light" style={{ padding: "24px 32px", maxWidth: 1100, margin: "0 auto", minHeight: "100%" }}>
      {/* Scoped styles — light theme + hover/zebra effects */}
      <style>{SCOPED_CSS}</style>

      <DashboardBackLink href="/dashboard/admin/plans" label="العودة إلى الخطط" />

      <div style={{ marginBottom: 28 }}>
        <h1 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: "#0f172a" }}>
          كتالوج الباقات
        </h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: "#64748b" }}>
          إدارة تعريفات الميزات والحدود الكمية المتاحة للخطط
        </p>
      </div>

      {fetchError && (
        <InlineBanner
          type="error"
          message={fetchError}
          onDismiss={() => setFetchError("")}
        />
      )}
      {globalError && (
        <InlineBanner
          type="error"
          message={globalError}
          onDismiss={() => setGlobalError("")}
        />
      )}
      {globalSuccess && (
        <InlineBanner
          type="success"
          message={globalSuccess}
          onDismiss={() => setGlobalSuccess("")}
        />
      )}

      <FeatureSection
        items={features}
        onReload={load}
        globalError={globalError}
        setGlobalError={setGlobalError}
        globalSuccess={globalSuccess}
        setGlobalSuccess={setGlobalSuccess}
      />

      <LimitSection
        items={limits}
        onReload={load}
        setGlobalError={setGlobalError}
        setGlobalSuccess={setGlobalSuccess}
      />
    </div>
  );
}
