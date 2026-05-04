"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { useAuth } from "@/context/AuthContext";
import { normalizeError } from "@/lib/api";

// ── Constants ─────────────────────────────────────────────────────────────────

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  None:              "غير موثق",
  Pending:           "قيد المراجعة",
  PartiallyVerified: "موثق جزئياً",
  Verified:          "موثق",
  Rejected:          "مرفوض",
};

const VERIFICATION_STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  None:              { bg: "#f1f5f9", color: "#64748b" },
  Pending:           { bg: "#fff7ed", color: "#c2410c" },
  PartiallyVerified: { bg: "#fef9c3", color: "#92400e" },
  Verified:          { bg: "#dcfce7", color: "#15803d" },
  Rejected:          { bg: "#fee2e2", color: "#dc2626" },
};

const BUSINESS_STATUS_LABELS: Record<string, string> = {
  None:     "لا يوجد",
  Pending:  "قيد المراجعة",
  Approved: "مقبول",
  Rejected: "مرفوض",
};

// ── Types ─────────────────────────────────────────────────────────────────────

interface AdminAgency {
  id:                       string;
  fullName:                 string;
  email:                    string;
  phone:                    string | null;
  role:                     string;
  roleLabel:                string;
  city:                     string | null;
  bio:                      string | null;
  logoUrl:                  string | null;
  isVisible:                boolean;
  // ── Verification (read-only from User entity, via unified verification system) ──
  isVerified:               boolean;
  verificationStatus:       string;
  verificationLevel:        number;
  businessVerificationStatus: string;
  verificationBadge:        string | null;
  // ── Agency profile ────────────────────────────────────────────────────────────
  isFeatured:               boolean;
  sortOrder:                number;
  isActive:                 boolean;
  createdAt:                string;
  listingCount:             number;
}

interface PagedResult {
  items:      AdminAgency[];
  totalCount: number;
  totalPages: number;
  page:       number;
}

