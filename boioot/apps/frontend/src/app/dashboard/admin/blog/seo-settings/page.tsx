"use client";

import { useState, useEffect, useMemo } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { blogAdminApi } from "@/features/admin/blog-api";
import { normalizeError } from "@/lib/api";
import { resolveTemplate, SEO_VARIABLES } from "@/lib/seo-resolver";
import type { BlogSeoSettingsDto } from "@/types";

// ── Styles ─────────────────────────────────────────────────────────────────────

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
  transition: "border-color 0.2s ease",
};

// ── SEO counter helpers (same logic as BlogPostForm) ──────────────────────────

interface SeoStatus { color: string; hint: string; pct: number; }

function getTitleStatus(len: number): SeoStatus {
  if (len === 0)  return { color: "#9ca3af", hint: "—",               pct: 0 };
  if (len < 40)   return { color: "#ef4444", hint: "قصير جداً",       pct: (len / 40) * 45 };
  if (len < 50)   return { color: "#f59e0b", hint: "قصير نسبياً",     pct: 45 + ((len - 40) / 10) * 20 };
  if (len <= 60)  return { color: "#22c55e", hint: "مثالي ✓",          pct: 65 + ((len - 50) / 10) * 25 };
  if (len <= 70)  return { color: "#f59e0b", hint: "طويل نسبياً",     pct: 90 + ((len - 60) / 10) * 7 };
  return           { color: "#ef4444", hint: "طويل جداً",             pct: 100 };
}

function getDescStatus(len: number): SeoStatus {
  if (len === 0)  return { color: "#9ca3af", hint: "—",               pct: 0 };
  if (len < 120)  return { color: "#ef4444", hint: "قصير جداً",       pct: (len / 120) * 45 };
  if (len < 140)  return { color: "#f59e0b", hint: "قصير نسبياً",     pct: 45 + ((len - 120) / 20) * 20 };
  if (len <= 160) return { color: "#22c55e", hint: "مثالي ✓",          pct: 65 + ((len - 140) / 20) * 25 };
  if (len <= 180) return { color: "#f59e0b", hint: "طويل نسبياً",     pct: 90 + ((len - 160) / 20) * 7 };
  return           { color: "#ef4444", hint: "طويل جداً",             pct: 100 };
}

function SeoCounter({ len, max, status }: { len: number; max: number; status: SeoStatus }) {
  return (
    <div style={{ marginTop: "0.3rem" }}>
      <div style={{ height: 3, background: "#e5e7eb", borderRadius: 99, overflow: "hidden", marginBottom: "0.22rem" }}>
        <div style={{
          height: "100%", width: `${Math.min(status.pct, 100)}%`,
          background: status.color, borderRadius: 99,
          transition: "width 0.25s ease, background-color 0.25s ease",
        }} />
      </div>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <span style={{ fontSize: "0.71rem", color: status.color, fontWeight: 500, transition: "color 0.25s" }}>{status.hint}</span>
        <span style={{ fontSize: "0.71rem", color: status.color, fontWeight: 600, transition: "color 0.25s", fontVariantNumeric: "tabular-nums" }}>{len} / {max}</span>
      </div>
    </div>
  );
}

// ── Mock post for live preview ─────────────────────────────────────────────────

const MOCK_VARS: Record<string, string> = {
  PostTitle:   "أفضل الأحياء السكنية في دمشق للعائلات",
  Excerpt:     "تعرف على أبرز الأحياء السكنية الراقية في دمشق، وما توفره من مرافق وخدمات مميزة للعائلات.",
  Category:    "عقارات دمشق",
  PublishDate: "٢١ مارس ٢٠٢٦",
  AuthorName:  "فريق بيوت",
  SiteName:    "", // injected at render time
};

// ── Live preview sub-components ────────────────────────────────────────────────

