"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi, type UpsertListingTypePayload } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { ListingTypeConfig } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminListingTypesPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });

  const [items, setItems]           = useState<ListingTypeConfig[]>([]);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [showForm, setShowForm]       = useState(false);
  const [editTarget, setEditTarget]   = useState<ListingTypeConfig | null>(null);

  const [saving, setSaving]           = useState(false);
  const [deleting, setDeleting]       = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const data = await adminApi.getListingTypes();
      setItems(data);
    } catch (err) {
      setFetchError(normalizeError(err));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  function openCreate() {
    setEditTarget(null);
    setActionError("");
    setActionSuccess("");
    setShowForm(true);
  }

  function openEdit(item: ListingTypeConfig) {
    setEditTarget(item);
    setActionError("");
    setActionSuccess("");
    setShowForm(true);
  }

  function closeForm() {
    setShowForm(false);
    setEditTarget(null);
  }

  async function handleSave(payload: UpsertListingTypePayload) {
    setSaving(true);
    setActionError("");
    setActionSuccess("");
    try {
      if (editTarget) {
        await adminApi.updateListingType(editTarget.id, payload);
        setActionSuccess("تم تحديث نوع الإدراج بنجاح");
      } else {
        await adminApi.createListingType(payload);
        setActionSuccess("تم إضافة نوع الإدراج بنجاح");
      }
      closeForm();
      await load();
    } catch (err) {
      setActionError(normalizeError(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف نوع الإدراج هذا؟")) return;
    setDeleting(id);
    setActionError("");
    setActionSuccess("");
    try {
      await adminApi.deleteListingType(id);
      setActionSuccess("تم حذف نوع الإدراج");
      await load();
    } catch (err) {
      setActionError(normalizeError(err));
    } finally {
      setDeleting(null);
    }
  }

  if (authLoading) return <LoadingRow />;

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: "1.5rem 1.25rem" }}>
      <DashboardBackLink href="/dashboard/admin" label="العودة إلى لوحة التحكم" />

      {/* ── Page Header ── */}
      <div style={{
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "space-between",
        gap: "1rem",
        marginBottom: "1.75rem",
        flexWrap: "wrap",
      }}>
        <div>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: "0 0 0.25rem" }}>
            أنواع الإدراج
          </h1>
          <p style={{ margin: 0, fontSize: "0.875rem", color: "var(--color-text-secondary)" }}>
            إدارة أنواع الإدراج المتاحة في النماذج (بيع، إيجار، إيجار يومي…)
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={openCreate}
          style={{ padding: "0.6rem 1.4rem", fontSize: "0.925rem", fontWeight: 600, flexShrink: 0 }}
        >
          + إضافة نوع جديد
        </button>
      </div>

      {/* ── Banners ── */}
      <InlineBanner message={fetchError} />
      <InlineBanner message={actionError} />
      {actionSuccess && (
        <div style={{
          background: "#f0fdf4",
          color: "#15803d",
          border: "1px solid #bbf7d0",
          padding: "0.75rem 1rem",
          borderRadius: "10px",
          marginBottom: "1rem",
          fontSize: "0.9rem",
          fontWeight: 500,
        }}>
          ✓ {actionSuccess}
        </div>
      )}

      {/* ── Form Modal ── */}
      {showForm && (
        <ListingTypeForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          error=""
        />
      )}

      {/* ── Table ── */}
      {fetching ? (
        <LoadingRow />
      ) : items.length === 0 ? (
        <div style={{
          textAlign: "center",
          padding: "4rem 2rem",
          color: "var(--color-text-secondary)",
          background: "var(--color-bg-secondary, #f9fafb)",
          borderRadius: "12px",
          border: "1px dashed var(--color-border)",
        }}>
          <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>📋</div>
          <p style={{ margin: 0, fontWeight: 500 }}>لا توجد أنواع إدراج بعد</p>
          <p style={{ margin: "0.35rem 0 0", fontSize: "0.85rem" }}>أضف أول نوع الآن باستخدام الزر أعلاه.</p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: "12px", border: "1px solid var(--color-border)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr style={{
                background: "var(--color-bg-subtle, #f8fafc)",
                borderBottom: "2px solid var(--color-border)",
              }}>
                <Th width="22%">القيمة الداخلية</Th>
                <Th width="35%">الاسم المعروض</Th>
                <Th width="12%" align="center">الترتيب</Th>
                <Th width="14%" align="center">الحالة</Th>
                <Th width="17%" align="center">إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr
                  key={item.id}
                  style={{
                    borderBottom: idx < items.length - 1 ? "1px solid var(--color-border)" : "none",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = "var(--color-bg-subtle, #f8fafc)")}
                  onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
                >
                  <Td>
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
                      fontSize: "0.82rem",
                      fontWeight: 600,
                      direction: "ltr",
                      background: "var(--color-bg-secondary, #f1f5f9)",
                      border: "1px solid var(--color-border)",
                      color: "var(--color-text-primary, #1e293b)",
                      padding: "0.25rem 0.6rem",
                      borderRadius: "6px",
                      letterSpacing: "0.01em",
                    }}>
                      {item.value}
                    </span>
                  </Td>
                  <Td>
                    <span style={{ fontWeight: 500, fontSize: "0.95rem" }}>{item.label}</span>
                  </Td>
                  <Td align="center">
                    <span style={{
                      display: "inline-block",
                      minWidth: 28,
                      textAlign: "center",
                      fontWeight: 600,
                      fontSize: "0.9rem",
                      color: "var(--color-text-secondary)",
                    }}>
                      {item.order}
                    </span>
                  </Td>
                  <Td align="center">
                    <span style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "0.3rem",
                      padding: "0.25rem 0.7rem",
                      borderRadius: "20px",
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      background: item.isActive ? "#f0fdf4" : "#f9fafb",
                      color: item.isActive ? "#16a34a" : "#6b7280",
                      border: item.isActive ? "1px solid #bbf7d0" : "1px solid #e5e7eb",
                    }}>
                      <span style={{
                        width: 6, height: 6, borderRadius: "50%",
                        background: item.isActive ? "#22c55e" : "#9ca3af",
                        flexShrink: 0,
                      }} />
                      {item.isActive ? "نشط" : "معطل"}
                    </span>
                  </Td>
                  <Td align="center">
                    <div style={{ display: "inline-flex", gap: "0.5rem", alignItems: "center" }}>
                      <button
                        className="btn"
                        style={{
                          padding: "0.35rem 0.9rem",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          border: "1px solid var(--color-border)",
                          background: "var(--color-bg-primary, #fff)",
                          color: "var(--color-text-primary)",
                          borderRadius: "7px",
                          cursor: "pointer",
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => openEdit(item)}
                      >
                        تعديل
                      </button>
                      <button
                        className="btn"
                        style={{
                          padding: "0.35rem 0.9rem",
                          fontSize: "0.82rem",
                          fontWeight: 600,
                          border: "1px solid #fecaca",
                          background: deleting === item.id ? "#fef2f2" : "#fff5f5",
                          color: "#dc2626",
                          borderRadius: "7px",
                          cursor: deleting === item.id ? "not-allowed" : "pointer",
                          opacity: deleting === item.id ? 0.6 : 1,
                          whiteSpace: "nowrap",
                        }}
                        onClick={() => handleDelete(item.id)}
                        disabled={deleting === item.id}
                      >
                        {deleting === item.id ? "..." : "حذف"}
                      </button>
                    </div>
                  </Td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <p style={{ marginTop: "0.85rem", fontSize: "0.78rem", color: "var(--color-text-secondary)", textAlign: "start" }}>
        المجموع: {items.length} نوع
      </p>
    </div>
  );
}