// ── Profile Edit Panel ────────────────────────────────────────────────────────
// Handles visibility, bio, city, logo, sort order, featured.
// Verification is intentionally NOT here — see VerificationPanel below.

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
      background: "var(--color-bg-primary, #fff)",
      border: "1.5px solid #0f766e", borderRadius: 12,
      padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "1rem" }}>
        <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          تعديل بيانات الملف — {agency.fullName}
        </h3>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--color-text-secondary)" }}>
          ✕
        </button>
      </div>

      {/* Toggles (visibility / featured only — NOT verification) */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBottom: "1rem" }}>
        {([
          { key: "isVisible"  as const, label: "ظاهر للعموم" },
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
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }}>
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
        <button onClick={onClose} className="btn" style={{ padding: "0.5rem 1rem" }}>
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ── Verification Panel ────────────────────────────────────────────────────────
// Routes verification changes through PUT /api/admin/agencies/{userId}/verification
// which calls IAdminService.UpdateUserVerificationAsync — the single source of truth.
// IsVerified is ALWAYS derived from VerificationStatus, never written directly.

function VerificationPanel({
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
  const [verificationStatus,         setVerificationStatus]         = useState(agency.verificationStatus ?? "None");
  const [businessVerificationStatus, setBusinessVerificationStatus] = useState(agency.businessVerificationStatus ?? "None");
  const [verificationBadge,          setVerificationBadge]          = useState(agency.verificationBadge ?? "");
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState("");

  const vsStyle = VERIFICATION_STATUS_COLORS[verificationStatus] ?? { bg: "#f1f5f9", color: "#64748b" };

  const selectStyle: React.CSSProperties = {
    width: "100%", padding: "0.45rem 0.65rem", fontSize: "0.88rem",
    borderRadius: 6, border: "1.5px solid var(--color-border, #e2e8f0)",
    backgroundColor: "var(--color-bg-primary, #fff)", color: "var(--color-text-primary, #0f172a)",
    cursor: "pointer",
  };

  async function handleSave() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/agencies/${agency.id}/verification`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          verificationStatus,
          businessVerificationStatus,
          verificationBadge: verificationBadge.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      // Verification response is UserVerificationResponse — merge into AdminAgency shape
      const result = await res.json();
      onSaved({
        ...agency,
        isVerified:               result.isVerified,
        verificationStatus:       result.verificationStatus,
        verificationLevel:        result.verificationLevel,
        businessVerificationStatus: result.businessVerificationStatus,
        verificationBadge:        result.verificationBadge ?? null,
      });
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{
      background: "var(--color-bg-primary, #fff)",
      border: "2px solid #0f766e", borderRadius: 12,
      padding: "1.25rem 1.5rem", marginBottom: "1.25rem",
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <div>
          <h3 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
            إدارة التوثيق — {agency.fullName}
          </h3>
          <p style={{ margin: "0.15rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
            التوثيق يُعدَّل عبر نظام التحقق الموحد — IsVerified مشتق تلقائياً من حالة التوثيق
          </p>
        </div>
        <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1.1rem", color: "var(--color-text-secondary)" }}>
          ✕
        </button>
      </div>

      {/* Current status badge */}
      <div style={{
        display: "flex", alignItems: "center", gap: "0.5rem",
        marginBottom: "1.25rem", padding: "0.65rem 1rem",
        borderRadius: 8, background: vsStyle.bg,
      }}>
        <span style={{ fontSize: "0.82rem", fontWeight: 600, color: vsStyle.color }}>
          الحالة الحالية: {VERIFICATION_STATUS_LABELS[agency.verificationStatus] ?? agency.verificationStatus}
        </span>
        {agency.verificationBadge && (
          <span style={{
            fontSize: "0.75rem", padding: "0.1rem 0.5rem",
            borderRadius: 999, background: "#fefce8", color: "#92400e", fontWeight: 600,
          }}>
            {agency.verificationBadge}
          </span>
        )}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>

        {/* Verification Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>حالة التوثيق</label>
          <select style={selectStyle} value={verificationStatus} onChange={e => setVerificationStatus(e.target.value)} disabled={saving}>
            {Object.entries(VERIFICATION_STATUS_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>
            موثق / موثق جزئياً ← يُفعّل شارة "موثق" تلقائياً
          </p>
        </div>

        {/* Business Verification Status */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>توثيق الترخيص المهني</label>
          <select style={selectStyle} value={businessVerificationStatus} onChange={e => setBusinessVerificationStatus(e.target.value)} disabled={saving}>
            {Object.entries(BUSINESS_STATUS_LABELS).map(([val, lbl]) => (
              <option key={val} value={val}>{lbl}</option>
            ))}
          </select>
        </div>

        {/* Verification Badge */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.3rem" }}>
          <label style={{ fontSize: "0.78rem", color: "#64748b", fontWeight: 600 }}>نص الشارة (اختياري)</label>
          <input
            className="form-input"
            style={{ padding: "0.4rem 0.75rem" }}
            value={verificationBadge}
            onChange={e => setVerificationBadge(e.target.value)}
            placeholder='مثلاً: "وسيط موثوق" أو اتركه فارغاً'
            disabled={saving}
          />
          <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8" }}>
            يظهر بدلاً من "موثق ✓" على الكرت العام
          </p>
        </div>
      </div>

      {error && (
        <p style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "0.75rem" }}>{error}</p>
      )}

      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button onClick={handleSave} disabled={saving} className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }}>
          {saving ? "جارٍ الحفظ..." : "حفظ التوثيق"}
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

  // Which panel is open for which agency
  const [editAgency,   setEditAgency]   = useState<AdminAgency | null>(null);
  const [verifAgency,  setVerifAgency]  = useState<AdminAgency | null>(null);

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

  function showNotice(msg: string) {
    setNotice(msg);
    setTimeout(() => setNotice(""), 4000);
  }

  function handleProfileSaved(updated: AdminAgency) {
    setAgencies(prev => prev.map(a => a.id === updated.id ? updated : a));
    setEditAgency(null);
    showNotice(`تم تحديث بيانات "${updated.fullName}" بنجاح`);
  }

  function handleVerificationSaved(updated: AdminAgency) {
    setAgencies(prev => prev.map(a => a.id === updated.id ? updated : a));
    setVerifAgency(null);
    showNotice(`تم تحديث توثيق "${updated.fullName}" — الحالة: ${VERIFICATION_STATUS_LABELS[updated.verificationStatus] ?? updated.verificationStatus}`);
  }

  const filterParams = { type: filterType, isVisible: filterIsVisible, isVerified: filterIsVerified };

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

        {/* Edit profile panel */}
        {editAgency && token && (
          <EditPanel
            agency={editAgency}
            token={token}
            onClose={() => setEditAgency(null)}
            onSaved={handleProfileSaved}
          />
        )}

        {/* Verification panel */}
        {verifAgency && token && (
          <VerificationPanel
            agency={verifAgency}
            token={token}
            onClose={() => setVerifAgency(null)}
            onSaved={handleVerificationSaved}
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
                <option value="true">موثق فقط</option>
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
            textAlign: "center", padding: "3rem",
            background: "var(--color-bg-primary, #fff)",
            border: "1px solid #e2e8f0", borderRadius: 12, color: "#64748b",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🏢</div>
            <p style={{ margin: 0 }}>لا يوجد وسطاء أو مكاتب بالفلاتر الحالية.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
            {agencies.map(a => {
              const vsColors = VERIFICATION_STATUS_COLORS[a.verificationStatus] ?? { bg: "#f1f5f9", color: "#64748b" };
              return (
                <div
                  key={a.id}
                  style={{
                    background: "var(--color-bg-primary, #fff)",
                    border: "1px solid #e2e8f0", borderRadius: 10,
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
                    {/* Verification status — derived from VerificationStatus, never from bool alone */}
                    <span style={{
                      fontSize: "0.72rem", padding: "0.15rem 0.5rem", borderRadius: "999px",
                      background: vsColors.bg, color: vsColors.color, fontWeight: 600,
                    }}>
                      {a.verificationBadge || VERIFICATION_STATUS_LABELS[a.verificationStatus] || a.verificationStatus}
                    </span>
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

                  {/* Action buttons */}
                  <div style={{ display: "flex", gap: "0.4rem", flexShrink: 0 }}>
                    <button
                      onClick={() => { setVerifAgency(null); setEditAgency(a); }}
                      className="btn"
                      style={{ padding: "0.4rem 0.9rem", fontSize: "0.82rem" }}
                    >
                      تعديل الملف
                    </button>
                    <button
                      onClick={() => { setEditAgency(null); setVerifAgency(a); }}
                      className="btn"
                      style={{
                        padding: "0.4rem 0.9rem", fontSize: "0.82rem",
                        background: a.isVerified ? "#dcfce7" : "#f1f5f9",
                        color: a.isVerified ? "#15803d" : "#0f172a",
                        border: `1px solid ${a.isVerified ? "#86efac" : "#e2e8f0"}`,
                      }}
                    >
                      التوثيق
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {!fetching && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", gap: "0.5rem", marginTop: "1.5rem" }}>
            <button
              onClick={() => load(page - 1, filterParams)}
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
              onClick={() => load(page + 1, filterParams)}
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