function GooglePreview({ title, description, url = "https://boioot.sy/blog/احياء-دمشق" }: {
  title: string; description: string; url?: string;
}) {
  const trimTitle = title.slice(0, 70) || "عنوان الصفحة";
  const trimDesc  = description.slice(0, 160) || "وصف الصفحة يظهر هنا في نتائج محرك البحث...";
  return (
    <div style={{ fontFamily: "Arial, sans-serif", maxWidth: 600 }}>
      <p style={{ margin: "0 0 0.15rem", fontSize: "0.72rem", color: "#202124", direction: "ltr" }}>
        {url}
      </p>
      <p style={{
        margin: "0 0 0.2rem", fontSize: "1.1rem", color: "#1a0dab",
        fontWeight: 400, lineHeight: 1.3, cursor: "pointer",
        textDecoration: "none",
      }}>{trimTitle}</p>
      <p style={{ margin: 0, fontSize: "0.82rem", color: "#4d5156", lineHeight: 1.55 }}>{trimDesc}</p>
    </div>
  );
}

function OgPreview({ title, description, siteName }: { title: string; description: string; siteName: string }) {
  const trimTitle = title.slice(0, 90) || "عنوان المقال";
  const trimDesc  = description.slice(0, 200) || "وصف المقال عند المشاركة على وسائل التواصل الاجتماعي.";
  return (
    <div style={{
      border: "1px solid #cfd9e0", borderRadius: 8, overflow: "hidden",
      fontFamily: "Arial, sans-serif", maxWidth: 480, background: "#fff",
    }}>
      <div style={{ height: 120, background: "linear-gradient(135deg, #e8f5e9, #c8e6c9)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.5">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
        </svg>
      </div>
      <div style={{ padding: "0.7rem 0.85rem" }}>
        <p style={{ margin: "0 0 0.2rem", fontSize: "0.68rem", color: "#8a9bb0", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {siteName || "boioot.sy"}
        </p>
        <p style={{ margin: "0 0 0.3rem", fontSize: "0.88rem", fontWeight: 700, color: "#1c2b33", lineHeight: 1.35 }}>{trimTitle}</p>
        <p style={{ margin: 0, fontSize: "0.78rem", color: "#4a5568", lineHeight: 1.5 }}>{trimDesc}</p>
      </div>
    </div>
  );
}

// ── Token badges ───────────────────────────────────────────────────────────────

function TokenBadges({
  setter, disabled,
}: { setter: React.Dispatch<React.SetStateAction<string>>; disabled: boolean }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "0.3rem", marginTop: "0.4rem" }}>
      {SEO_VARIABLES.map(v => (
        <button
          key={v.key}
          type="button"
          disabled={disabled}
          onClick={() => setter(prev => prev + v.key)}
          title={v.label}
          style={{
            fontSize: "0.68rem", padding: "0.15rem 0.45rem", borderRadius: 4,
            border: "1px solid #d1fae5", cursor: "pointer",
            background: "#f0fdf4", color: "#065f46",
            fontFamily: "monospace",
          }}
        >
          {v.key}
        </button>
      ))}
    </div>
  );
}

// ── Section divider ────────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <p style={{ margin: "0 0 0.75rem", fontWeight: 700, fontSize: "0.95rem", color: "var(--color-text-primary)" }}>
      {children}
    </p>
  );
}