// ─── Table helpers ─────────────────────────────────────────────────────────────

function Th({ children, width, align }: { children: React.ReactNode; width?: string; align?: "center" | "start" }) {
  return (
    <th style={{
      padding: "0.85rem 1.1rem",
      textAlign: align === "center" ? "center" : "start",
      fontSize: "0.78rem",
      fontWeight: 700,
      color: "var(--color-text-secondary)",
      textTransform: "uppercase",
      letterSpacing: "0.04em",
      width,
      whiteSpace: "nowrap",
    }}>
      {children}
    </th>
  );
}

function Td({ children, align }: { children: React.ReactNode; align?: "center" | "start" }) {
  return (
    <td style={{
      padding: "1rem 1.1rem",
      fontSize: "0.9rem",
      textAlign: align === "center" ? "center" : "start",
      verticalAlign: "middle",
    }}>
      {children}
    </td>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

interface ListingTypeFormProps {
  initial?: ListingTypeConfig;
  onSave: (payload: UpsertListingTypePayload) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
  error: string;
}

function ListingTypeForm({ initial, onSave, onCancel, saving }: ListingTypeFormProps) {
  const [value, setValue]       = useState(initial?.value ?? "");
  const [label, setLabel]       = useState(initial?.label ?? "");
  const [order, setOrder]       = useState(String(initial?.order ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [err, setErr]           = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!value.trim()) { setErr("القيمة الداخلية مطلوبة"); return; }
    if (!label.trim()) { setErr("الاسم المعروض مطلوب"); return; }
    await onSave({ value: value.trim(), label: label.trim(), order: Number(order) || 0, isActive });
  }

  const labelStyle: React.CSSProperties = {
    display: "block",
    fontSize: "0.82rem",
    fontWeight: 700,
    color: "var(--color-text-secondary)",
    marginBottom: "0.4rem",
    textTransform: "uppercase",
    letterSpacing: "0.04em",
  };

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "0.6rem 0.85rem",
    border: "1px solid var(--color-border)",
    borderRadius: "8px",
    fontSize: "0.9rem",
    background: "var(--color-bg-primary, #fff)",
    color: "var(--color-text-primary)",
    boxSizing: "border-box",
    outline: "none",
    transition: "border-color 0.15s",
  };

  return (
    <div style={{
      marginBottom: "1.75rem",
      background: "var(--color-bg-primary, #fff)",
      border: "1px solid var(--color-border)",
      borderRadius: "14px",
      overflow: "hidden",
      boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
    }}>
      {/* Form header */}
      <div style={{
        padding: "1rem 1.25rem",
        borderBottom: "1px solid var(--color-border)",
        background: "var(--color-bg-subtle, #f8fafc)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
          <span style={{ fontSize: "1.1rem" }}>{initial ? "✏️" : "➕"}</span>
          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
            {initial ? "تعديل نوع الإدراج" : "إضافة نوع إدراج جديد"}
          </h2>
        </div>
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "1.2rem",
            color: "var(--color-text-secondary)",
            lineHeight: 1,
            padding: "0.2rem 0.4rem",
            borderRadius: "6px",
          }}
          title="إغلاق"
        >
          ✕
        </button>
      </div>

      {/* Form body */}
      <div style={{ padding: "1.25rem" }}>
        <InlineBanner message={err} />

        <form onSubmit={handleSubmit} noValidate>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "1rem" }}>

            {/* القيمة الداخلية */}
            <div>
              <label style={labelStyle}>
                القيمة الداخلية <span style={{ color: "#ef4444", textTransform: "none" }}>*</span>
              </label>
              <input
                style={{
                  ...inputStyle,
                  fontFamily: "ui-monospace, 'Cascadia Code', 'Fira Code', monospace",
                  background: initial ? "var(--color-bg-subtle, #f8fafc)" : undefined,
                  cursor: initial ? "not-allowed" : undefined,
                  opacity: initial ? 0.7 : undefined,
                }}
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder="مثال: Sale"
                dir="ltr"
                disabled={saving || !!initial}
                title={initial ? "لا يمكن تغيير القيمة الداخلية بعد الإنشاء" : undefined}
              />
              <p style={{ fontSize: "0.73rem", color: "var(--color-text-secondary)", margin: "0.3rem 0 0" }}>
                يُستخدم داخلياً — بالإنجليزية بدون مسافات (مثال: WeeklyRent)
              </p>
            </div>

            {/* الاسم المعروض */}
            <div>
              <label style={labelStyle}>
                الاسم المعروض <span style={{ color: "#ef4444", textTransform: "none" }}>*</span>
              </label>
              <input
                style={inputStyle}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="مثال: إيجار أسبوعي"
                disabled={saving}
              />
              <p style={{ fontSize: "0.73rem", color: "var(--color-text-secondary)", margin: "0.3rem 0 0" }}>
                الاسم الذي يظهر للمستخدمين في النماذج
              </p>
            </div>

            {/* الترتيب */}
            <div>
              <label style={labelStyle}>الترتيب</label>
              <input
                style={inputStyle}
                type="number"
                value={order}
                onChange={(e) => setOrder(e.target.value)}
                min={0}
                disabled={saving}
                dir="ltr"
              />
              <p style={{ fontSize: "0.73rem", color: "var(--color-text-secondary)", margin: "0.3rem 0 0" }}>
                الأرقام الأصغر تظهر أولاً
              </p>
            </div>

            {/* الحالة */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
              <label style={labelStyle}>الحالة</label>
              <label style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.6rem",
                cursor: saving ? "not-allowed" : "pointer",
                padding: "0.6rem 0.85rem",
                border: "1px solid var(--color-border)",
                borderRadius: "8px",
                userSelect: "none",
                background: isActive ? "#f0fdf4" : "var(--color-bg-subtle, #f8fafc)",
                transition: "background 0.15s",
              }}>
                <input
                  id="isActive"
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={saving}
                  style={{ width: 16, height: 16, accentColor: "#16a34a", cursor: "pointer" }}
                />
                <span style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: isActive ? "#16a34a" : "var(--color-text-secondary)",
                }}>
                  {isActive ? "نشط — يظهر في النماذج" : "معطل — مخفي من النماذج"}
                </span>
              </label>
            </div>
          </div>

          {/* Action buttons */}
          <div style={{
            display: "flex",
            gap: "0.75rem",
            paddingTop: "1rem",
            borderTop: "1px solid var(--color-border)",
          }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ padding: "0.6rem 1.6rem", fontWeight: 700, fontSize: "0.9rem" }}
            >
              {saving ? "جارٍ الحفظ..." : initial ? "حفظ التعديلات" : "إضافة"}
            </button>
            <button
              type="button"
              className="btn"
              onClick={onCancel}
              disabled={saving}
              style={{
                padding: "0.6rem 1.2rem",
                fontWeight: 600,
                fontSize: "0.9rem",
                border: "1px solid var(--color-border)",
                background: "transparent",
                color: "var(--color-text-secondary)",
              }}
            >
              إلغاء
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
