"use client";

import { useState, useEffect } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { blogAdminApi } from "@/features/admin/blog-api";
import { normalizeError } from "@/lib/api";
import type { BlogSeoSettingsDto } from "@/types";

const cardStyle: React.CSSProperties = {
  background: "var(--color-card-bg, #fff)",
  border: "1px solid var(--color-border, #e5e7eb)",
  borderRadius: 12,
  padding: "1.25rem",
  marginBottom: "1.25rem",
};

const labelStyle: React.CSSProperties = {
  display: "block",
  fontSize: "0.82rem",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: "0.35rem",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.75rem",
  borderRadius: 8,
  border: "1px solid var(--color-border, #e5e7eb)",
  fontSize: "0.88rem",
  fontFamily: "inherit",
  background: "var(--color-input-bg, #fafafa)",
  boxSizing: "border-box",
};

const TEMPLATE_VARS = [
  { token: "{PostTitle}",       label: "عنوان المقال" },
  { token: "{Excerpt}",         label: "المقتطف" },
  { token: "{SiteName}",        label: "اسم الموقع" },
  { token: "{PrimaryCategory}", label: "التصنيف الرئيسي" },
  { token: "{PublishDate}",     label: "تاريخ النشر" },
  { token: "{Year}",            label: "السنة" },
  { token: "{ReadTime}",        label: "وقت القراءة" },
];

