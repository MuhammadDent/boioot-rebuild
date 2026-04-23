"use client";

import { useEffect, useState, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { api } from "@/lib/api";
import { toast } from "sonner";

// ── Types ────────────────────────────────────────────────────────────────────

type FieldSchema = {
  key: string;
  label: string;
  placeholder?: string;
  required: boolean;
  pattern?: string;
  hint?: string;
};

type Integration = {
  key: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  categoryLabel: string;
  configSchema: FieldSchema[];
  sortOrder: number;
  isEnabled: boolean;
  config: Record<string, string> | null;
  status: "active" | "inactive" | "incomplete";
  updatedAt: string | null;
  updatedBy: string | null;
};

// ── Status badge ─────────────────────────────────────────────────────────────

const STATUS_MAP = {
  active:     { label: "مُفعَّل",   bg: "#dcfce7", color: "#166534" },
  inactive:   { label: "غير مفعَّل", bg: "#f3f4f6", color: "#6b7280" },
  incomplete: { label: "يحتاج إعداد", bg: "#fef9c3", color: "#854d0e" },
};

function StatusBadge({ status }: { status: Integration["status"] }) {
  const s = STATUS_MAP[status] ?? STATUS_MAP.inactive;
  return (
    <span style={{
      fontSize: "0.7rem", fontWeight: 600, padding: "2px 8px", borderRadius: 99,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  );
}

// ── Toggle switch ─────────────────────────────────────────────────────────────

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      onClick={onChange}
      disabled={disabled}
      style={{
        width: 40, height: 22, borderRadius: 11, border: "none", cursor: disabled ? "not-allowed" : "pointer",
        background: checked ? "#16a34a" : "#d1d5db", position: "relative", transition: "background .2s",
        flexShrink: 0, opacity: disabled ? 0.6 : 1,
      }}
      title={checked ? "إلغاء التفعيل" : "تفعيل"}
    >
      <span style={{
        position: "absolute", top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff",
        transition: "right .2s, left .2s",
        right: checked ? 3 : "auto",
        left: checked ? "auto" : 3,
      }} />
    </button>
  );
}

// ── Settings Modal ────────────────────────────────────────────────────────────

function SettingsModal({
  integration,
  onClose,
  onSaved,
}: {
  integration: Integration;
  onClose: () => void;
  onSaved: (updated: Integration) => void;
}) {
  const [values, setValues] = useState<Record<string, string>>(integration.config ?? {});
  const [saving, setSaving] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);

  const hasConfig = integration.config && Object.values(integration.config).some(Boolean);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await api.post<Integration>(
        `/admin/integrations/${integration.key}/settings`,
        { config: values }
      );
      toast.success("تم حفظ الإعدادات بنجاح");
      onSaved(updated);
      onClose();
    } catch (e: unknown) {
      const err = e as { message?: string };
      toast.error(err?.message ?? "فشل حفظ الإعدادات");
    } finally {
      setSaving(false);
    }
  }

  async function handleDisconnect() {
    if (!confirm("هل أنت متأكد من إزالة إعدادات هذا التطبيق؟")) return;
    setDisconnecting(true);
    try {
      const updated = await api.post<Integration>(`/admin/integrations/${integration.key}/disconnect`, {});
      toast.success("تم إزالة الإعدادات");
      onSaved(updated);
      onClose();
    } catch {
      toast.error("فشل إزالة الإعدادات");
    } finally {
      setDisconnecting(false);
    }
  }

  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 1000,
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)",
    }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{
        background: "#fff", borderRadius: 16, width: "100%", maxWidth: 480,
        margin: 16, boxShadow: "0 20px 60px rgba(0,0,0,0.18)",
        overflow: "hidden", display: "flex", flexDirection: "column", maxHeight: "90vh",
      }}>
        {/* Header */}
        <div style={{
          padding: "20px 24px 16px", borderBottom: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", gap: 12,
        }}>
          <span style={{ fontSize: "2rem", lineHeight: 1 }}>{integration.icon}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, fontSize: "1rem", color: "#111" }}>{integration.name}</div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280", marginTop: 2 }}>{integration.description}</div>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 30, height: 30, borderRadius: "50%", border: "1px solid #e5e7eb",
              background: "#f9fafb", cursor: "pointer", fontSize: "0.9rem", color: "#6b7280",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}
          >✕</button>
        </div>

        {/* Form */}
        <div style={{ padding: "20px 24px", overflowY: "auto", flex: 1 }}>
          {integration.configSchema.map((field) => (
            <div key={field.key} style={{ marginBottom: 18 }}>
              <label style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: 6 }}>
                {field.label}
                {field.required && <span style={{ color: "#ef4444", marginRight: 2 }}>*</span>}
              </label>
              <input
                type="text"
                value={values[field.key] ?? ""}
                onChange={(e) => setValues((v) => ({ ...v, [field.key]: e.target.value }))}
                placeholder={field.placeholder ?? ""}
                style={{
                  width: "100%", padding: "10px 14px", border: "1.5px solid #e5e7eb",
                  borderRadius: 8, fontSize: "0.9rem", color: "#111", background: "#fafafa",
                  outline: "none", boxSizing: "border-box", direction: "ltr", textAlign: "left",
                  fontFamily: "monospace",
                }}
                onFocus={(e) => (e.target.style.borderColor = "#16a34a")}
                onBlur={(e) => (e.target.style.borderColor = "#e5e7eb")}
              />
              {field.hint && (
                <div style={{ fontSize: "0.73rem", color: "#9ca3af", marginTop: 4 }}>{field.hint}</div>
              )}
            </div>
          ))}
        </div>

        {/* Footer */}
        <div style={{
          padding: "16px 24px", borderTop: "1px solid #f3f4f6",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          {hasConfig && (
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              style={{
                padding: "9px 16px", borderRadius: 8, border: "1.5px solid #fecaca",
                background: "#fff", color: "#dc2626", fontWeight: 600, fontSize: "0.82rem",
                cursor: "pointer",
              }}
            >
              {disconnecting ? "جاري الإزالة..." : "إزالة الإعدادات"}
            </button>
          )}
          <div style={{ flex: 1 }} />
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", borderRadius: 8, border: "1.5px solid #e5e7eb",
              background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: "0.85rem",
              cursor: "pointer",
            }}
          >
            إلغاء
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            style={{
              padding: "9px 24px", borderRadius: 8, border: "none",
              background: saving ? "#86efac" : "#16a34a", color: "#fff",
              fontWeight: 700, fontSize: "0.85rem", cursor: saving ? "not-allowed" : "pointer",
            }}
          >
            {saving ? "جاري الحفظ..." : "حفظ"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Integration Card ──────────────────────────────────────────────────────────

function IntegrationCard({
  integration,
  onToggle,
  onSettings,
  toggling,
}: {
  integration: Integration;
  onToggle: () => void;
  onSettings: () => void;
  toggling: boolean;
}) {
  const isActive = integration.status === "active";

  return (
    <div style={{
      background: "#fff", borderRadius: 14, border: "1.5px solid #e5e7eb",
      padding: "20px", display: "flex", flexDirection: "column", gap: 14,
      boxShadow: isActive ? "0 0 0 2px #bbf7d0" : "0 1px 4px rgba(0,0,0,0.05)",
      transition: "box-shadow .2s",
    }}>
      {/* Top row */}
      <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
        <span style={{
          fontSize: "2.2rem", lineHeight: 1,
          background: "#f9fafb", borderRadius: 10,
          width: 52, height: 52, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
        }}>
          {integration.icon}
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111", marginBottom: 4 }}>
            {integration.name}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            <span style={{
              fontSize: "0.68rem", fontWeight: 600, padding: "2px 7px", borderRadius: 99,
              background: "#f3f4f6", color: "#6b7280",
            }}>
              {integration.categoryLabel}
            </span>
            <StatusBadge status={integration.status} />
          </div>
        </div>
        <Toggle
          checked={integration.isEnabled}
          onChange={onToggle}
          disabled={toggling}
        />
      </div>

      {/* Description */}
      <p style={{ fontSize: "0.8rem", color: "#6b7280", lineHeight: 1.5, margin: 0 }}>
        {integration.description}
      </p>

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {integration.updatedAt ? (
          <span style={{ fontSize: "0.7rem", color: "#9ca3af" }}>
            آخر تحديث: {new Date(integration.updatedAt).toLocaleDateString("ar-SY")}
          </span>
        ) : (
          <span style={{ fontSize: "0.7rem", color: "#d1d5db" }}>لم يُعدَّ بعد</span>
        )}
        <button
          onClick={onSettings}
          style={{
            padding: "7px 16px", borderRadius: 8, border: "1.5px solid #e5e7eb",
            background: "#f9fafb", color: "#374151", fontWeight: 600, fontSize: "0.78rem",
            cursor: "pointer",
          }}
        >
          ⚙ الإعدادات
        </button>
      </div>
    </div>
  );
}

// ── Category Tabs ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  { key: "all", label: "الكل" },
  { key: "analytics", label: "تحليلات" },
  { key: "marketing", label: "التسويق" },
  { key: "seo", label: "SEO" },
  { key: "heatmaps", label: "خرائط حرارة" },
];

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminIntegrationsPage() {
  const { isLoading: authLoading } = useProtectedRoute({ allowedRoles: ["SuperAdmin"] });
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState("all");
  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [toggling, setToggling] = useState<string | null>(null);

  const fetchAll = useCallback(async () => {
    try {
      const data = await api.get<Integration[]>("/admin/integrations");
      setIntegrations(data);
    } catch {
      toast.error("فشل تحميل التطبيقات المدمجة");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  async function handleToggle(integration: Integration) {
    const action = integration.isEnabled ? "disable" : "enable";
    setToggling(integration.key);
    try {
      const updated = await api.post<Integration>(`/admin/integrations/${integration.key}/${action}`, {});
      setIntegrations((prev) => prev.map((i) => (i.key === updated.key ? updated : i)));
      toast.success(updated.isEnabled ? `تم تفعيل ${updated.name}` : `تم إيقاف ${updated.name}`);
    } catch {
      toast.error("فشلت العملية");
    } finally {
      setToggling(null);
    }
  }

  function handleSaved(updated: Integration) {
    setIntegrations((prev) => prev.map((i) => (i.key === updated.key ? updated : i)));
  }

  const filtered = category === "all"
    ? integrations
    : integrations.filter((i) => i.category === category);

  const selectedIntegration = integrations.find((i) => i.key === selectedKey) ?? null;

  const activeCount  = integrations.filter((i) => i.status === "active").length;
  const totalCount   = integrations.length;

  if (authLoading) return <LoadingRow />;

  return (
    <div style={{ padding: "0 0 48px" }}>
      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
        border: "1px solid #bbf7d0", borderRadius: 14, padding: "24px 28px",
        marginBottom: 28, display: "flex", alignItems: "center", justifyContent: "space-between",
        gap: 16, flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ fontSize: "1.35rem", fontWeight: 800, color: "#14532d", margin: "0 0 6px" }}>
            التطبيقات المدمجة
          </h1>
          <p style={{ fontSize: "0.85rem", color: "#16a34a", margin: 0 }}>
            ربط منصة بيوت بأدوات التحليل والتسويق ومحركات البحث
          </p>
        </div>
        <div style={{
          background: "#fff", borderRadius: 10, padding: "12px 20px",
          textAlign: "center", border: "1px solid #bbf7d0",
        }}>
          <div style={{ fontSize: "1.6rem", fontWeight: 800, color: "#16a34a", lineHeight: 1 }}>
            {activeCount}/{totalCount}
          </div>
          <div style={{ fontSize: "0.72rem", color: "#6b7280", marginTop: 4 }}>تطبيق مفعَّل</div>
        </div>
      </div>

      {/* Category Tabs */}
      <div style={{
        display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap",
      }}>
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategory(cat.key)}
            style={{
              padding: "7px 18px", borderRadius: 99, fontWeight: 600, fontSize: "0.82rem",
              border: "1.5px solid",
              borderColor: category === cat.key ? "#16a34a" : "#e5e7eb",
              background: category === cat.key ? "#f0fdf4" : "#fff",
              color: category === cat.key ? "#16a34a" : "#6b7280",
              cursor: "pointer",
            }}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <LoadingRow />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px", color: "#9ca3af", fontSize: "0.9rem" }}>
          لا توجد تطبيقات في هذا التصنيف
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(290px, 1fr))",
          gap: 18,
        }}>
          {filtered.map((integration) => (
            <IntegrationCard
              key={integration.key}
              integration={integration}
              onToggle={() => handleToggle(integration)}
              onSettings={() => setSelectedKey(integration.key)}
              toggling={toggling === integration.key}
            />
          ))}
        </div>
      )}

      {/* Modal */}
      {selectedIntegration && (
        <SettingsModal
          integration={selectedIntegration}
          onClose={() => setSelectedKey(null)}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
