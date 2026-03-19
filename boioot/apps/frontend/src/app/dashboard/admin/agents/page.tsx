"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import { ADMIN_PAGE_SIZE } from "@/features/admin/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import type { AdminAgentResponse, AdminCompanyResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminAgentsPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "agents.view" });

  const [agents, setAgents]         = useState<AdminAgentResponse[]>([]);
  const [companies, setCompanies]   = useState<AdminCompanyResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");

  const [pendingIsActive, setPendingIsActive]   = useState("");
  const [pendingCompanyId, setPendingCompanyId] = useState("");
  const appliedRef = useRef<{ companyId?: string; isActive?: boolean }>({});

  const [createOpen, setCreateOpen]     = useState(false);
  const [viewAgent, setViewAgent]       = useState<AdminAgentResponse | null>(null);
  const [editAgent, setEditAgent]       = useState<AdminAgentResponse | null>(null);

  const load = useCallback(async (
    p: number,
    params: { companyId?: string; isActive?: boolean } = {},
  ) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getAdminAgents(p, ADMIN_PAGE_SIZE, params);
      setAgents(result.items);
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
    if (!isLoading && user) {
      load(1);
      adminApi.getCompanies(1, 100, {}).then(r => setCompanies(r.items)).catch(() => {});
    }
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleSearch() {
    const params: { companyId?: string; isActive?: boolean } = {};
    if (pendingCompanyId)       params.companyId = pendingCompanyId;
    if (pendingIsActive !== "") params.isActive  = pendingIsActive === "true";
    appliedRef.current = params;
    setActionError("");
    load(1, params);
  }

  function handleReset() {
    setPendingIsActive("");
    setPendingCompanyId("");
    appliedRef.current = {};
    setActionError("");
    load(1);
  }

  async function handleToggleStatus(agentId: string, current: boolean) {
    if (actionLoading) return;
    setActionLoading(agentId);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(agentId, !current);
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, isActive: updated.isActive } : a));
      if (viewAgent?.id === agentId) setViewAgent(v => v ? { ...v, isActive: updated.isActive } : v);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  function handleCreated(agent: AdminAgentResponse) {
    setAgents(prev => [agent, ...prev]);
    setTotalCount(c => c + 1);
    setCreateOpen(false);
  }

  function handleUpdated(agent: AdminAgentResponse) {
    setAgents(prev => prev.map(a => a.id === agent.id ? agent : a));
    setEditAgent(null);
    if (viewAgent?.id === agent.id) setViewAgent(agent);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
              الوكلاء العقاريون
            </h1>
            {totalCount > 0 && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {totalCount} وكيل
              </p>
            )}
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "0.5rem 1.25rem" }}
            onClick={() => { setCreateOpen(v => !v); setActionError(""); }}
          >
            {createOpen ? "✕ إلغاء" : "+ إضافة وكيل جديد"}
          </button>
        </div>

        {/* ── Create form ── */}
        {createOpen && (
          <AgentForm
            mode="create"
            companies={companies}
            onSuccess={handleCreated}
            onCancel={() => setCreateOpen(false)}
          />
        )}

        {/* ── Edit form ── */}
        {editAgent && (
          <AgentForm
            mode="edit"
            initial={editAgent}
            companies={companies}
            onSuccess={handleUpdated}
            onCancel={() => setEditAgent(null)}
          />
        )}

        {/* ── Details panel ── */}
        {viewAgent && (
          <AgentDetailsPanel
            agent={viewAgent}
            actionLoading={actionLoading}
            onToggle={handleToggleStatus}
            onEdit={() => { setEditAgent(viewAgent); setViewAgent(null); }}
            onClose={() => setViewAgent(null)}
          />
        )}

        {/* ── Filters ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 160 }}>
            <label className="form-label" style={{ margin: 0 }}>الشركة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingCompanyId}
              onChange={e => setPendingCompanyId(e.target.value)}
            >
              <option value="">كل الشركات</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "0.35rem", minWidth: 140 }}>
            <label className="form-label" style={{ margin: 0 }}>الحالة</label>
            <select
              className="form-input"
              style={{ padding: "0.45rem 0.75rem" }}
              value={pendingIsActive}
              onChange={e => setPendingIsActive(e.target.value)}
            >
              <option value="">الكل</option>
              <option value="true">نشط</option>
              <option value="false">غير نشط</option>
            </select>
          </div>

          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem" }} onClick={handleSearch}>بحث</button>
            <button className="btn" style={{ padding: "0.45rem 1rem" }} onClick={handleReset}>إعادة ضبط</button>
          </div>
        </div>

        <InlineBanner message={actionError} />
        <InlineBanner message={fetchError} />

        {fetching && <LoadingRow />}

        {!fetching && !fetchError && agents.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>لا يوجد وكلاء مطابقون لهذه المعايير.</p>
          </div>
        )}

        {!fetching && agents.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {agents.map(a => (
              <AgentRow
                key={a.id}
                agent={a}
                activeId={viewAgent?.id ?? editAgent?.id ?? null}
                actionLoading={actionLoading}
                onView={() => { setViewAgent(a); setEditAgent(null); }}
                onEdit={() => { setEditAgent(a); setViewAgent(null); }}
                onToggle={handleToggleStatus}
              />
            ))}
          </div>
        )}

        {totalPages > 1 && !fetching && (
          <AdminPagination
            page={page} totalPages={totalPages}
            onPrev={() => load(page - 1, appliedRef.current)}
            onNext={() => load(page + 1, appliedRef.current)}
          />
        )}

      </div>
    </div>
  );
}

// ─── Agent Row ────────────────────────────────────────────────────────────────

function AgentRow({
  agent: a,
  activeId,
  actionLoading,
  onView,
  onEdit,
  onToggle,
}: {
  agent: AdminAgentResponse;
  activeId: string | null;
  actionLoading: string | null;
  onView: () => void;
  onEdit: () => void;
  onToggle: (id: string, current: boolean) => void;
}) {
  const isLoading = actionLoading === a.id;
  return (
    <div className="form-card" style={{
      padding: "1rem 1.25rem",
      border: activeId === a.id ? "2px solid var(--color-primary)" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
            {a.profileImageUrl && (
              <img src={a.profileImageUrl} alt={a.fullName}
                style={{ width: 32, height: 32, borderRadius: "50%", objectFit: "cover" }} />
            )}
            <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-text-primary)" }}>{a.fullName}</span>
            <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{a.userCode}</span>
            <span className={a.isActive ? "badge badge-green" : "badge badge-red"}>
              {a.isActive ? "نشط" : "غير نشط"}
            </span>
            {a.isDeleted && <span className="badge badge-red">محذوف</span>}
          </div>

          <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>✉️ {a.email}</p>
          {a.phone && <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>📞 {a.phone}</p>}
          {a.companyName && (
            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>
              🏢 {a.companyName}
            </p>
          )}

          <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
            <StatPill label="عقارات" value={a.propertyCount} />
            <StatPill label="صفقات" value={a.dealsCount} />
            {a.averageRating !== undefined && a.averageRating !== null && (
              <StatPill label="تقييم" value={`${a.averageRating.toFixed(1)} ⭐ (${a.reviewCount})`} />
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flexShrink: 0 }}>
          <button className="btn" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={onView}>تفاصيل</button>
          <button className="btn" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={onEdit}>تعديل</button>
          <button
            className={a.isActive ? "btn" : "btn btn-primary"}
            style={{
              padding: "0.4rem 0.85rem", fontSize: "0.82rem",
              ...(!a.isActive ? {} : { border: "1.5px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-primary)" }),
            }}
            disabled={isLoading || !!actionLoading || a.isDeleted}
            onClick={() => onToggle(a.id, a.isActive)}
          >
            {isLoading ? "..." : a.isActive ? "تعطيل" : "تفعيل"}
          </button>
        </div>

      </div>
    </div>
  );
}

// ─── Agent Details Panel ──────────────────────────────────────────────────────

function AgentDetailsPanel({
  agent: a,
  actionLoading,
  onToggle,
  onEdit,
  onClose,
}: {
  agent: AdminAgentResponse;
  actionLoading: string | null;
  onToggle: (id: string, current: boolean) => void;
  onEdit: () => void;
  onClose: () => void;
}) {
  const isLoading = actionLoading === a.id;
  return (
    <div className="form-card" style={{ marginBottom: "1.25rem", border: "2px solid var(--color-primary)", padding: "1.5rem" }}>

      {/* header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1.25rem" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {a.profileImageUrl && (
            <img src={a.profileImageUrl} alt={a.fullName}
              style={{ width: 52, height: 52, borderRadius: "50%", objectFit: "cover" }} />
          )}
          <div>
            <h2 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
              {a.fullName}
            </h2>
            <div style={{ display: "flex", gap: "0.4rem", marginTop: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{a.userCode}</span>
              <span className={a.isActive ? "badge badge-green" : "badge badge-red"}>
                {a.isActive ? "نشط" : "غير نشط"}
              </span>
              {a.isDeleted && <span className="badge badge-red">محذوف</span>}
            </div>
          </div>
        </div>
        <button onClick={onClose}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}>
          ✕
        </button>
      </div>

      {/* fields */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <DetailField label="البريد الإلكتروني" value={a.email} />
        <DetailField label="الهاتف" value={a.phone} />
        <DetailField label="الشركة" value={a.companyName} />
        <DetailField label="عدد العقارات" value={String(a.propertyCount)} />
        <DetailField label="الصفقات المنجزة" value={String(a.dealsCount)} />
        {a.averageRating !== undefined && a.averageRating !== null && (
          <DetailField label="متوسط التقييم" value={`${a.averageRating.toFixed(1)} / 5 (${a.reviewCount} تقييم)`} />
        )}
        <DetailField label="تاريخ الانضمام" value={new Date(a.createdAt).toLocaleDateString("ar-SY")} />
      </div>

      {a.bio && (
        <div style={{ marginBottom: "1.25rem" }}>
          <p style={{ margin: "0 0 0.3rem", fontSize: "0.78rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>نبذة</p>
          <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)", lineHeight: 1.65 }}>{a.bio}</p>
        </div>
      )}

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button className="btn btn-primary" style={{ padding: "0.45rem 1.1rem", fontSize: "0.88rem" }} onClick={onEdit}>
          تعديل بيانات الوكيل
        </button>
        <button
          className={a.isActive ? "btn" : "btn btn-primary"}
          style={{
            padding: "0.45rem 1.1rem", fontSize: "0.88rem",
            ...(!a.isActive ? {} : { border: "1.5px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-primary)" }),
          }}
          disabled={isLoading || !!actionLoading || a.isDeleted}
          onClick={() => onToggle(a.id, a.isActive)}
        >
          {isLoading ? "..." : a.isActive ? "تعطيل الوكيل" : "تفعيل الوكيل"}
        </button>
      </div>

    </div>
  );
}

