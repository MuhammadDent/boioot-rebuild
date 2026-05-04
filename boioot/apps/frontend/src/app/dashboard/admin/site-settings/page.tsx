"use client";

import { useState, useEffect } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi, type SiteSettingsPayload } from "@/features/admin/api";
import { useSiteSettings } from "@/context/SiteSettingsContext";

// ── Toggle row ────────────────────────────────────────────────────────────────

function ToggleRow({
  label,
  description,
  checked,
  onChange,
  disabled,
}: {
  label:       string;
  description: string;
  checked:     boolean;
  onChange:    (v: boolean) => void;
  disabled:    boolean;
}) {
  return (
    <div
      style={{
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
        gap:            "1rem",
        padding:        "1.25rem 1.5rem",
        borderBottom:   "1px solid #f1f5f9",
      }}
    >
      <div>
        <p style={{ margin: 0, fontWeight: 600, color: "#1e293b", fontSize: "0.95rem" }}>
          {label}
        </p>
        <p style={{ margin: "0.2rem 0 0", color: "#64748b", fontSize: "0.82rem" }}>
          {description}
        </p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        style={{
          flexShrink:    0,
          width:         "52px",
          height:        "28px",
          borderRadius:  "999px",
          border:        "none",
          cursor:        disabled ? "not-allowed" : "pointer",
          background:    checked ? "#0f766e" : "#cbd5e1",
          position:      "relative",
          transition:    "background 0.2s",
          opacity:       disabled ? 0.6 : 1,
        }}
      >
        <span
          style={{
            position:     "absolute",
            top:          "3px",
            right:        checked ? "3px" : "21px",
            width:        "22px",
            height:       "22px",
            borderRadius: "50%",
            background:   "#fff",
            transition:   "right 0.2s",
            boxShadow:    "0 1px 3px rgba(0,0,0,.25)",
          }}
        />
      </button>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const SECTIONS = [
  {
    key:         "sectionProjectsEnabled"  as keyof SiteSettingsPayload,
    label:       "قسم المشاريع",
    description: "عرض صفحة المشاريع وروابطها في القائمة الرئيسية",
  },
  {
    key:         "sectionRequestsEnabled" as keyof SiteSettingsPayload,
    label:       "قسم الطلبات",
    description: "عرض صفحة طلبات الشراء وروابطها في القائمة الرئيسية",
  },
  {
    key:         "sectionDailyRentEnabled" as keyof SiteSettingsPayload,
    label:       "قسم الإيجار اليومي",
    description: "عرض صفحة الإيجار اليومي وروابطها في القائمة الرئيسية",
  },
  {
    key:         "sectionBlogEnabled" as keyof SiteSettingsPayload,
    label:       "قسم المدونة",
    description: "عرض صفحة المدونة وروابطها في القائمة الرئيسية",
  },
] as const;

const DEFAULT_FORM: SiteSettingsPayload = {
  sectionProjectsEnabled:  true,
  sectionRequestsEnabled:  true,
  sectionDailyRentEnabled: true,
  sectionBlogEnabled:      true,
};

export default function AdminSiteSettingsPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });
  const { refresh: refreshPublic }  = useSiteSettings();

  const [form,    setForm]    = useState<SiteSettingsPayload>(DEFAULT_FORM);
  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    adminApi
      .getSiteSettings()
      .then((data) => setForm(data))
      .catch(() => setError("تعذّر تحميل الإعدادات"))
      .finally(() => setLoading(false));
  }, [authLoading]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const updated = await adminApi.updateSiteSettings(form);
      setForm(updated);
      await refreshPublic();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch {
      setError("تعذّر حفظ الإعدادات، حاول مجدداً");
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) return <LoadingRow />;

  return (
    <div dir="rtl" style={{ maxWidth: "640px", margin: "0 auto", padding: "2rem 1rem" }}>

      {/* Header */}
      <div style={{ marginBottom: "1.75rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 700, color: "#0f172a" }}>
          إعدادات الموقع
        </h1>
        <p style={{ margin: "0.35rem 0 0", color: "#64748b", fontSize: "0.88rem" }}>
          تحكّم في أقسام الموقع التي تظهر للزوار وفي القائمة الرئيسية
        </p>
      </div>

      {/* Card */}
      <div
        style={{
          background:   "#fff",
          borderRadius: "12px",
          border:       "1px solid #e2e8f0",
          overflow:     "hidden",
          marginBottom: "1.5rem",
        }}
      >
        <div
          style={{
            padding:      "1rem 1.5rem",
            borderBottom: "1px solid #e2e8f0",
            background:   "#f8fafc",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600, color: "#475569", fontSize: "0.82rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            أقسام الموقع
          </p>
        </div>

        {SECTIONS.map((s) => (
          <ToggleRow
            key={s.key}
            label={s.label}
            description={s.description}
            checked={form[s.key]}
            disabled={saving}
            onChange={(v) => setForm((prev) => ({ ...prev, [s.key]: v }))}
          />
        ))}
      </div>

      {/* Feedback */}
      {error && (
        <p style={{ color: "#dc2626", fontSize: "0.88rem", marginBottom: "1rem" }}>
          {error}
        </p>
      )}
      {success && (
        <p style={{ color: "#16a34a", fontSize: "0.88rem", marginBottom: "1rem" }}>
          تم حفظ الإعدادات بنجاح
        </p>
      )}

      {/* Save button */}
      <button
        type="button"
        onClick={handleSave}
        disabled={saving}
        style={{
          display:       "inline-flex",
          alignItems:    "center",
          gap:           "0.5rem",
          padding:       "0.65rem 1.75rem",
          background:    saving ? "#94a3b8" : "#0f766e",
          color:         "#fff",
          border:        "none",
          borderRadius:  "8px",
          fontSize:      "0.9rem",
          fontWeight:    600,
          cursor:        saving ? "not-allowed" : "pointer",
          transition:    "background 0.2s",
        }}
      >
        {saving ? "جارٍ الحفظ..." : "حفظ الإعدادات"}
      </button>
    </div>
  );
}
