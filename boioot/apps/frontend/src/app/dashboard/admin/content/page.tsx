"use client";

import { useEffect, useState, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { api, normalizeError } from "@/lib/api";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SiteContentItem {
  id: string;
  key: string;
  group: string;
  type: string;
  labelAr: string;
  labelEn?: string;
  valueAr?: string;
  valueEn?: string;
  isActive: boolean;
  isSystem: boolean;
  sortOrder: number;
  updatedAt: string;
}

const GROUP_LABELS: Record<string, string> = {
  home:    "الصفحة الرئيسية",
  navbar:  "شريط التنقل",
  footer:  "التذييل",
  general: "عام",
};

const TYPE_LABELS: Record<string, string> = {
  text:     "نص قصير",
  textarea: "نص طويل",
  url:      "رابط",
  image:    "رابط صورة",
  richtext: "نص منسّق",
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminContentPage() {
  useProtectedRoute({ requiredRole: "Admin" });

  const [items, setItems]       = useState<SiteContentItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [groupFilter, setGroup] = useState<string>("");
  const [editing, setEditing]   = useState<Record<string, string>>({});
  const [saving, setSaving]     = useState<Record<string, boolean>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await api.get<SiteContentItem[]>(
        `/admin/content${groupFilter ? `?group=${groupFilter}` : ""}`,
      );
      setItems(data);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, [groupFilter]);

  useEffect(() => { load(); }, [load]);

  function startEdit(id: string, currentValue: string) {
    setEditing(prev => ({ ...prev, [id]: currentValue ?? "" }));
    setSuccess("");
  }

  function cancelEdit(id: string) {
    setEditing(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function save(item: SiteContentItem) {
    setSaving(prev => ({ ...prev, [item.id]: true }));
    setSuccess("");
    try {
      const updated = await api.put<SiteContentItem>(`/admin/content/${item.id}`, {
        labelAr:   item.labelAr,
        labelEn:   item.labelEn,
        valueAr:   editing[item.id],
        valueEn:   item.valueEn,
        isActive:  item.isActive,
        sortOrder: item.sortOrder,
        type:      item.type,
      });
      setItems(prev => prev.map(i => (i.id === item.id ? updated : i)));
      cancelEdit(item.id);
      setSuccess(`تم حفظ "${item.labelAr}" بنجاح`);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(prev => ({ ...prev, [item.id]: false }));
    }
  }

  const groups = [...new Set(items.map(i => i.group))].sort();

  const filtered = groupFilter
    ? items.filter(i => i.group === groupFilter)
    : items;

  const byGroup: Record<string, SiteContentItem[]> = {};
  for (const item of filtered) {
    if (!byGroup[item.group]) byGroup[item.group] = [];
    byGroup[item.group].push(item);
  }

  return (
    <div style={{ padding: "1.5rem 1rem", maxWidth: 900, margin: "0 auto" }}>
      <DashboardBackLink href="/dashboard" label="العودة للوحة التحكم" />

      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.25rem" }}>
        محتوى الموقع
      </h1>
      <p style={{ color: "var(--color-text-2)", marginBottom: "1.5rem", fontSize: "0.9rem" }}>
        عدّل النصوص والروابط التي تظهر في صفحات الموقع
      </p>

      {error   && <InlineBanner type="error"   message={error}   onClose={() => setError("")}   />}
      {success && <InlineBanner type="success" message={success} onClose={() => setSuccess("")} />}

      {/* Group filter tabs */}
      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {["", ...groups].map(g => (
          <button
            key={g}
            onClick={() => setGroup(g)}
            style={{
              padding: "0.4rem 1rem",
              borderRadius: 6,
              border: "1px solid var(--color-border)",
              background: groupFilter === g ? "var(--color-primary)" : "var(--color-surface)",
              color: groupFilter === g ? "#fff" : "var(--color-text)",
              fontWeight: groupFilter === g ? 600 : 400,
              cursor: "pointer",
              fontSize: "0.875rem",
              fontFamily: "inherit",
            }}
          >
            {g === "" ? "الكل" : (GROUP_LABELS[g] ?? g)}
          </button>
        ))}
      </div>

      {loading ? (
        <p style={{ textAlign: "center", color: "var(--color-text-2)", padding: "3rem 0" }}>
          جاري التحميل...
        </p>
      ) : (
        Object.entries(byGroup).map(([group, groupItems]) => (
          <section key={group} style={{ marginBottom: "2rem" }}>
            <h2 style={{
              fontSize: "1rem",
              fontWeight: 700,
              marginBottom: "0.75rem",
              paddingBottom: "0.5rem",
              borderBottom: "1px solid var(--color-border)",
              color: "var(--color-primary)",
            }}>
              {GROUP_LABELS[group] ?? group}
            </h2>

            <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
              {groupItems.map(item => {
                const isEditing = item.id in editing;
                const isSaving  = saving[item.id];

                return (
                  <div
                    key={item.id}
                    style={{
                      background: "var(--color-surface)",
                      border: "1px solid var(--color-border)",
                      borderRadius: 10,
                      padding: "1rem 1.25rem",
                    }}
                  >
                    {/* Header row */}
                    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                      <div>
                        <span style={{ fontWeight: 600, fontSize: "0.95rem" }}>{item.labelAr}</span>
                        {item.labelEn && (
                          <span style={{ color: "var(--color-text-2)", fontSize: "0.8rem", marginRight: "0.5rem" }}>
                            ({item.labelEn})
                          </span>
                        )}
                        <div style={{ fontSize: "0.75rem", color: "var(--color-text-2)", marginTop: "0.15rem" }}>
                          <code style={{ background: "var(--color-bg)", padding: "1px 6px", borderRadius: 4, fontSize: "0.75rem" }}>
                            {item.key}
                          </code>
                          <span style={{ marginRight: "0.4rem" }}>
                            · {TYPE_LABELS[item.type] ?? item.type}
                          </span>
                        </div>
                      </div>

                      {!isEditing && (
                        <button
                          onClick={() => startEdit(item.id, item.valueAr ?? "")}
                          style={{
                            padding: "0.35rem 0.85rem",
                            borderRadius: 6,
                            border: "1px solid var(--color-border)",
                            background: "var(--color-surface)",
                            color: "var(--color-primary)",
                            cursor: "pointer",
                            fontFamily: "inherit",
                            fontWeight: 500,
                            fontSize: "0.85rem",
                            whiteSpace: "nowrap",
                          }}
                        >
                          تعديل
                        </button>
                      )}
                    </div>

                    {/* Value display or edit */}
                    {isEditing ? (
                      <div style={{ marginTop: "0.75rem" }}>
                        {item.type === "textarea" ? (
                          <textarea
                            value={editing[item.id]}
                            onChange={e => setEditing(prev => ({ ...prev, [item.id]: e.target.value }))}
                            rows={3}
                            dir="rtl"
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.75rem",
                              borderRadius: 6,
                              border: "1px solid var(--color-primary)",
                              background: "var(--color-bg)",
                              fontFamily: "inherit",
                              fontSize: "0.9rem",
                              resize: "vertical",
                              boxSizing: "border-box",
                            }}
                          />
                        ) : (
                          <input
                            type="text"
                            value={editing[item.id]}
                            onChange={e => setEditing(prev => ({ ...prev, [item.id]: e.target.value }))}
                            dir={item.type === "url" || item.type === "image" ? "ltr" : "rtl"}
                            style={{
                              width: "100%",
                              padding: "0.5rem 0.75rem",
                              borderRadius: 6,
                              border: "1px solid var(--color-primary)",
                              background: "var(--color-bg)",
                              fontFamily: "inherit",
                              fontSize: "0.9rem",
                              boxSizing: "border-box",
                            }}
                          />
                        )}
                        <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.5rem", justifyContent: "flex-end" }}>
                          <button
                            onClick={() => cancelEdit(item.id)}
                            disabled={isSaving}
                            style={{
                              padding: "0.4rem 1rem",
                              borderRadius: 6,
                              border: "1px solid var(--color-border)",
                              background: "transparent",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontSize: "0.85rem",
                            }}
                          >
                            إلغاء
                          </button>
                          <button
                            onClick={() => save(item)}
                            disabled={isSaving}
                            style={{
                              padding: "0.4rem 1.25rem",
                              borderRadius: 6,
                              border: "none",
                              background: "var(--color-primary)",
                              color: "#fff",
                              cursor: "pointer",
                              fontFamily: "inherit",
                              fontWeight: 600,
                              fontSize: "0.85rem",
                              opacity: isSaving ? 0.7 : 1,
                            }}
                          >
                            {isSaving ? "جاري الحفظ..." : "حفظ"}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ marginTop: "0.5rem" }}>
                        {item.valueAr ? (
                          <p style={{
                            color: "var(--color-text)",
                            fontSize: "0.9rem",
                            margin: 0,
                            wordBreak: "break-word",
                            direction: item.type === "url" || item.type === "image" ? "ltr" : "rtl",
                            textAlign: item.type === "url" || item.type === "image" ? "left" : "right",
                          }}>
                            {item.valueAr}
                          </p>
                        ) : (
                          <p style={{ color: "var(--color-text-2)", fontSize: "0.85rem", margin: 0, fontStyle: "italic" }}>
                            لا توجد قيمة
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}
    </div>
  );
}
