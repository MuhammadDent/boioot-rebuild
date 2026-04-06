"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi, type UpsertPropertyTypePayload } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { PropertyTypeConfig } from "@/types";

export default function AdminPropertyTypesPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "settings.manage" });

  const [items, setItems]       = useState<PropertyTypeConfig[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");
  const [showForm, setShowForm]   = useState(false);
  const [editTarget, setEditTarget] = useState<PropertyTypeConfig | null>(null);
  const [saving, setSaving]     = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setFetching(true); setFetchError("");
    try { setItems(await adminApi.getPropertyTypes()); }
    catch (err) { setFetchError(normalizeError(err)); }
    finally { setFetching(false); }
  }, []);

  useEffect(() => { if (!authLoading) load(); }, [authLoading, load]);

  function openCreate() { setEditTarget(null); setActionError(""); setActionSuccess(""); setShowForm(true); }
  function openEdit(item: PropertyTypeConfig) { setEditTarget(item); setActionError(""); setActionSuccess(""); setShowForm(true); }
  function closeForm() { setShowForm(false); setEditTarget(null); }

  async function handleSave(payload: UpsertPropertyTypePayload) {
    setSaving(true); setActionError(""); setActionSuccess("");
    try {
      if (editTarget) { await adminApi.updatePropertyType(editTarget.id, payload); setActionSuccess("تم تحديث نوع العقار"); }
      else            { await adminApi.createPropertyType(payload);                setActionSuccess("تم إضافة نوع العقار"); }
      closeForm(); await load();
    } catch (err) { setActionError(normalizeError(err)); }
    finally { setSaving(false); }
  }

  async function handleDelete(id: string) {
    if (!confirm("هل أنت متأكد من حذف نوع العقار هذا؟")) return;
    setDeleting(id); setActionError(""); setActionSuccess("");
    try { await adminApi.deletePropertyType(id); setActionSuccess("تم الحذف"); await load(); }
    catch (err) { setActionError(normalizeError(err)); }
    finally { setDeleting(null); }
  }

  if (authLoading) return <LoadingRow />;

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <DashboardBackLink href="/dashboard" label="العودة إلى لوحة التحكم" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>أنواع العقارات</h1>
        <button className="btn btn-primary" onClick={openCreate} style={{ padding: "0.5rem 1.2rem" }}>
          + إضافة نوع جديد
        </button>
      </div>

      <InlineBanner message={fetchError} />
      <InlineBanner message={actionError} />
      {actionSuccess && (
        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {actionSuccess}
        </div>
      )}

      {showForm && (
        <PropertyTypeForm initial={editTarget ?? undefined} onSave={handleSave} onCancel={closeForm} saving={saving} />
      )}

      {fetching ? <LoadingRow /> : (
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f8fafc" }}>
                <th style={TH}>الأيقونة</th>
                <th style={TH}>الاسم</th>
                <th style={TH}>القيمة</th>
                <th style={TH}>الترتيب</th>
                <th style={TH}>الحالة</th>
                <th style={TH}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderTop: "1px solid #f1f5f9" }}>
                  <td style={TD}><span style={{ fontSize: "1.4rem" }}>{item.icon}</span></td>
                  <td style={{ ...TD, fontWeight: 600 }}>{item.label}</td>
                  <td style={{ ...TD, fontFamily: "monospace", fontSize: "0.82rem", color: "#64748b" }}>{item.value}</td>
                  <td style={TD}>{item.order}</td>
                  <td style={TD}>
                    <span className={item.isActive ? "badge-green" : "badge-red"}>
                      {item.isActive ? "نشط" : "مخفي"}
                    </span>
                  </td>
                  <td style={TD}>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button className="btn btn-secondary" onClick={() => openEdit(item)} style={{ padding: "0.3rem 0.8rem", fontSize: "0.82rem" }}>تعديل</button>
                      <button className="btn" onClick={() => handleDelete(item.id)} disabled={deleting === item.id}
                        style={{ padding: "0.3rem 0.8rem", fontSize: "0.82rem", background: "#fff1f2", color: "#dc2626", border: "1px solid #fecaca" }}>
                        {deleting === item.id ? "..." : "حذف"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr><td colSpan={6} style={{ textAlign: "center", padding: "2rem", color: "#94a3b8" }}>لا توجد أنواع عقارات</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

const TH: React.CSSProperties = { padding: "0.75rem 1rem", textAlign: "right", fontSize: "0.82rem", fontWeight: 600, color: "#64748b" };
const TD: React.CSSProperties = { padding: "0.75rem 1rem", fontSize: "0.88rem", color: "#0f172a" };

function PropertyTypeForm({
  initial, onSave, onCancel, saving,
}: {
  initial?: PropertyTypeConfig;
  onSave: (p: UpsertPropertyTypePayload) => void;
  onCancel: () => void;
  saving: boolean;
}) {
  const [value,    setValue]    = useState(initial?.value ?? "");
  const [label,    setLabel]    = useState(initial?.label ?? "");
  const [icon,     setIcon]     = useState(initial?.icon ?? "");
  const [order,    setOrder]    = useState(String(initial?.order ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);

  return (
    <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 12, padding: "1.25rem", marginBottom: "1.5rem" }}>
      <h3 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700 }}>
        {initial ? "تعديل نوع العقار" : "إضافة نوع عقار جديد"}
      </h3>
      <form onSubmit={(e) => { e.preventDefault(); onSave({ value: value.trim(), label: label.trim(), icon: icon.trim(), order: Number(order), isActive }); }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div className="form-group">
            <label className="form-label">القيمة الداخلية <span style={{ color: "red" }}>*</span></label>
            <input className="form-input" value={value} onChange={(e) => setValue(e.target.value)}
              placeholder="مثال: Apartment" disabled={saving} dir="ltr" />
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>بالإنجليزية بدون مسافات</p>
          </div>
          <div className="form-group">
            <label className="form-label">الاسم المعروض <span style={{ color: "red" }}>*</span></label>
            <input className="form-input" value={label} onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: شقة" disabled={saving} />
          </div>
          <div className="form-group">
            <label className="form-label">الأيقونة (emoji)</label>
            <input className="form-input" value={icon} onChange={(e) => setIcon(e.target.value)}
              placeholder="🏢" disabled={saving} style={{ fontSize: "1.3rem" }} />
          </div>
          <div className="form-group">
            <label className="form-label">الترتيب</label>
            <input className="form-input" type="number" value={order} onChange={(e) => setOrder(e.target.value)}
              min={0} disabled={saving} dir="ltr" />
          </div>
          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "1.8rem" }}>
            <input id="isActiveP" type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)}
              disabled={saving} style={{ width: 18, height: 18 }} />
            <label htmlFor="isActiveP" className="form-label" style={{ marginBottom: 0, cursor: "pointer" }}>
              نشط (يظهر في نموذج الإضافة)
            </label>
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", marginTop: "1rem" }}>
          <button type="submit" className="btn btn-primary" disabled={saving} style={{ padding: "0.5rem 1.4rem" }}>
            {saving ? "جارٍ الحفظ..." : "حفظ"}
          </button>
          <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={saving} style={{ padding: "0.5rem 1.2rem" }}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
