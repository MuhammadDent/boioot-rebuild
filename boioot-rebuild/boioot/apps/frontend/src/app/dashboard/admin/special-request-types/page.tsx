"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import {
  adminGetSpecialRequestTypes,
  adminCreateSpecialRequestType,
  adminUpdateSpecialRequestType,
  adminDeleteSpecialRequestType,
  type SpecialRequestType,
} from "@/features/special-requests/api";

// ─── Types ────────────────────────────────────────────────────────────────────

type ModalMode = "create" | "edit";

interface FormState {
  label:     string;
  value:     string;
  sortOrder: string;
  isActive:  boolean;
}

const EMPTY_FORM: FormState = { label: "", value: "", sortOrder: "0", isActive: true };

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminSpecialRequestTypesPage() {
  useProtectedRoute({ allowedRoles: ["Admin"] });

  const [types, setTypes]         = useState<SpecialRequestType[]>([]);
  const [loading, setLoading]     = useState(true);
  const [saving, setSaving]       = useState(false);
  const [deleting, setDeleting]   = useState<string | null>(null);
  const [error, setError]         = useState("");

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [editId, setEditId]       = useState<string | null>(null);
  const [form, setForm]           = useState<FormState>(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState<Partial<FormState>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminGetSpecialRequestTypes();
      setTypes(data);
    } catch {
      setError("فشل تحميل البيانات");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Modal helpers ────────────────────────────────────────────────────────────

  function openCreate() {
    setForm(EMPTY_FORM);
    setFormErrors({});
    setModalMode("create");
    setEditId(null);
    setModalOpen(true);
  }

  function openEdit(t: SpecialRequestType) {
    setForm({ label: t.label, value: t.value, sortOrder: String(t.sortOrder), isActive: t.isActive });
    setFormErrors({});
    setModalMode("edit");
    setEditId(t.id);
    setModalOpen(true);
  }

  function validateForm(): boolean {
    const e: Partial<FormState> = {};
    if (!form.label.trim()) e.label = "مطلوب";
    if (!form.value.trim()) e.value = "مطلوب";
    setFormErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSave() {
    if (!validateForm()) return;
    setSaving(true);
    try {
      const dto = {
        label:     form.label.trim(),
        value:     form.value.trim(),
        sortOrder: Number(form.sortOrder) || 0,
        isActive:  form.isActive,
      };
      if (modalMode === "create") {
        await adminCreateSpecialRequestType(dto);
      } else if (editId) {
        await adminUpdateSpecialRequestType(editId, dto);
      }
      setModalOpen(false);
      await load();
    } catch {
      setError("فشل حفظ البيانات");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا النوع؟")) return;
    setDeleting(id);
    try {
      await adminDeleteSpecialRequestType(id);
      await load();
    } catch {
      setError("فشل حذف النوع");
    } finally {
      setDeleting(null);
    }
  }

  async function handleToggleActive(t: SpecialRequestType) {
    try {
      await adminUpdateSpecialRequestType(t.id, { isActive: !t.isActive });
      await load();
    } catch {
      setError("فشل تحديث الحالة");
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div dir="rtl" style={{ padding: "28px 32px", fontFamily: "inherit" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 800, color: "#1a1a2e", margin: 0 }}>أنواع الطلبات الخاصة</h1>
          <p style={{ color: "#777", fontSize: 14, margin: "4px 0 0" }}>
            إدارة خيارات القائمة المنسدلة في نموذج الطلبات الخاصة
          </p>
        </div>
        <button onClick={openCreate} style={btnStyle("#1a1a2e")}>+ إضافة نوع جديد</button>
      </div>

      {error && (
        <div style={{
          background: "#fff5f5", border: "1px solid #ffcdd2", borderRadius: 8,
          padding: "12px 16px", color: "#c62828", marginBottom: 20, fontSize: 14,
        }}>
          {error}
          <button onClick={() => setError("")} style={{ marginRight: 12, cursor: "pointer", background: "none", border: "none", color: "#c62828" }}>✕</button>
        </div>
      )}

      {/* Table */}
      <div style={{ background: "#fff", borderRadius: 12, boxShadow: "0 1px 8px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ background: "#f8f9fa", borderBottom: "1px solid #eee" }}>
              <th style={thStyle}>الترتيب</th>
              <th style={thStyle}>التسمية (عربي)</th>
              <th style={thStyle}>القيمة (value)</th>
              <th style={thStyle}>الحالة</th>
              <th style={{ ...thStyle, textAlign: "left" }}>إجراءات</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#aaa" }}>جاري التحميل...</td></tr>
            ) : types.length === 0 ? (
              <tr><td colSpan={5} style={{ textAlign: "center", padding: 40, color: "#aaa" }}>لا توجد أنواع مضافة بعد</td></tr>
            ) : types.map(t => (
              <tr key={t.id} style={{ borderBottom: "1px solid #f0f0f0" }}>
                <td style={tdStyle}>{t.sortOrder}</td>
                <td style={{ ...tdStyle, fontWeight: 600 }}>{t.label}</td>
                <td style={{ ...tdStyle, direction: "ltr", textAlign: "right" }}>
                  <code style={{ background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, fontSize: 12 }}>{t.value}</code>
                </td>
                <td style={tdStyle}>
                  <button
                    onClick={() => handleToggleActive(t)}
                    style={{
                      padding: "4px 12px", borderRadius: 20, border: "none", cursor: "pointer",
                      fontSize: 12, fontWeight: 600,
                      background: t.isActive ? "#e8f5e9" : "#fafafa",
                      color: t.isActive ? "#2e7d32" : "#999",
                    }}
                  >
                    {t.isActive ? "نشط" : "مخفي"}
                  </button>
                </td>
                <td style={{ ...tdStyle, textAlign: "left" }}>
                  <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                    <button onClick={() => openEdit(t)} style={btnSmall("#1a1a2e")}>تعديل</button>
                    <button
                      onClick={() => handleDelete(t.id)}
                      disabled={deleting === t.id}
                      style={btnSmall("#e63946")}
                    >
                      {deleting === t.id ? "..." : "حذف"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {modalOpen && (
        <div style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)",
          display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
        }} onClick={e => { if (e.target === e.currentTarget) setModalOpen(false); }}>
          <div style={{
            background: "#fff", borderRadius: 16, padding: "36px 32px",
            width: "100%", maxWidth: 480, boxShadow: "0 8px 40px rgba(0,0,0,0.18)",
          }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: "#1a1a2e", margin: "0 0 24px" }}>
              {modalMode === "create" ? "إضافة نوع جديد" : "تعديل النوع"}
            </h2>

            {/* Label */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>التسمية العربية *</label>
              <input
                type="text"
                placeholder="مثال: شراء عقار"
                value={form.label}
                onChange={e => setForm(f => ({ ...f, label: e.target.value }))}
                style={modalInput(!!formErrors.label)}
              />
              {formErrors.label && <p style={errText}>{formErrors.label}</p>}
            </div>

            {/* Value */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>القيمة الداخلية (value) *</label>
              <input
                type="text"
                placeholder="مثال: buy  (بالإنجليزية بدون مسافات)"
                value={form.value}
                onChange={e => setForm(f => ({ ...f, value: e.target.value }))}
                style={{ ...modalInput(!!formErrors.value), direction: "ltr" }}
                dir="ltr"
              />
              {formErrors.value && <p style={errText}>{formErrors.value}</p>}
              <p style={{ fontSize: 12, color: "#888", marginTop: 4 }}>
                تُحفظ في قاعدة البيانات — لا تغيّرها بعد الإنشاء إذا كان هناك طلبات موجودة
              </p>
            </div>

            {/* SortOrder */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>الترتيب</label>
              <input
                type="number"
                value={form.sortOrder}
                onChange={e => setForm(f => ({ ...f, sortOrder: e.target.value }))}
                style={{ ...modalInput(), width: 120 }}
                min={0}
              />
            </div>

            {/* IsActive */}
            <div style={{ marginBottom: 24, display: "flex", alignItems: "center", gap: 10 }}>
              <input
                type="checkbox"
                id="isActive"
                checked={form.isActive}
                onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))}
                style={{ width: 16, height: 16, cursor: "pointer" }}
              />
              <label htmlFor="isActive" style={{ fontSize: 14, fontWeight: 600, color: "#333", cursor: "pointer" }}>
                نشط (يظهر في نموذج الطلبات)
              </label>
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 12, justifyContent: "flex-end" }}>
              <button onClick={() => setModalOpen(false)} style={btnStyle("#888")}>إلغاء</button>
              <button onClick={handleSave} disabled={saving} style={btnStyle("#1a1a2e")}>
                {saving ? "جاري الحفظ..." : "حفظ"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Style helpers ─────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = { padding: "12px 16px", fontWeight: 700, color: "#555", textAlign: "right", fontSize: 13 };
const tdStyle: React.CSSProperties = { padding: "14px 16px", color: "#333" };
const labelStyle: React.CSSProperties = { display: "block", fontWeight: 600, fontSize: 14, color: "#333", marginBottom: 6 };
const errText: React.CSSProperties = { color: "#e63946", fontSize: 12, margin: "4px 0 0" };

function modalInput(hasError = false): React.CSSProperties {
  return {
    width: "100%", padding: "10px 14px", borderRadius: 8,
    border: `1.5px solid ${hasError ? "#e63946" : "#ddd"}`,
    fontSize: 14, outline: "none", boxSizing: "border-box", fontFamily: "inherit",
  };
}

function btnStyle(bg: string): React.CSSProperties {
  return {
    background: bg, color: "#fff", border: "none", padding: "9px 20px",
    borderRadius: 8, fontWeight: 600, cursor: "pointer", fontSize: 14,
  };
}

function btnSmall(bg: string): React.CSSProperties {
  return { ...btnStyle(bg), padding: "5px 14px", fontSize: 13 };
}
