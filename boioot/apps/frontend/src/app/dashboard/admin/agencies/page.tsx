"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { useAuth } from "@/context/AuthContext";
import { normalizeError } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminAgency {
  id:           string;
  fullName:     string;
  email:        string;
  phone:        string | null;
  role:         string;
  roleLabel:    string;
  city:         string | null;
  bio:          string | null;
  logoUrl:      string | null;
  isVisible:    boolean;
  isVerified:   boolean;
  isFeatured:   boolean;
  sortOrder:    number;
  isActive:     boolean;
  createdAt:    string;
  listingCount: number;
}

interface PagedResult {
  items:      AdminAgency[];
  totalCount: number;
  totalPages: number;
  page:       number;
}

// ── Edit panel ────────────────────────────────────────────────────────────────

function EditPanel({
  agency,
  token,
  onClose,
  onSaved,
}: {
  agency:  AdminAgency;
  token:   string;
  onClose: () => void;
  onSaved: (updated: AdminAgency) => void;
}) {
  const [form, setForm]     = useState({
    isVisible:  agency.isVisible,
    isVerified: agency.isVerified,
    isFeatured: agency.isFeatured,
    bio:        agency.bio        ?? "",
    city:       agency.city       ?? "",
    logoUrl:    agency.logoUrl    ?? "",
    sortOrder:  agency.sortOrder,
  });
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/agencies/${agency.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ ...form, sortOrder: Number(form.sortOrder) }),
      });
      if (!res.ok) throw new Error(await res.text());
      const updated = await res.json();
      onSaved(updated);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "#fff", border: "1.5px solid #0f766e", borderRadius: 12,
      padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700 }}>
          تعديل: {agency.fullName}
        </h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem" }}>
          ✕
        </button>
      </div>

      {/* Toggles */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        {([
          { key: "isVisible"  as const, label: "ظاهر للعموم" },
          { key: "isVerified" as const, label: "موثق" },
          { key: "isFeatured" as const, label: "مميز" },
        ]).map(({ key, label }) => (
          <label key={key} style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer", fontSize: "0.88rem" }}>
            <input
              type="checkbox"
              checked={form[key]}
              onChange={e => setForm(p => ({ ...p, [key]: e.target.checked }))}
            />
            {label}
          </label>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>المدينة</label>
          <input
            className="form-input"
            style={{ padding: "0.4rem 0.75rem" }}
            value={form.city}
            onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
            placeholder="دمشق"
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>ترتيب الظهور</label>
          <input
            className="form-input"
            type="number"
            style={{ padding: "0.4rem 0.75rem" }}
            value={form.sortOrder}
            onChange={e => setForm(p => ({ ...p, sortOrder: Number(e.target.value) }))}
          />
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "0.75rem" }}>
        <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>رابط الشعار</label>
        <input
          className="form-input"
          style={{ padding: "0.4rem 0.75rem" }}
          value={form.logoUrl}
          onChange={e => setForm(p => ({ ...p, logoUrl: e.target.value }))}
          placeholder="https://..."
        />
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", marginBottom: "1rem" }}>
        <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>النبذة التعريفية</label>
        <textarea
          className="form-input"
          style={{ padding: "0.4rem 0.75rem", minHeight: 80, resize: "vertical" }}
          value={form.bio}
          onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
          placeholder="نبذة مختصرة عن المكتب أو الوسيط..."
        />
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button
          onClick={handleSave}
          disabled={saving}
          className="btn btn-primary"
          style={{ padding: "0.5rem 1.25rem" }}
        >
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
        <button onClick={onClose} className="btn" style={{ padding: "0.5rem 1rem" }}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AdminAgenciesPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "users.view" });
  const { token }                  = useAuth();

  const [agencies,    setAgencies]    = useState<AdminAgency[]>([]);
  const [totalCount,  setTotalCount]  = useState(0);
  const [totalPages,  setTotalPages]  = useState(1);
  const [page,        setPage]        = useState(1);
  const [fetching,    setFetching]    = useState(true);
  const [fetchError,  setFetchError]  = useState("");
  const [notice,      setNotice]      = useState("");

  const [filterType,       setFilterType]       = useState("");
  const [filterIsVisible,  setFilterIsVisible]  = useState("");
  const [filterIsVerified, setFilterIsVerified] = useState("");

  const [editAgency, setEditAgency] = useState<AdminAgency | null>(null);

  const load = useCallback(async (p: number, params: Record<string, string> = {}) => {
    setFetching(true);
    setFetchError("");
    try {
      const qs = new URLSearchParams(
        Object.fromEntries([
          ["page", String(p)], ["pageSize", "20"],
          ...Object.entries(params).filter(([, v]) => v !== ""),
        ])
      ).toString();
      const res = await fetch(`/api/admin/agencies?${qs}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error(await res.text());
      const data: PagedResult = await res.json();
      setAgencies(data.items);
      setTotalCount(data.totalCount);
      setTotalPages(data.totalPages);
      setPage(p);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authLoading && token) load(1);
  }, [authLoading, token, load]);

  if (authLoading) return <LoadingRow />;

  function applyFilters() {
    load(1, { type: filterType, isVisible: filterIsVisible, isVerified: filterIsVerified });
  }

  function resetFilters() {
    setFilterType(""); setFilterIsVisible(""); setFilterIsVerified("");
    load(1);
  }

  function handleSaved(updated: AdminAgency) {
    setAgencies(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditAgency(null);
    setNotice(`تم تحديث بيانات "${updated.fullName}" بنجاح`);
    setTimeout(() => setNotice(""), 4000);
  }

  return (
    <div dir="rtl" style={{ minHeight: "100vh", background: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>

        {/* Header */}
        <div style={{ marginBottom: "1.75rem" }}>
          <DashboardBackLink href="/dashboard/admin" label="← لوحة التحكم" />
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
            المكاتب والوسطاء
          </h1>
          {totalCount > 0 && (
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
              {totalCount} مستخدم من نوع وسيط أو مكتب
            </p>
          )}
        </div>

        {/* Notice */}
        {notice && <InlineBanner type="success" message={notice} />}

        {/* Edit panel */}
        {editAgency && token && (
          <EditPanel
            agency={editAgency}
            token={token}
            onClose={() => setEditAgency(null)}
            onSaved={handleSaved}
          />
        )}

        {/* Filters */}
        <div className="form-card" style={{ marginBottom: "1.25rem" }}>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end" }}>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 130px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>النوع</label>
              <select className="form-input" style={{ padding: "0.45rem" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
                <option value="">الكل</option>
                <option value="Office">مكتب عقاري</option>
                <option value="Broker">وسيط عقاري</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 130px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>الظهور</label>
              <select className="form-input" style={{ padding: "0.45rem" }} value={filterIsVisible} onChange={e => setFilterIsVisible(e.target.value)}>
                <option value="">الكل</option>
                <option value="true">ظاهر</option>
                <option value="false">مخفي</option>
              </select>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem", flex: "1 1 130px" }}>
              <label style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>التوثيق</label>
              <select className="form-input" style={{ padding: "0.45rem" }} value={filterIsVerified} onChange={e => setFilterIsVerified(e.target.value)}>
                <option value="">الكل</option>
                <option value="true">موثق</option>
                <option value="false">غير موثق</option>
              </select>
            </div>
            <div style={{ display: "flex", gap: "0.5rem" }}>
              <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem" }} onClick={applyFilters}>بحث</button>
              <button className="btn" style={{ padding: "0.45rem 1rem" }} onClick={resetFilters}>إعادة ضبط</button>
            </div>
          </div>
        </div>

        {/* Error */}
        {fetchError && (
          <p style={{ color: "#dc2626", marginBottom: "1rem", fontSize: "0.88rem" }}>{fetchError}</p>
        )}

        {/* Table */}
        {fetching ? (
          <LoadingRow />
        ) : agencies.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "3rem", background: "#fff",
            border: "1px solid #e2e8f0", borderRadius: 12, color: "#64748b",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏢</div>
            <p style={{ margin: 0 }}>لا يوجد وسطاء أو مكاتب بالفلاتر الحالية.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {agencies.map(a => (
              <div
                key={a.id}
                style={{
                  background: "#fff", border: "1px solid #e2e8f0", borderRadius: 10,
                  padding: "1rem 1.25rem", display: "flex",
                  alignItems: "center", gap: "1rem", flexWrap: "wrap",
                }}
              >
                {/* Avatar */}
                <div style={{
                  width: 44, height: 44, borderRadius: 10, flexShrink: 0,
                  background: "#e8f5e9", display: "flex", alignItems: "center",
                  justifyContent: "center", overflow: "hidden", border: "1px solid #e2e8f0",
                }}>
                  {a.logoUrl ? (
                    <img src={a.logoUrl} alt={a.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <span style={{ fontWeight: 700, color: "#0f766e" }}>{a.fullName[0]}</span>
                  )}
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 140 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: "0.92rem", color: "#0f172a" }}>
                    {a.fullName}
                  </p>
                  <p style={{ margin: 0, fontSize: "0.78rem", color: "#64748b" }}>
                    {a.email} {a.city ? `· ${a.city}` : ""}
                  </p>
                </div>

                {/* Badges */}
                <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
                  <span style={{
                    fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                    background: a.role === "Broker" ? "#eff6ff" : "#f0fdf4",
                    color: a.role === "Broker" ? "#1d4ed8" : "#15803d", fontWeight: 600,
                  }}>
                    {a.roleLabel}
                  </span>
                  <span style={{
                    fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                    background: a.isVisible ? "#dcfce7" : "#fee2e2",
                    color: a.isVisible ? "#15803d" : "#dc2626", fontWeight: 600,
                  }}>
                    {a.isVisible ? "ظاهر" : "مخفي"}
                  </span>
                  {a.isVerified && (
                    <span style={{
                      fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                      background: "#fefce8", color: "#92400e", fontWeight: 600,
                    }}>
                      موثق ✓
                    </span>
                  )}
                  {a.isFeatured && (
                    <span style={{
                      fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                      background: "#0f766e", color: "#fff", fontWeight: 600,
                    }}>
                      مميز ⭐
                    </span>
                  )}
                  <span style={{ fontSize: "0.72rem", color: "#94a3b8" }}>
                    {a.listingCount} إعلان
                  </span>
                </div>

                {/* Edit btn */}
                <button
                  onClick={() => setEditAgency(a)}
                  className="btn"
                  style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem", flexShrink: 0 }}
                >
                  تعديل
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {!fetching && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button
              onClick={() => load(page - 1, { type: filterType, isVisible: filterIsVisible, isVerified: filterIsVerified })}
              disabled={page <= 1}
              className="btn"
              style={{ padding: "0.4rem 1rem" }}
            >
              ← السابق
            </button>
            <span style={{ padding: "0.4rem 0.75rem", fontSize: "0.82rem", color: "#64748b", alignSelf: "center" }}>
              {page} / {totalPages}
            </span>
            <button
              onClick={() => load(page + 1, { type: filterType, isVisible: filterIsVisible, isVerified: filterIsVerified })}
              disabled={page >= totalPages}
              className="btn"
              style={{ padding: "0.4rem 1rem" }}
            >
              التالي →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