export default function BlogSeoSettingsPage() {
  const { isLoading: authLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [settings, setSettings] = useState<BlogSeoSettingsDto | null>(null);
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [error,   setError]     = useState("");
  const [success, setSuccess]   = useState("");

  // Form state
  const [siteName,                       setSiteName]                       = useState("");
  const [defaultPostSeoTitleTemplate,    setDefaultPostSeoTitleTemplate]    = useState("");
  const [defaultPostSeoDescTemplate,     setDefaultPostSeoDescTemplate]     = useState("");
  const [defaultBlogListSeoTitle,        setDefaultBlogListSeoTitle]        = useState("");
  const [defaultBlogListSeoDescription,  setDefaultBlogListSeoDescription]  = useState("");

  useEffect(() => {
    if (authLoading) return;
    blogAdminApi.getSeoSettings()
      .then(data => {
        setSettings(data);
        setSiteName(data.siteName ?? "");
        setDefaultPostSeoTitleTemplate(data.defaultPostSeoTitleTemplate ?? "");
        setDefaultPostSeoDescTemplate(data.defaultPostSeoDescriptionTemplate ?? "");
        setDefaultBlogListSeoTitle(data.defaultBlogListSeoTitle ?? "");
        setDefaultBlogListSeoDescription(data.defaultBlogListSeoDescription ?? "");
      })
      .catch(e => setError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      const updated = await blogAdminApi.updateSeoSettings({
        siteName,
        defaultPostSeoTitleTemplate,
        defaultPostSeoDescriptionTemplate: defaultPostSeoDescTemplate,
        defaultBlogListSeoTitle,
        defaultBlogListSeoDescription,
      });
      setSettings(updated);
      setSuccess("تم حفظ الإعدادات بنجاح ✓");
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  function insertToken(token: string, setter: React.Dispatch<React.SetStateAction<string>>) {
    setter(prev => prev + token);
  }

  function TokenBadges({ setter }: { setter: React.Dispatch<React.SetStateAction<string>> }) {
    return (
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.35rem", marginTop: "0.4rem" }}>
        {TEMPLATE_VARS.map(v => (
          <button
            key={v.token}
            type="button"
            onClick={() => insertToken(v.token, setter)}
            disabled={saving}
            style={{
              fontSize: "0.7rem", padding: "0.15rem 0.5rem", borderRadius: 4,
              border: "1px solid var(--color-border, #e5e7eb)", cursor: "pointer",
              background: "var(--color-bg-muted, #f3f4f6)", color: "var(--color-text-secondary)",
              fontFamily: "monospace",
            }}
          >
            {v.token} <span style={{ fontFamily: "inherit", opacity: 0.7 }}>({v.label})</span>
          </button>
        ))}
      </div>
    );
  }

  if (authLoading || loading) {
    return (
      <div className="dash-container" style={{ paddingTop: "2rem" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="dash-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem", maxWidth: 780 }}>
      <DashboardBackLink href="/dashboard/admin/blog" label="→ قائمة المقالات" marginBottom="0.75rem" />
      <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.4rem", fontWeight: 700 }}>إعدادات SEO للمدونة</h1>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
        تحكم في القوالب الافتراضية لعناوين ووصف محركات البحث، وأوضاع توليد slug والـ meta tags.
      </p>

      {error && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #c62828)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#f0fdf4", color: "#166534", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* Site Info */}
        <div style={cardStyle}>
          <p style={{ margin: "0 0 0.85rem", fontWeight: 700, fontSize: "0.95rem" }}>معلومات الموقع</p>
          <div>
            <label style={labelStyle}>اسم الموقع (SiteName)</label>
            <input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              style={inputStyle}
              placeholder="بيوت"
              disabled={saving}
            />
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "var(--color-text-secondary)" }}>
              يُستخدم في المتغير <code style={{ fontFamily: "monospace" }}>{"{SiteName}"}</code> ضمن القوالب أدناه.
            </p>
          </div>
        </div>

        {/* Post Page SEO Templates */}
        <div style={cardStyle}>
          <p style={{ margin: "0 0 0.85rem", fontWeight: 700, fontSize: "0.95rem" }}>قالب SEO — صفحة المقال</p>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            يُطبّق هذا القالب عند ضبط وضع المقال على "قالب". المتغيرات المتاحة:
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>قالب عنوان SEO للمقال</label>
            <input
              value={defaultPostSeoTitleTemplate}
              onChange={e => setDefaultPostSeoTitleTemplate(e.target.value)}
              style={{ ...inputStyle, fontFamily: "monospace" }}
              placeholder="{PostTitle} | {SiteName}"
              disabled={saving}
              dir="ltr"
            />
            <TokenBadges setter={setDefaultPostSeoTitleTemplate} />
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: defaultPostSeoTitleTemplate.length > 70 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
              {defaultPostSeoTitleTemplate.length} حرف (الحد المثالي 60)
            </p>
          </div>

          <div>
            <label style={labelStyle}>قالب وصف SEO للمقال</label>
            <textarea
              value={defaultPostSeoDescTemplate}
              onChange={e => setDefaultPostSeoDescTemplate(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: "vertical", fontFamily: "monospace" }}
              placeholder="{Excerpt}"
              disabled={saving}
              dir="ltr"
            />
            <TokenBadges setter={setDefaultPostSeoDescTemplate} />
            <p style={{ margin: "0.3rem 0 0", fontSize: "0.72rem", color: defaultPostSeoDescTemplate.length > 170 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
              {defaultPostSeoDescTemplate.length} حرف (الحد المثالي 160)
            </p>
          </div>
        </div>

        {/* Blog List Page SEO */}
        <div style={cardStyle}>
          <p style={{ margin: "0 0 0.85rem", fontWeight: 700, fontSize: "0.95rem" }}>SEO — صفحة قائمة المقالات (/blog)</p>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>عنوان SEO لصفحة المدونة</label>
            <input
              value={defaultBlogListSeoTitle}
              onChange={e => setDefaultBlogListSeoTitle(e.target.value)}
              style={inputStyle}
              placeholder="المدونة | بيوت"
              disabled={saving}
            />
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: defaultBlogListSeoTitle.length > 70 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
              {defaultBlogListSeoTitle.length} / 60 حرف
            </p>
          </div>

          <div>
            <label style={labelStyle}>وصف SEO لصفحة المدونة</label>
            <textarea
              value={defaultBlogListSeoDescription}
              onChange={e => setDefaultBlogListSeoDescription(e.target.value)}
              style={{ ...inputStyle, minHeight: 70, resize: "vertical" }}
              placeholder="تصفح أحدث المقالات العقارية من بيوت سوريا..."
              disabled={saving}
            />
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.72rem", color: defaultBlogListSeoDescription.length > 170 ? "var(--color-error)" : "var(--color-text-secondary)" }}>
              {defaultBlogListSeoDescription.length} / 160 حرف
            </p>
          </div>
        </div>

        {/* Template Variables Reference */}
        <div style={{ ...cardStyle, background: "var(--color-bg-muted, #f9fafb)" }}>
          <p style={{ margin: "0 0 0.6rem", fontWeight: 700, fontSize: "0.88rem" }}>📌 المتغيرات المتاحة في القوالب</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "0.4rem" }}>
            {TEMPLATE_VARS.map(v => (
              <div key={v.token} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                <code style={{ fontFamily: "monospace", background: "#e8f5e9", color: "var(--color-primary)", padding: "0.1rem 0.35rem", borderRadius: 4, fontSize: "0.75rem" }}>
                  {v.token}
                </code>
                <span style={{ color: "var(--color-text-secondary)" }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.65rem 2rem",
              background: "var(--color-primary)",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              fontSize: "0.9rem",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
              fontFamily: "inherit",
            }}
          >
            {saving ? "جاري الحفظ..." : "حفظ الإعدادات"}
          </button>
        </div>
      </form>
    </div>
  );
}