// ─── Agent Form ───────────────────────────────────────────────────────────────

interface AgentFormFields {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  bio: string;
  companyId: string;
}

function AgentForm({
  mode,
  initial,
  companies,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: AdminAgentResponse;
  companies: AdminCompanyResponse[];
  onSuccess: (a: AdminAgentResponse) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<AgentFormFields>({
    fullName:  initial?.fullName  ?? "",
    email:     initial?.email     ?? "",
    password:  "",
    phone:     initial?.phone     ?? "",
    bio:       initial?.bio       ?? "",
    companyId: initial?.companyId ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function set(k: keyof AgentFormFields, v: string) { setFields(p => ({ ...p, [k]: v })); }

  async function handleSubmit() {
    if (!fields.fullName.trim()) { setError("الاسم مطلوب"); return; }
    if (mode === "create" && !fields.email.trim()) { setError("البريد الإلكتروني مطلوب"); return; }
    if (mode === "create" && !fields.password) { setError("كلمة المرور مطلوبة"); return; }
    setSaving(true); setError("");
    try {
      let result: AdminAgentResponse;
      if (mode === "create") {
        result = await adminApi.createAdminAgent({
          fullName:  fields.fullName.trim(),
          email:     fields.email.trim(),
          password:  fields.password,
          phone:     fields.phone.trim()  || undefined,
          bio:       fields.bio.trim()    || undefined,
          companyId: fields.companyId     || undefined,
        });
      } else {
        result = await adminApi.updateAdminAgent(initial!.id, {
          fullName:  fields.fullName.trim(),
          phone:     fields.phone.trim()  || undefined,
          bio:       fields.bio.trim()    || undefined,
          companyId: fields.companyId     || undefined,
        });
      }
      onSuccess(result);
    } catch (e) { setError(normalizeError(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="form-card" style={{ marginBottom: "1.25rem", border: "2px solid var(--color-primary)", padding: "1.5rem" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.25rem" }}>
        <h2 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
          {mode === "create" ? "إضافة وكيل عقاري جديد" : `تعديل: ${initial?.fullName}`}
        </h2>
        <button onClick={onCancel}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}>
          ✕
        </button>
      </div>

      <InlineBanner message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <FField label="الاسم الكامل *">
          <input className="form-input" value={fields.fullName} onChange={e => set("fullName", e.target.value)}
            placeholder="أحمد محمد" disabled={saving} />
        </FField>

        {mode === "create" && (
          <FField label="البريد الإلكتروني *">
            <input className="form-input" type="email" value={fields.email} onChange={e => set("email", e.target.value)}
              placeholder="ahmed@example.sy" disabled={saving} />
          </FField>
        )}

        {mode === "create" && (
          <FField label="كلمة المرور *">
            <input className="form-input" type="password" value={fields.password} onChange={e => set("password", e.target.value)}
              placeholder="8 أحرف على الأقل" disabled={saving} />
          </FField>
        )}

        <FField label="الهاتف">
          <input className="form-input" value={fields.phone} onChange={e => set("phone", e.target.value)}
            placeholder="+963..." disabled={saving} />
        </FField>

        <FField label="الشركة">
          <select className="form-input" value={fields.companyId} onChange={e => set("companyId", e.target.value)} disabled={saving}>
            <option value="">بدون شركة</option>
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </FField>
      </div>

      <FField label="نبذة عن الوكيل" style={{ marginBottom: "1.25rem" }}>
        <textarea className="form-input" value={fields.bio} onChange={e => set("bio", e.target.value)}
          placeholder="خبرة في بيع وإيجار العقارات السكنية..." rows={3}
          disabled={saving} style={{ resize: "vertical" }} />
      </FField>

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn btn-primary" style={{ padding: "0.5rem 1.4rem" }} onClick={handleSubmit} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : mode === "create" ? "إضافة الوكيل" : "حفظ التعديلات"}
        </button>
        <button className="btn" style={{ padding: "0.5rem 1rem" }} onClick={onCancel} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ margin: "0 0 0.2rem", fontSize: "0.77rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{value}</p>
    </div>
  );
}

function FField({ label, children, style }: { label: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={style}>
      <label className="form-label" style={{ display: "block", marginBottom: "0.35rem" }}>{label}</label>
      {children}
    </div>
  );
}

function StatPill({ label, value }: { label: string; value: string | number }) {
  return (
    <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
      <strong style={{ color: "var(--color-text-primary)" }}>{value}</strong> {label}
    </span>
  );
}
