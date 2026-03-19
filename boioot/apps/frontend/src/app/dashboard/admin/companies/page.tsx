"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import {
  adminApi,
  type AdminCompaniesParams,
} from "@/features/admin/api";
import { ADMIN_PAGE_SIZE } from "@/features/admin/constants";
import { useCities } from "@/hooks/useCities";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import type { AdminCompanyResponse } from "@/types";

const SYRIA_CITIES = [
  "دمشق", "حلب", "حمص", "اللاذقية", "حماة",
  "دير الزور", "طرطوس", "الرقة", "السويداء", "درعا",
  "إدلب", "القامشلي", "الحسكة", "ريف دمشق",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminCompaniesPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "companies.view" });
  const { cities } = useCities();

  const [companies, setCompanies]   = useState<AdminCompanyResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");

  const [pendingCity, setPendingCity]         = useState("");
  const [pendingVerified, setPendingVerified] = useState("");

  const [createOpen, setCreateOpen]       = useState(false);
  const [viewCompany, setViewCompany]     = useState<AdminCompanyResponse | null>(null);
  const [editCompany, setEditCompany]     = useState<AdminCompanyResponse | null>(null);

  const appliedFiltersRef = useRef<AdminCompaniesParams>({});

  const load = useCallback(async (p: number, params: AdminCompaniesParams = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getCompanies(p, ADMIN_PAGE_SIZE, params);
      setCompanies(result.items);
      setTotalPages(result.totalPages);
      setTotalCount(result.totalCount);
      setPage(p);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load(1, {});
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleSearch() {
    const params: AdminCompaniesParams = {};
    if (pendingCity)        params.city       = pendingCity;
    if (pendingVerified !== "") params.isVerified = pendingVerified === "true";
    appliedFiltersRef.current = params;
    setActionError("");
    load(1, params);
  }

  function handleReset() {
    setPendingCity("");
    setPendingVerified("");
    appliedFiltersRef.current = {};
    setActionError("");
    load(1, {});
  }

  async function handleToggleVerify(companyId: string, currentIsVerified: boolean) {
    if (actionLoading) return;
    setActionLoading(companyId);
    setActionError("");
    try {
      const updated = await adminApi.verifyCompany(companyId, !currentIsVerified);
      setCompanies(prev => prev.map(c => c.id === updated.id ? updated : c));
      if (viewCompany?.id === updated.id) setViewCompany(updated);
      if (editCompany?.id === updated.id) setEditCompany(updated);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  function handleCreated(company: AdminCompanyResponse) {
    setCompanies(prev => [company, ...prev]);
    setTotalCount(prev => prev + 1);
    setCreateOpen(false);
  }

  function handleUpdated(company: AdminCompanyResponse) {
    setCompanies(prev => prev.map(c => c.id === company.id ? company : c));
    setEditCompany(null);
    if (viewCompany?.id === company.id) setViewCompany(company);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
              إدارة الشركات
            </h1>
            {totalCount > 0 && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {totalCount} شركة
              </p>
            )}
          </div>

          <button
            className="btn btn-primary"
            style={{ padding: "0.5rem 1.25rem", fontSize: "0.9rem" }}
            onClick={() => { setCreateOpen(v => !v); setActionError(""); }}
          >
            {createOpen ? "✕ إلغاء" : "+ إضافة شركة جديدة"}
          </button>
        </div>

        {/* ── Create form ── */}
        {createOpen && (
          <CompanyForm
            mode="create"
            onSuccess={handleCreated}
            onCancel={() => setCreateOpen(false)}
          />
        )}

        {/* ── Edit form ── */}
        {editCompany && (
          <CompanyForm
            mode="edit"
            initial={editCompany}
            onSuccess={handleUpdated}
            onCancel={() => setEditCompany(null)}
          />
        )}

        {/* ── View details panel ── */}
        {viewCompany && (
          <CompanyDetailsPanel
            company={viewCompany}
            actionLoading={actionLoading}
            onToggleVerify={handleToggleVerify}
            onEdit={() => { setEditCompany(viewCompany); setViewCompany(null); }}
            onClose={() => setViewCompany(null)}
          />
        )}

        {/* ── Filter bar ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 140 }}>
            <label className="form-label" style={{ margin: 0 }}>التوثيق</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingVerified}
              onChange={e => setPendingVerified(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="true">موثّقة</option>
              <option value="false">غير موثّقة</option>
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 160 }}>
            <label className="form-label" style={{ margin: 0 }}>المدينة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingCity}
              onChange={e => setPendingCity(e.target.value)}
            >
              <option value="">كل المدن</option>
              {cities.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem" }} onClick={handleSearch}>
              بحث
            </button>
            <button className="btn" style={{ padding: "0.45rem 1rem" }} onClick={handleReset}>
              إعادة ضبط
            </button>
          </div>
        </div>

        {/* ── Errors ── */}
        <InlineBanner message={actionError} />
        <InlineBanner message={fetchError} />

        {/* ── Loading ── */}
        {fetching && <LoadingRow />}

        {/* ── Empty ── */}
        {!fetching && !fetchError && companies.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>
              لا توجد شركات مطابقة لهذه المعايير.
            </p>
          </div>
        )}

        {/* ── List ── */}
        {!fetching && companies.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {companies.map(c => (
              <CompanyRow
                key={c.id}
                company={c}
                actionLoading={actionLoading}
                activeId={viewCompany?.id ?? editCompany?.id ?? null}
                onToggleVerify={handleToggleVerify}
                onView={() => { setViewCompany(c); setEditCompany(null); }}
                onEdit={() => { setEditCompany(c); setViewCompany(null); }}
              />
            ))}
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && !fetching && (
          <AdminPagination
            page={page} totalPages={totalPages}
            onPrev={() => load(page - 1, appliedFiltersRef.current)}
            onNext={() => load(page + 1, appliedFiltersRef.current)}
          />
        )}

      </div>
    </div>
  );
}

// ─── Company Row ──────────────────────────────────────────────────────────────

function CompanyRow({
  company: c,
  actionLoading,
  activeId,
  onToggleVerify,
  onView,
  onEdit,
}: {
  company: AdminCompanyResponse;
  actionLoading: string | null;
  activeId: string | null;
  onToggleVerify: (id: string, current: boolean) => void;
  onView: () => void;
  onEdit: () => void;
}) {
  const isThisLoading = actionLoading === c.id;
  const isActive = activeId === c.id;

  return (
    <div className="form-card" style={{
      padding: "1rem 1.25rem",
      border: isActive ? "2px solid var(--color-primary)" : undefined,
    }}>
      <div style={{
        display: "flex", justifyContent: "space-between",
        alignItems: "flex-start", gap: "1rem", flexWrap: "wrap",
      }}>

        {/* ── Info ── */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            display: "flex", alignItems: "center",
            gap: "0.5rem", marginBottom: "0.35rem", flexWrap: "wrap",
          }}>
            {c.logoUrl && (
              <img
                src={c.logoUrl} alt={c.name}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <p style={{ fontWeight: 700, fontSize: "1rem", margin: 0, color: "var(--color-text-primary)" }}>
              {c.name}
            </p>
            <span className={c.isVerified ? "badge badge-green" : "badge badge-gray"}>
              {c.isVerified ? "موثّقة" : "غير موثّقة"}
            </span>
            {c.isDeleted && <span className="badge badge-red">محذوفة</span>}
          </div>

          {c.city && (
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
              📍 {c.city}
            </p>
          )}
          {c.email && (
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
              ✉️ {c.email}
            </p>
          )}
          {c.phone && (
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
              📞 {c.phone}
            </p>
          )}

          <div style={{ display: "flex", gap: "1rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
            <CountPill label="وكلاء" count={c.agentCount} />
            <CountPill label="عقارات" count={c.propertyCount} />
            <CountPill label="مشاريع" count={c.projectCount} />
          </div>
        </div>

        {/* ── Actions ── */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", flexShrink: 0 }}>
          <button
            className="btn"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
            onClick={onView}
          >
            تفاصيل
          </button>
          <button
            className="btn"
            style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }}
            onClick={onEdit}
          >
            تعديل
          </button>
          <button
            className={c.isVerified ? "btn" : "btn btn-primary"}
            style={{
              padding: "0.4rem 0.85rem", fontSize: "0.82rem",
              ...(!c.isVerified ? {} : {
                border: "1.5px solid var(--color-border)",
                backgroundColor: "transparent",
                color: "var(--color-text-primary)",
              }),
            }}
            disabled={isThisLoading || !!actionLoading}
            onClick={() => onToggleVerify(c.id, c.isVerified)}
          >
            {isThisLoading ? "..." : c.isVerified ? "إلغاء التوثيق" : "توثيق"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Company Details Panel ────────────────────────────────────────────────────

function CompanyDetailsPanel({
  company: c,
  actionLoading,
  onToggleVerify,
  onEdit,
  onClose,
}: {
  company: AdminCompanyResponse;
  actionLoading: string | null;
  onToggleVerify: (id: string, current: boolean) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const isThisLoading = actionLoading === c.id;

  return (
    <div className="form-card" style={{ marginBottom: "1.25rem", border: "2px solid var(--color-primary)", padding: "1.5rem" }}>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {c.logoUrl && (
            <img
              src={c.logoUrl} alt={c.name}
              style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover" }}
            />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {c.name}
            </h2>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap" }}>
              <span className={c.isVerified ? "badge badge-green" : "badge badge-gray"}>
                {c.isVerified ? "موثّقة" : "غير موثّقة"}
              </span>
              {c.isDeleted && <span className="badge badge-red">محذوفة</span>}
            </div>
          </div>
        </div>
        <button
          onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      {/* fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <DetailField label="البريد الإلكتروني" value={c.email} />
        <DetailField label="الهاتف" value={c.phone} />
        <DetailField label="المدينة" value={c.city} />
        <DetailField label="العنوان" value={c.address} />
        <DetailField label="الوكلاء" value={String(c.agentCount)} />
        <DetailField label="العقارات" value={String(c.propertyCount)} />
        <DetailField label="المشاريع" value={String(c.projectCount)} />
        <DetailField label="تاريخ الإنشاء" value={new Date(c.createdAt).toLocaleDateString("ar-SY")} />
      </div>

      {c.description && (
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.3rem", fontSize: "0.8rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
            الوصف
          </p>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)", lineHeight: 1.6 }}>
            {c.description}
          </p>
        </div>
      )}

      {/* actions */}
      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          className="btn btn-primary"
          style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }}
          onClick={onEdit}
        >
          تعديل بيانات الشركة
        </button>
        <button
          className={c.isVerified ? "btn" : "btn btn-primary"}
          style={{
            padding: "0.45rem 1.1rem", fontSize: "0.88rem",
            ...(!c.isVerified ? {} : {
              border: "1.5px solid var(--color-border)",
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
            }),
          }}
          disabled={isThisLoading || !!actionLoading}
          onClick={() => onToggleVerify(c.id, c.isVerified)}
        >
          {isThisLoading ? "..." : c.isVerified ? "إلغاء التوثيق" : "توثيق الشركة"}
        </button>
      </div>

    </div>
  );
}

// ─── Company Form (Create / Edit) ─────────────────────────────────────────────

interface CompanyFormFields {
  name: string;
  description: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  logoUrl: string;
}

function CompanyForm({
  mode,
  initial,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: AdminCompanyResponse;
  onSuccess: (c: AdminCompanyResponse) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<CompanyFormFields>({
    name:        initial?.name        ?? "",
    description: initial?.description ?? "",
    email:       initial?.email       ?? "",
    phone:       initial?.phone       ?? "",
    address:     initial?.address     ?? "",
    city:        initial?.city        ?? "",
    logoUrl:     initial?.logoUrl     ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function set(key: keyof CompanyFormFields, val: string) {
    setFields(prev => ({ ...prev, [key]: val }));
  }

  async function handleSubmit() {
    if (!fields.name.trim()) { setError("اسم الشركة مطلوب"); return; }
    setSaving(true);
    setError("");
    try {
      const payload = {
        name:        fields.name.trim(),
        description: fields.description.trim() || undefined,
        email:       fields.email.trim()       || undefined,
        phone:       fields.phone.trim()       || undefined,
        address:     fields.address.trim()     || undefined,
        city:        fields.city.trim()        || undefined,
        logoUrl:     fields.logoUrl.trim()     || undefined,
      };
      let result: AdminCompanyResponse;
      if (mode === "edit" && initial) {
        result = await adminApi.updateCompany(initial.id, payload);
      } else {
        result = await adminApi.createCompany(payload);
      }
      onSuccess(result);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  const title = mode === "create" ? "إضافة شركة جديدة" : `تعديل: ${initial?.name}`;

  return (
    <div className="form-card" style={{
      marginBottom: "1.25rem",
      border: "2px solid var(--color-primary)",
      padding: "1.5rem",
    }}>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          {title}
        </h2>
        <button
          onClick={onCancel}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}
        >
          ✕
        </button>
      </div>

      <InlineBanner message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <FormField label="اسم الشركة *" required>
          <input
            className="form-input"
            value={fields.name}
            onChange={e => set("name", e.target.value)}
            placeholder="مثال: شركة النور للعقارات"
            disabled={saving}
          />
        </FormField>

        <FormField label="البريد الإلكتروني">
          <input
            className="form-input"
            type="email"
            value={fields.email}
            onChange={e => set("email", e.target.value)}
            placeholder="info@company.sy"
            disabled={saving}
          />
        </FormField>

        <FormField label="الهاتف">
          <input
            className="form-input"
            value={fields.phone}
            onChange={e => set("phone", e.target.value)}
            placeholder="+963..."
            disabled={saving}
          />
        </FormField>

        <FormField label="المدينة">
          <select
            className="form-input"
            value={fields.city}
            onChange={e => set("city", e.target.value)}
            disabled={saving}
          >
            <option value="">اختر المدينة...</option>
            {SYRIA_CITIES.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>
        </FormField>

        <FormField label="العنوان">
          <input
            className="form-input"
            value={fields.address}
            onChange={e => set("address", e.target.value)}
            placeholder="مثال: شارع الميدان، بناء 5"
            disabled={saving}
          />
        </FormField>

        <FormField label="رابط الشعار (URL)">
          <input
            className="form-input"
            value={fields.logoUrl}
            onChange={e => set("logoUrl", e.target.value)}
            placeholder="https://..."
            disabled={saving}
          />
        </FormField>
      </div>

      <FormField label="الوصف" style={{ marginBottom: "1.25rem" }}>
        <textarea
          className="form-input"
          value={fields.description}
          onChange={e => set("description", e.target.value)}
          placeholder="وصف مختصر عن الشركة..."
          rows={3}
          disabled={saving}
          style={{ resize: "vertical" }}
        />
      </FormField>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button
          className="btn btn-primary"
          style={{ padding: "0.5rem 1.4rem" }}
          onClick={handleSubmit}
          disabled={saving}
        >
          {saving ? "جارٍ الحفظ..." : mode === "create" ? "إضافة الشركة" : "حفظ التعديلات"}
        </button>
        <button
          className="btn"
          style={{ padding: "0.5rem 1rem" }}
          onClick={onCancel}
          disabled={saving}
        >
          إلغاء
        </button>
      </div>

    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ margin: "0 0 0.2rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>
        {value}
      </p>
    </div>
  );
}

function FormField({
  label, required, children, style,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  style?: React.CSSProperties;
}) {
  return (
    <div style={style}>
      <label className="form-label" style={{ display: "block", marginBottom: "0.35rem" }}>
        {label}{required && <span style={{ color: "red" }}> *</span>}
      </label>
      {children}
    </div>
  );
}

function CountPill({ label, count }: { label: string; count: number }) {
  return (
    <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
      <strong style={{ color: "var(--color-text-primary)" }}>{count}</strong> {label}
    </span>
  );
}
