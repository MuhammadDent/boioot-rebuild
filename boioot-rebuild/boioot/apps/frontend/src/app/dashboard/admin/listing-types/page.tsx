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

  const [items, setItems]         = useState<ListingTypeConfig[]>([]);
  const [fetching, setFetching]   = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionError, setActionError]     = useState("");
  const [actionSuccess, setActionSuccess] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [editTarget, setEditTarget] = useState<ListingTypeConfig | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);

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
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "1.5rem 1rem" }}>
      <DashboardBackLink href="/dashboard/admin" label="العودة إلى لوحة التحكم" />

      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.5rem" }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 700 }}>أنواع الإدراج</h1>
        <button className="btn btn-primary" onClick={openCreate} style={{ padding: "0.5rem 1.2rem" }}>
          + إضافة نوع جديد
        </button>
      </div>

      <InlineBanner message={fetchError} />
      <InlineBanner message={actionError} />
      {actionSuccess && (
        <div style={{ background: "#e8f5e9", color: "#2e7d32", padding: "0.75rem 1rem", borderRadius: "8px", marginBottom: "1rem", fontSize: "0.9rem" }}>
          {actionSuccess}
        </div>
      )}

      {showForm && (
        <ListingTypeForm
          initial={editTarget ?? undefined}
          onSave={handleSave}
          onCancel={closeForm}
          saving={saving}
          error=""
        />
      )}

      {fetching ? (
        <LoadingRow />
      ) : items.length === 0 ? (
        <p style={{ color: "var(--color-text-secondary)", textAlign: "center", marginTop: "2rem" }}>
          لا توجد أنواع إدراج — أضف أول نوع الآن.
        </p>
      ) : (
        <div className="form-card" style={{ padding: 0, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ borderBottom: "1px solid var(--color-border)", background: "var(--color-bg-subtle, #f9fafb)" }}>
                <Th>القيمة الداخلية</Th>
                <Th>الاسم المعروض</Th>
                <Th>الترتيب</Th>
                <Th>الحالة</Th>
                <Th>إجراءات</Th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <Td>
                    <code style={{ fontSize: "0.85rem", background: "var(--color-bg-subtle, #f3f4f6)", padding: "2px 6px", borderRadius: 4 }}>
                      {item.value}
                    </code>
                  </Td>
                  <Td>{item.label}</Td>
                  <Td>{item.order}</Td>
                  <Td>
                    <span className={item.isActive ? "badge-green" : "badge-gray"}>
                      {item.isActive ? "نشط" : "معطل"}
                    </span>
                  </Td>
                  <Td>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      <button
                        className="btn btn-secondary"
                        style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem" }}
                        onClick={() => openEdit(item)}
                      >
                        تعديل
                      </button>
                      <button
                        className="btn btn-danger"
                        style={{ padding: "0.3rem 0.8rem", fontSize: "0.85rem" }}
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
    </div>
  );
}

// ─── Table helpers ─────────────────────────────────────────────────────────────

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th style={{ padding: "0.75rem 1rem", textAlign: "start", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)" }}>
      {children}
    </th>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td style={{ padding: "0.75rem 1rem", fontSize: "0.9rem" }}>
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
  const [value, setValue]     = useState(initial?.value ?? "");
  const [label, setLabel]     = useState(initial?.label ?? "");
  const [order, setOrder]     = useState(String(initial?.order ?? 0));
  const [isActive, setIsActive] = useState(initial?.isActive ?? true);
  const [err, setErr]         = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    if (!value.trim()) { setErr("القيمة الداخلية مطلوبة"); return; }
    if (!label.trim()) { setErr("الاسم المعروض مطلوب"); return; }
    await onSave({ value: value.trim(), label: label.trim(), order: Number(order) || 0, isActive });
  }

  return (
    <div className="form-card" style={{ marginBottom: "1.5rem" }}>
      <h2 style={{ fontSize: "1.05rem", fontWeight: 700, marginBottom: "1rem" }}>
        {initial ? "تعديل نوع الإدراج" : "إضافة نوع إدراج جديد"}
      </h2>

      <InlineBanner message={err} />

      <form onSubmit={handleSubmit} noValidate>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <div className="form-group">
            <label className="form-label">القيمة الداخلية <span style={{ color: "red" }}>*</span></label>
            <input
              className="form-input"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="مثال: Sale"
              dir="ltr"
              disabled={saving || !!initial}
              title={initial ? "لا يمكن تغيير القيمة الداخلية بعد الإنشاء" : undefined}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
              يُستخدم داخلياً — لا مسافات، يُفضَّل بالإنجليزية (مثال: WeeklyRent)
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">الاسم المعروض <span style={{ color: "red" }}>*</span></label>
            <input
              className="form-input"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="مثال: إيجار أسبوعي"
              disabled={saving}
            />
          </div>

          <div className="form-group">
            <label className="form-label">الترتيب</label>
            <input
              className="form-input"
              type="number"
              value={order}
              onChange={(e) => setOrder(e.target.value)}
              min={0}
              disabled={saving}
              dir="ltr"
            />
          </div>

          <div className="form-group" style={{ display: "flex", alignItems: "center", gap: "0.75rem", paddingTop: "1.8rem" }}>
            <input
              id="isActive"
              type="checkbox"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              disabled={saving}
              style={{ width: 18, height: 18 }}
            />
            <label htmlFor="isActive" className="form-label" style={{ marginBottom: 0, cursor: "pointer" }}>
              نشط (يظهر في النموذج)
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
