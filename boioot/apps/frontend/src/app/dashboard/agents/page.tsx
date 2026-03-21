"use client";

import { useState, useEffect, type FormEvent } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { hasPermission } from "@/lib/permissions";
import Spinner from "@/components/ui/Spinner";

interface AgentSummary {
  id: string;
  userCode: string;
  fullName: string;
  email: string;
  phone?: string;
  bio?: string;
  profileImageUrl?: string;
  isActive: boolean;
  createdAt: string;
}

interface CreateAgentForm {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  bio: string;
}

const EMPTY_FORM: CreateAgentForm = {
  fullName: "",
  email: "",
  password: "",
  phone: "",
  bio: "",
};

export default function AgentsPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  const [agents, setAgents] = useState<AgentSummary[]>([]);
  const [fetching, setFetching] = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<CreateAgentForm>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [togglingId, setTogglingId] = useState<string | null>(null);

  // "agents.manage" → Broker, CompanyOwner, Admin (see PLATFORM_ROLE_PERMISSIONS in rbac.ts).
  const canManageAgents = hasPermission(user, "agents.manage");

  useEffect(() => {
    if (!isLoading && !canManageAgents) {
      router.replace("/dashboard");
    }
  }, [isLoading, canManageAgents, router]);

  useEffect(() => {
    if (!canManageAgents) return;
    fetchAgents();
  }, [canManageAgents]);

  async function fetchAgents() {
    try {
      setFetching(true);
      setFetchError("");
      const data = await api.get<AgentSummary[]>("/agents/my-agents");
      setAgents(data);
    } catch {
      setFetchError("تعذّر تحميل قائمة الوكلاء");
    } finally {
      setFetching(false);
    }
  }

  async function handleCreateAgent(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!form.fullName.trim() || !form.email.trim() || !form.password.trim()) {
      setFormError("الاسم والبريد وكلمة المرور مطلوبة");
      return;
    }
    if (form.password.length < 8) {
      setFormError("كلمة المرور يجب أن لا تقل عن 8 أحرف");
      return;
    }

    try {
      setSubmitting(true);
      const newAgent = await api.post<AgentSummary>("/agents", {
        fullName: form.fullName.trim(),
        email: form.email.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
        bio: form.bio.trim() || undefined,
      });
      setAgents((prev) => [newAgent, ...prev]);
      setForm(EMPTY_FORM);
      setShowForm(false);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "حدث خطأ أثناء إنشاء الوكيل";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleActive(agentId: string) {
    try {
      setTogglingId(agentId);
      await api.patch(`/api/agents/${agentId}/toggle-active`, {});
      setAgents((prev) =>
        prev.map((a) =>
          a.id === agentId ? { ...a, isActive: !a.isActive } : a
        )
      );
    } catch {
      alert("تعذّر تحديث الحالة");
    } finally {
      setTogglingId(null);
    }
  }

  if (isLoading || !canManageAgents) return <Spinner />;

  return (
    <div className="dashboard-page" style={{ maxWidth: 900, margin: "0 auto", padding: "2rem 1rem" }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ fontSize: "1.4rem", fontWeight: 700, marginBottom: "0.25rem" }}>إدارة الوكلاء</h1>
          <p style={{ color: "var(--color-text-muted)", fontSize: "0.88rem" }}>
            {agents.length > 0
              ? `لديك ${agents.length} وكيل مسجّل`
              : "لم تُضف وكلاء بعد"}
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => { setShowForm((v) => !v); setFormError(""); }}
          style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          إضافة وكيل
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{
          background: "var(--color-bg)", border: "1px solid var(--color-border)",
          borderRadius: 12, padding: "1.5rem", marginBottom: "1.5rem",
          boxShadow: "0 2px 8px rgba(0,0,0,0.06)"
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, marginBottom: "1rem" }}>إنشاء وكيل جديد</h2>

          {formError && (
            <div className="error-banner" style={{ marginBottom: "1rem" }}>{formError}</div>
          )}

          <form onSubmit={handleCreateAgent} noValidate>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
              <div className="form-group">
                <label className="form-label">الاسم الكامل *</label>
                <input
                  className="form-input" type="text" value={form.fullName}
                  onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
                  placeholder="اسم الوكيل"
                />
              </div>
              <div className="form-group">
                <label className="form-label">البريد الإلكتروني *</label>
                <input
                  className="form-input" type="email" value={form.email}
                  onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
                  placeholder="agent@example.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">كلمة المرور *</label>
                <input
                  className="form-input" type="password" value={form.password}
                  onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
                  placeholder="8 أحرف على الأقل"
                />
              </div>
              <div className="form-group">
                <label className="form-label">رقم الهاتف (اختياري)</label>
                <input
                  className="form-input" type="tel" value={form.phone}
                  onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
                  placeholder="+963..."
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">نبذة عن الوكيل (اختياري)</label>
              <textarea
                className="form-input" rows={2} value={form.bio}
                onChange={(e) => setForm((p) => ({ ...p, bio: e.target.value }))}
                placeholder="خبرات، تخصصات..."
                style={{ resize: "vertical" }}
              />
            </div>
            <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
              <button
                type="button" className="btn btn-ghost"
                onClick={() => { setShowForm(false); setForm(EMPTY_FORM); setFormError(""); }}
              >
                إلغاء
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? "جاري الإنشاء..." : "إنشاء الوكيل"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Agents list */}
      {fetching ? (
        <div style={{ textAlign: "center", padding: "3rem" }}><Spinner /></div>
      ) : fetchError ? (
        <div className="error-banner">{fetchError}</div>
      ) : agents.length === 0 ? (
        <div style={{
          textAlign: "center", padding: "4rem 2rem",
          border: "2px dashed var(--color-border)", borderRadius: 12,
          color: "var(--color-text-muted)"
        }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 1rem", display: "block", opacity: 0.4 }}>
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
            <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <p style={{ fontWeight: 600, marginBottom: "0.5rem" }}>لا يوجد وكلاء بعد</p>
          <p style={{ fontSize: "0.85rem" }}>ابدأ بإضافة وكيلك الأول من الزر أعلاه</p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {agents.map((agent) => (
            <div
              key={agent.id}
              style={{
                display: "flex", alignItems: "center", gap: "1rem",
                background: "var(--color-bg)", border: "1px solid var(--color-border)",
                borderRadius: 10, padding: "1rem 1.25rem",
                opacity: agent.isActive ? 1 : 0.6
              }}
            >
              {/* Avatar */}
              <div style={{
                width: 46, height: 46, borderRadius: "50%", flexShrink: 0,
                background: "var(--color-primary-light, #e8f5e9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontWeight: 700, fontSize: "1.1rem", color: "var(--color-primary)"
              }}>
                {agent.fullName.charAt(0)}
              </div>

              {/* Info */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
                  <span style={{ fontWeight: 700 }}>{agent.fullName}</span>
                  <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)", background: "var(--color-bg-secondary)", padding: "0.1rem 0.5rem", borderRadius: 20 }}>
                    {agent.userCode}
                  </span>
                  {!agent.isActive && (
                    <span style={{ fontSize: "0.72rem", color: "#c0392b", background: "#fdecea", padding: "0.1rem 0.5rem", borderRadius: 20 }}>
                      موقوف
                    </span>
                  )}
                </div>
                <div style={{ fontSize: "0.83rem", color: "var(--color-text-muted)", marginTop: "0.2rem" }}>
                  {agent.email}
                  {agent.phone && ` · ${agent.phone}`}
                </div>
                {agent.bio && (
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)", marginTop: "0.2rem", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {agent.bio}
                  </div>
                )}
              </div>

              {/* Toggle button */}
              <button
                className="btn btn-ghost"
                style={{ fontSize: "0.82rem", whiteSpace: "nowrap", flexShrink: 0 }}
                onClick={() => handleToggleActive(agent.id)}
                disabled={togglingId === agent.id}
              >
                {togglingId === agent.id ? "..." : agent.isActive ? "إيقاف" : "تفعيل"}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
