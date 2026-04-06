"use client";

import { useEffect, useState, useCallback } from "react";
import {
  loadPageSections,
  savePageSections,
  resetPageSections,
  PAGE_SECTIONS_DEFAULTS,
} from "@/lib/page-sections";
import type { PageSectionsConfig } from "@/lib/page-sections";

// ─────────────────────────────────────────────────────────────────────────────
// Admin — Page Sections Manager
// /dashboard/admin/sections
// ─────────────────────────────────────────────────────────────────────────────

type SaveStatus = "idle" | "saving" | "saved" | "error";

export default function AdminPageSectionsPage() {
  const [config, setConfig] = useState<PageSectionsConfig>(PAGE_SECTIONS_DEFAULTS);
  const [status, setStatus] = useState<SaveStatus>("idle");

  useEffect(() => {
    setConfig(loadPageSections());
  }, []);

  const handleSave = useCallback(() => {
    setStatus("saving");
    try {
      savePageSections(config);
      setStatus("saved");
      setTimeout(() => setStatus("idle"), 2500);
    } catch {
      setStatus("error");
    }
  }, [config]);

  const handleReset = useCallback(() => {
    if (!confirm("هل تريد إعادة ضبط جميع الإعدادات إلى القيم الافتراضية؟")) return;
    resetPageSections();
    setConfig(PAGE_SECTIONS_DEFAULTS);
    setStatus("idle");
  }, []);

  function setGlobal(key: "showFooter" | "showHero", value: boolean) {
    setConfig((prev) => ({ ...prev, [key]: value }));
  }

  function setFooterCTA(key: keyof PageSectionsConfig["footerCTA"], value: string | boolean) {
    setConfig((prev) => ({
      ...prev,
      footerCTA: { ...prev.footerCTA, [key]: value },
    }));
  }

  const cta = config.footerCTA;

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 780, direction: "rtl" }}>

      {/* ── Page header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ fontSize: "1.35rem", fontWeight: 700, color: "#111827", margin: 0 }}>
          مقاطع الصفحات
        </h1>
        <p style={{ color: "#6b7280", marginTop: "0.35rem", fontSize: "0.875rem" }}>
          تحكّم في المحتوى الديناميكي للموقع — بدون لمس الكود.
          يمكن إضافة مقاطع جديدة (بانرات، عروض، صفحات هبوط) هنا مستقبلاً.
        </p>
      </div>

      {/* ── Visibility Flags ────────────────────────────────────────────────── */}
      <div style={cardStyle}>
        <div style={{ padding: "1.1rem 1.5rem", borderBottom: "1px solid #f3f4f6", background: "#fafafa" }}>
          <span style={badgeStyle}>Visibility</span>
          <h2 style={{ margin: "0.4rem 0 0", fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
            إظهار / إخفاء الأقسام
          </h2>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
            تحكّم في ظهور الأقسام الرئيسية للموقع — يُطبَّق فوراً على جميع الزوار.
          </p>
        </div>

        <div style={{ padding: "1.25rem 1.5rem", display: "flex", flexDirection: "column", gap: "1rem" }}>
          <FlagRow
            label="Footer (التذييل)"
            hint="الجزء السفلي من كل صفحة — الروابط وبيانات الشركة"
            enabled={config.showFooter}
            onToggle={() => setGlobal("showFooter", !config.showFooter)}
          />
          <FlagRow
            label="Hero Slider (شريط الصور الرئيسي)"
            hint="الشريط الكبير بالصور في الجزء العلوي من الصفحة الرئيسية"
            enabled={config.showHero}
            onToggle={() => setGlobal("showHero", !config.showHero)}
          />
        </div>
      </div>

      {/* ── Section card: Footer CTA ─────────────────────────────────────────── */}
      <div style={cardStyle}>

        {/* Card header */}
        <div style={cardHeaderStyle}>
          <div>
            <span style={badgeStyle}>Footer</span>
            <h2 style={{ margin: "0.4rem 0 0", fontSize: "1rem", fontWeight: 700, color: "#111827" }}>
              شريط الدعوة للعمل (CTA Strip)
            </h2>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.8rem", color: "#6b7280" }}>
              الشريط الأخضر أعلى تذييل الصفحة — «ابدأ الآن في عرض عقارك أو طلبك»
            </p>
          </div>

          {/* Enable / Disable toggle */}
          <label style={toggleWrapStyle} aria-label="تفعيل أو تعطيل القسم">
            <span style={{ fontSize: "0.82rem", color: cta.isEnabled ? "#166534" : "#6b7280", fontWeight: 600 }}>
              {cta.isEnabled ? "مفعّل" : "معطّل"}
            </span>
            <div
              role="switch"
              aria-checked={cta.isEnabled}
              onClick={() => setFooterCTA("isEnabled", !cta.isEnabled)}
              style={{
                ...toggleTrackStyle,
                background: cta.isEnabled ? "#16a34a" : "#d1d5db",
              }}
            >
              <div style={{
                ...toggleThumbStyle,
                transform: cta.isEnabled ? "translateX(-20px)" : "translateX(0)",
              }} />
            </div>
          </label>
        </div>

        {/* Fields — shown even when disabled so admin can pre-configure */}
        <div style={{ padding: "1.25rem 1.5rem", opacity: cta.isEnabled ? 1 : 0.5, transition: "opacity 0.2s" }}>

          {/* Row: overline */}
          <FieldRow label="السطر العلوي (Overline)" hint="النص الصغير فوق العنوان الرئيسي">
            <input
              style={inputStyle}
              value={cta.overline}
              onChange={(e) => setFooterCTA("overline", e.target.value)}
              placeholder="مثال: منصة عقارية سورية"
            />
          </FieldRow>

          {/* Row: title */}
          <FieldRow label="العنوان الرئيسي *" hint="النص الكبير — العنوان الرئيسي للقسم">
            <input
              style={inputStyle}
              value={cta.title}
              onChange={(e) => setFooterCTA("title", e.target.value)}
              placeholder="مثال: ابدأ الآن في عرض عقارك أو طلبك"
            />
          </FieldRow>

          {/* Row: subtitle */}
          <FieldRow label="النص التوضيحي (Subtitle)" hint="الجملة التفسيرية أسفل العنوان">
            <textarea
              style={{ ...inputStyle, minHeight: 72, resize: "vertical" }}
              value={cta.subtitle}
              onChange={(e) => setFooterCTA("subtitle", e.target.value)}
              placeholder="مثال: سواء كنت صاحب عقار أو تبحث عن فرصة…"
            />
          </FieldRow>

          {/* Row: primary button */}
          <FieldRow label="الزر الأساسي" hint="النص والرابط للزر الرئيسي (الأخضر)">
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={cta.primaryButtonText}
                onChange={(e) => setFooterCTA("primaryButtonText", e.target.value)}
                placeholder="نص الزر — مثال: أضف إعلانك"
              />
              <input
                style={{ ...inputStyle, flex: 1, direction: "ltr", textAlign: "left" }}
                value={cta.primaryButtonLink}
                onChange={(e) => setFooterCTA("primaryButtonLink", e.target.value)}
                placeholder="/post-ad"
              />
            </div>
          </FieldRow>

          {/* Row: secondary button */}
          <FieldRow label="الزر الثانوي" hint="النص والرابط للزر الثانوي (شفاف)">
            <div style={{ display: "flex", gap: "0.75rem" }}>
              <input
                style={{ ...inputStyle, flex: 1 }}
                value={cta.secondaryButtonText}
                onChange={(e) => setFooterCTA("secondaryButtonText", e.target.value)}
                placeholder="نص الزر — مثال: أضف طلبك"
              />
              <input
                style={{ ...inputStyle, flex: 1, direction: "ltr", textAlign: "left" }}
                value={cta.secondaryButtonLink}
                onChange={(e) => setFooterCTA("secondaryButtonLink", e.target.value)}
                placeholder="/requests"
              />
            </div>
          </FieldRow>

        </div>
      </div>

      {/* ── Action bar ──────────────────────────────────────────────────────── */}
      <div style={actionBarStyle}>
        <button onClick={handleReset} style={resetBtnStyle}>
          إعادة الضبط
        </button>
        <button
          onClick={handleSave}
          disabled={status === "saving"}
          style={{
            ...saveBtnStyle,
            opacity: status === "saving" ? 0.7 : 1,
          }}
        >
          {status === "saving" ? "جارٍ الحفظ…" :
           status === "saved"  ? "✓ تم الحفظ" :
           status === "error"  ? "! خطأ في الحفظ" :
           "حفظ التغييرات"}
        </button>
      </div>

      {/* ── Info note ────────────────────────────────────────────────────────── */}
      <p style={{ fontSize: "0.75rem", color: "#9ca3af", marginTop: "1rem", textAlign: "center" }}>
        التغييرات محفوظة محلياً وتظهر فوراً على الموقع للزوار.
        مستقبلاً ستُخزَّن في قاعدة البيانات.
      </p>

    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function FlagRow({
  label,
  hint,
  enabled,
  onToggle,
}: {
  label: string;
  hint?: string;
  enabled: boolean;
  onToggle: () => void;
}) {
  return (
    <div style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "0.75rem 0",
      borderBottom: "1px solid #f3f4f6",
    }}>
      <div>
        <div style={{ fontWeight: 600, fontSize: "0.88rem", color: "#111827" }}>{label}</div>
        {hint && <div style={{ fontSize: "0.76rem", color: "#9ca3af", marginTop: "0.15rem" }}>{hint}</div>}
      </div>
      <label style={toggleWrapStyle} aria-label={`تبديل ${label}`}>
        <span style={{ fontSize: "0.79rem", color: enabled ? "#166534" : "#6b7280", fontWeight: 600 }}>
          {enabled ? "ظاهر" : "مخفي"}
        </span>
        <div
          role="switch"
          aria-checked={enabled}
          onClick={onToggle}
          style={{ ...toggleTrackStyle, background: enabled ? "#16a34a" : "#d1d5db" }}
        >
          <div style={{
            ...toggleThumbStyle,
            transform: enabled ? "translateX(-20px)" : "translateX(0)",
          }} />
        </div>
      </label>
    </div>
  );
}

function FieldRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{ marginBottom: "1.1rem" }}>
      <label style={{ display: "block", fontWeight: 600, fontSize: "0.82rem", color: "#374151", marginBottom: "0.2rem" }}>
        {label}
      </label>
      {hint && (
        <p style={{ fontSize: "0.72rem", color: "#9ca3af", margin: "0 0 0.4rem" }}>{hint}</p>
      )}
      {children}
    </div>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const cardStyle: React.CSSProperties = {
  background: "#fff",
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  marginBottom: "1.25rem",
  overflow: "hidden",
  boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
};

const cardHeaderStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  padding: "1.1rem 1.5rem",
  borderBottom: "1px solid #f3f4f6",
  background: "#fafafa",
};

const badgeStyle: React.CSSProperties = {
  display: "inline-block",
  padding: "0.15rem 0.55rem",
  fontSize: "0.68rem",
  fontWeight: 700,
  background: "#dcfce7",
  color: "#166534",
  borderRadius: 99,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const toggleWrapStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "0.5rem",
  cursor: "pointer",
  userSelect: "none",
  flexShrink: 0,
};

const toggleTrackStyle: React.CSSProperties = {
  width: 44,
  height: 24,
  borderRadius: 99,
  position: "relative",
  cursor: "pointer",
  transition: "background 0.2s",
};

const toggleThumbStyle: React.CSSProperties = {
  position: "absolute",
  top: 3,
  right: 3,
  width: 18,
  height: 18,
  borderRadius: "50%",
  background: "#fff",
  boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
  transition: "transform 0.2s",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.5rem 0.75rem",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: "0.875rem",
  color: "#111827",
  background: "#fff",
  outline: "none",
  fontFamily: "inherit",
  boxSizing: "border-box",
};


const actionBarStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "flex-end",
  gap: "0.75rem",
  paddingTop: "0.5rem",
};

const saveBtnStyle: React.CSSProperties = {
  padding: "0.55rem 1.5rem",
  background: "#16a34a",
  color: "#fff",
  border: "none",
  borderRadius: 8,
  fontWeight: 700,
  fontSize: "0.875rem",
  cursor: "pointer",
  fontFamily: "inherit",
};

const resetBtnStyle: React.CSSProperties = {
  padding: "0.55rem 1.1rem",
  background: "transparent",
  color: "#6b7280",
  border: "1px solid #e5e7eb",
  borderRadius: 8,
  fontWeight: 500,
  fontSize: "0.875rem",
  cursor: "pointer",
  fontFamily: "inherit",
};