function FieldSep() {
  return <div style={{ height: "1px", background: "var(--color-border, #e5e7eb)", margin: "1rem 0" }} />;
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function BlogSeoSettingsPage() {
  const { isLoading: authLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });

  const [loading, setLoading] = useState(true);
  const [saving,  setSaving]  = useState(false);
  const [error,   setError]   = useState("");
  const [success, setSuccess] = useState("");

  const [siteName,               setSiteName]               = useState("بيوت");
  const [postTitleTpl,           setPostTitleTpl]           = useState("{PostTitle} | {SiteName}");
  const [postDescTpl,            setPostDescTpl]            = useState("{Excerpt}");
  const [ogTitleTpl,             setOgTitleTpl]             = useState("{PostTitle} | {SiteName}");
  const [ogDescTpl,              setOgDescTpl]              = useState("{Excerpt}");
  const [listTitle,              setListTitle]              = useState("");
  const [listDescription,        setListDescription]        = useState("");

  const [activePreview, setActivePreview] = useState<"google" | "og">("google");

  useEffect(() => {
    if (authLoading) return;
    blogAdminApi.getSeoSettings()
      .then((data: BlogSeoSettingsDto) => {
        setSiteName(data.siteName ?? "بيوت");
        setPostTitleTpl(data.defaultPostSeoTitleTemplate ?? "{PostTitle} | {SiteName}");
        setPostDescTpl(data.defaultPostSeoDescriptionTemplate ?? "{Excerpt}");
        setOgTitleTpl(data.defaultOgTitleTemplate ?? "{PostTitle} | {SiteName}");
        setOgDescTpl(data.defaultOgDescriptionTemplate ?? "{Excerpt}");
        setListTitle(data.defaultBlogListSeoTitle ?? "");
        setListDescription(data.defaultBlogListSeoDescription ?? "");
      })
      .catch(e => setError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [authLoading]);

  // ── Resolved preview values ──────────────────────────────────────────────────

  const previewVars = useMemo(() => ({ ...MOCK_VARS, SiteName: siteName || "بيوت" }), [siteName]);

  const resolvedTitle = useMemo(() => resolveTemplate(postTitleTpl, previewVars).trim() || MOCK_VARS.PostTitle, [postTitleTpl, previewVars]);
  const resolvedDesc  = useMemo(() => resolveTemplate(postDescTpl,  previewVars).trim() || MOCK_VARS.Excerpt,    [postDescTpl,  previewVars]);
  const resolvedOgTitle = useMemo(() => resolveTemplate(ogTitleTpl, previewVars).trim() || resolvedTitle, [ogTitleTpl, previewVars, resolvedTitle]);
  const resolvedOgDesc  = useMemo(() => resolveTemplate(ogDescTpl,  previewVars).trim() || resolvedDesc,  [ogDescTpl,  previewVars, resolvedDesc]);

  // ── Save ─────────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true); setError(""); setSuccess("");
    try {
      await blogAdminApi.updateSeoSettings({
        siteName,
        defaultPostSeoTitleTemplate: postTitleTpl,
        defaultPostSeoDescriptionTemplate: postDescTpl,
        defaultOgTitleTemplate: ogTitleTpl,
        defaultOgDescriptionTemplate: ogDescTpl,
        defaultBlogListSeoTitle: listTitle,
        defaultBlogListSeoDescription: listDescription,
      });
      setSuccess("تم حفظ الإعدادات بنجاح ✓");
      setTimeout(() => setSuccess(""), 4000);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || loading) {
    return (
      <div className="dash-container" style={{ paddingTop: "2rem" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="dash-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem", maxWidth: 820 }}>
      <DashboardBackLink href="/dashboard/admin/blog" label="→ قائمة المقالات" marginBottom="0.75rem" />
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "0.35rem" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>إعدادات SEO للمدونة</h1>
      </div>
      <p style={{ margin: "0 0 1.5rem", fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>
        القوالب الافتراضية لعناوين ووصف محركات البحث وبطاقات المشاركة الاجتماعية.
      </p>

      {error && (
        <div style={{ background: "#fef2f2", color: "#c62828", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "#f0fdf4", color: "#166534", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.88rem" }}>
          {success}
        </div>
      )}

      <form onSubmit={handleSubmit}>

        {/* ── Site Name ── */}
        <div style={cardStyle}>
          <SectionTitle>🌐 اسم الموقع</SectionTitle>
          <div>
            <label style={labelStyle}>
              اسم الموقع
              <span style={{ fontWeight: 400, marginRight: "0.3rem", color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>
                — يُستبدل بدلاً من <code style={{ fontFamily: "monospace", background: "#f3f4f6", padding: "0 0.25rem", borderRadius: 3 }}>{"{SiteName}"}</code>
              </span>
            </label>
            <input
              value={siteName}
              onChange={e => setSiteName(e.target.value)}
              style={inputStyle}
              placeholder="بيوت"
              disabled={saving}
            />
          </div>
        </div>

        {/* ── Post Page Templates ── */}
        <div style={cardStyle}>
          <SectionTitle>📄 قالب SEO — صفحة المقال</SectionTitle>
          <p style={{ margin: "0 0 1rem", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            يُطبَّق عند اختيار وضع «قالب» في إعدادات المقال. اضغط على أي متغير لإدراجه.
          </p>

          {/* Meta Title Template */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={labelStyle}>قالب عنوان Meta (للبحث)</label>
            {(() => { const s = getTitleStatus(resolveTemplate(postTitleTpl, previewVars).length); return (
              <>
                <input
                  value={postTitleTpl}
                  onChange={e => setPostTitleTpl(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "monospace", direction: "ltr", borderColor: postTitleTpl.length > 0 ? s.color : undefined }}
                  placeholder="{PostTitle} | {SiteName}"
                  disabled={saving}
                />
                <TokenBadges setter={setPostTitleTpl} disabled={saving} />
                <SeoCounter len={resolveTemplate(postTitleTpl, previewVars).length} max={60} status={s} />
              </>
            ); })()}
          </div>

          <FieldSep />

          {/* Meta Description Template */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={labelStyle}>قالب وصف Meta (للبحث)</label>
            {(() => { const s = getDescStatus(resolveTemplate(postDescTpl, previewVars).length); return (
              <>
                <textarea
                  value={postDescTpl}
                  onChange={e => setPostDescTpl(e.target.value)}
                  style={{ ...inputStyle, minHeight: 68, resize: "vertical", fontFamily: "monospace", direction: "ltr", borderColor: postDescTpl.length > 0 ? s.color : undefined }}
                  placeholder="{Excerpt}"
                  disabled={saving}
                />
                <TokenBadges setter={setPostDescTpl} disabled={saving} />
                <SeoCounter len={resolveTemplate(postDescTpl, previewVars).length} max={160} status={s} />
              </>
            ); })()}
          </div>

          <FieldSep />

          {/* OG Title Template */}
          <div style={{ marginBottom: "1.1rem" }}>
            <label style={labelStyle}>
              قالب عنوان OG
              <span style={{ fontWeight: 400, marginRight: "0.3rem", color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>(عند المشاركة اجتماعياً)</span>
            </label>
            {(() => { const s = getTitleStatus(resolveTemplate(ogTitleTpl, previewVars).length); return (
              <>
                <input
                  value={ogTitleTpl}
                  onChange={e => setOgTitleTpl(e.target.value)}
                  style={{ ...inputStyle, fontFamily: "monospace", direction: "ltr", borderColor: ogTitleTpl.length > 0 ? s.color : undefined }}
                  placeholder="{PostTitle} | {SiteName}"
                  disabled={saving}
                />
                <TokenBadges setter={setOgTitleTpl} disabled={saving} />
                <SeoCounter len={resolveTemplate(ogTitleTpl, previewVars).length} max={60} status={s} />
              </>
            ); })()}
          </div>

          <FieldSep />

          {/* OG Description Template */}
          <div>
            <label style={labelStyle}>
              قالب وصف OG
              <span style={{ fontWeight: 400, marginRight: "0.3rem", color: "var(--color-text-secondary)", fontSize: "0.75rem" }}>(عند المشاركة اجتماعياً)</span>
            </label>
            {(() => { const s = getDescStatus(resolveTemplate(ogDescTpl, previewVars).length); return (
              <>
                <textarea
                  value={ogDescTpl}
                  onChange={e => setOgDescTpl(e.target.value)}
                  style={{ ...inputStyle, minHeight: 68, resize: "vertical", fontFamily: "monospace", direction: "ltr", borderColor: ogDescTpl.length > 0 ? s.color : undefined }}
                  placeholder="{Excerpt}"
                  disabled={saving}
                />
                <TokenBadges setter={setOgDescTpl} disabled={saving} />
                <SeoCounter len={resolveTemplate(ogDescTpl, previewVars).length} max={160} status={s} />
              </>
            ); })()}
          </div>
        </div>

        {/* ── Live Preview ── */}
        <div style={{ ...cardStyle, background: "#f8fafc" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.85rem" }}>
            <SectionTitle>👁 معاينة مباشرة (بيانات وهمية)</SectionTitle>
            <div style={{ display: "flex", gap: "0.35rem" }}>
              {(["google", "og"] as const).map(tab => (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setActivePreview(tab)}
                  style={{
                    fontSize: "0.75rem", padding: "0.25rem 0.75rem",
                    borderRadius: 99, border: "1.5px solid",
                    borderColor: activePreview === tab ? "var(--color-primary)" : "var(--color-border, #e5e7eb)",
                    background: activePreview === tab ? "var(--color-primary)" : "#fff",
                    color: activePreview === tab ? "#fff" : "var(--color-text-secondary)",
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  {tab === "google" ? "🔍 Google" : "📱 OG Card"}
                </button>
              ))}
            </div>
          </div>

          {/* Mock data note */}
          <div style={{
            background: "#fffbeb", border: "1px solid #fde68a",
            borderRadius: 8, padding: "0.5rem 0.75rem",
            fontSize: "0.75rem", color: "#92400e", marginBottom: "0.85rem",
          }}>
            <strong>بيانات وهمية للمعاينة:</strong>{" "}
            العنوان: «{MOCK_VARS.PostTitle}» · التصنيف: {MOCK_VARS.Category} · الكاتب: {MOCK_VARS.AuthorName}
          </div>

          {activePreview === "google" ? (
            <div style={{ background: "#fff", borderRadius: 8, padding: "1rem 1.1rem", border: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em" }}>نتيجة بحث Google</p>
              <GooglePreview title={resolvedTitle} description={resolvedDesc} />
            </div>
          ) : (
            <div style={{ background: "#fff", borderRadius: 8, padding: "1rem 1.1rem", border: "1px solid #e5e7eb" }}>
              <p style={{ margin: "0 0 0.5rem", fontSize: "0.72rem", color: "#6b7280", fontWeight: 600, letterSpacing: "0.04em" }}>بطاقة OG عند المشاركة</p>
              <OgPreview title={resolvedOgTitle} description={resolvedOgDesc} siteName={siteName || "بيوت"} />
            </div>
          )}
        </div>

        {/* ── Blog List Page SEO ── */}
        <div style={cardStyle}>
          <SectionTitle>📋 SEO — صفحة قائمة المدونة (/blog)</SectionTitle>
          <p style={{ margin: "0 0 0.85rem", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
            ثابت — لا يدعم المتغيرات.
          </p>

          <div style={{ marginBottom: "1rem" }}>
            <label style={labelStyle}>عنوان الصفحة</label>
            {(() => { const s = getTitleStatus(listTitle.length); return (
              <>
                <input
                  value={listTitle}
                  onChange={e => setListTitle(e.target.value)}
                  style={{ ...inputStyle, borderColor: listTitle.length > 0 ? s.color : undefined }}
                  placeholder="المدونة | بيوت"
                  disabled={saving}
                />
                <SeoCounter len={listTitle.length} max={60} status={s} />
              </>
            ); })()}
          </div>

          <div>
            <label style={labelStyle}>وصف الصفحة</label>
            {(() => { const s = getDescStatus(listDescription.length); return (
              <>
                <textarea
                  value={listDescription}
                  onChange={e => setListDescription(e.target.value)}
                  style={{ ...inputStyle, minHeight: 68, resize: "vertical", borderColor: listDescription.length > 0 ? s.color : undefined }}
                  placeholder="تصفح أحدث المقالات العقارية من بيوت سوريا..."
                  disabled={saving}
                />
                <SeoCounter len={listDescription.length} max={160} status={s} />
              </>
            ); })()}
          </div>
        </div>

        {/* ── Variables Reference ── */}
        <div style={{ ...cardStyle, background: "var(--color-bg-muted, #f9fafb)", marginBottom: "1.5rem" }}>
          <p style={{ margin: "0 0 0.6rem", fontWeight: 700, fontSize: "0.88rem" }}>📌 المتغيرات المتاحة في القوالب</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.5rem" }}>
            {SEO_VARIABLES.map(v => (
              <div key={v.key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.8rem" }}>
                <code style={{
                  fontFamily: "monospace", background: "#e8f5e9",
                  color: "var(--color-primary)", padding: "0.1rem 0.4rem",
                  borderRadius: 4, fontSize: "0.74rem", flexShrink: 0,
                }}>
                  {v.key}
                </code>
                <span style={{ color: "var(--color-text-secondary)" }}>{v.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* ── Submit ── */}
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem", alignItems: "center" }}>
          {success && (
            <span style={{ fontSize: "0.85rem", color: "#166534" }}>{success}</span>
          )}
          <button
            type="submit"
            disabled={saving}
            style={{
              padding: "0.65rem 2rem",
              background: "var(--color-primary)",
              color: "#fff", border: "none",
              borderRadius: 8, fontSize: "0.9rem",
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
