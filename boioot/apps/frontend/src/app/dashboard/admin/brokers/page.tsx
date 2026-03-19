"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import { ADMIN_PAGE_SIZE } from "@/features/admin/constants";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { normalizeError } from "@/lib/api";
import type { AdminBrokerResponse } from "@/types";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBrokersPage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "users.view" });
  const router = useRouter();

  const [brokers, setBrokers]       = useState<AdminBrokerResponse[]>([]);
  const [page, setPage]             = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching, setFetching]     = useState(true);
  const [fetchError, setFetchError] = useState("");

  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [actionError, setActionError]     = useState("");

  const [pendingIsActive, setPendingIsActive] = useState("");
  const appliedRef = useRef<{ isActive?: boolean }>({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editBroker, setEditBroker] = useState<AdminBrokerResponse | null>(null);

  const load = useCallback(async (
    p: number,
    params: { isActive?: boolean } = {},
  ) => {
    setFetching(true);
    setFetchError("");
    try {
      const result = await adminApi.getAdminBrokers(p, ADMIN_PAGE_SIZE, params);
      setBrokers(result.items);
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
    if (!isLoading && user) load(1);
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  function handleSearch() {
    const params: { isActive?: boolean } = {};
    if (pendingIsActive !== "") params.isActive = pendingIsActive === "true";
    appliedRef.current = params;
    setActionError("");
    load(1, params);
  }

  function handleReset() {
    setPendingIsActive("");
    appliedRef.current = {};
    setActionError("");
    load(1);
  }

  async function handleToggleStatus(brokerId: string, current: boolean) {
    if (actionLoading) return;
    setActionLoading(brokerId);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(brokerId, !current);
      setBrokers(prev => prev.map(b => b.id === brokerId ? { ...b, isActive: updated.isActive } : b));
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(null);
    }
  }

  function handleCreated(broker: AdminBrokerResponse) {
    setBrokers(prev => [broker, ...prev]);
    setTotalCount(c => c + 1);
    setCreateOpen(false);
    router.push(`/dashboard/admin/brokers/${broker.id}`);
  }

  function handleUpdated(broker: AdminBrokerResponse) {
    setBrokers(prev => prev.map(b => b.id === broker.id ? broker : b));
    setEditBroker(null);
  }

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 980, margin: "0 auto" }}>

        {/* ── Header ── */}
        <div style={{ marginBottom: "1.75rem", display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem" }}>
          <div>
            <DashboardBackLink href="/dashboard" label="← لوحة التحكم" />
            <h1 style={{ fontSize: "1.4rem", fontWeight: 700, margin: 0, color: "var(--color-text-primary)" }}>
              الوسطاء العقاريون
            </h1>
            {totalCount > 0 && (
              <p style={{ margin: "0.25rem 0 0", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                {totalCount} وسيط
              </p>
            )}
          </div>
          <button
            className="btn btn-primary"
            style={{ padding: "0.5rem 1.25rem" }}
            onClick={() => { setCreateOpen(v => !v); setActionError(""); }}
          >
            {createOpen ? "✕ إلغاء" : "+ إضافة وسيط جديد"}
          </button>
        </div>

        {/* ── Create form ── */}
        {createOpen && (
          <BrokerForm
            mode="create"
            onSuccess={handleCreated}
            onCancel={() => setCreateOpen(false)}
          />
        )}

        {/* ── Edit form ── */}
        {editBroker && (
          <BrokerForm
            mode="edit"
            initial={editBroker}
            onSuccess={handleUpdated}
            onCancel={() => setEditBroker(null)}
          />
        )}

        {/* ── Filters ── */}
        <div className="form-card" style={{
          marginBottom: "1.25rem",
          display: "flex", flexWrap: "wrap", gap: "0.75rem", alignItems: "flex-end",
        }}>
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

        {!fetching && !fetchError && brokers.length === 0 && (
          <div className="form-card" style={{ textAlign: "center", padding: "3rem 1rem" }}>
            <p style={{ color: "var(--color-text-secondary)", margin: 0 }}>لا يوجد وسطاء عقاريون مطابقون لهذه المعايير.</p>
          </div>
        )}

        {!fetching && brokers.length > 0 && (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {brokers.map(b => (
              <BrokerRow
                key={b.id}
                broker={b}
                activeId={editBroker?.id ?? null}
                actionLoading={actionLoading}
                onView={() => router.push(`/dashboard/admin/brokers/${b.id}`)}
                onEdit={() => { setEditBroker(b); }}
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

// ─── Broker Row ───────────────────────────────────────────────────────────────

function BrokerRow({
  broker: b,
  activeId,
  actionLoading,
  onView,
  onEdit,
  onToggle,
}: {
  broker: AdminBrokerResponse;
  activeId: string | null;
  actionLoading: string | null;
  onView: () => void;
  onEdit: () => void;
  onToggle: (id: string, current: boolean) => void;
}) {
  const isLoading = actionLoading === b.id;
  return (
    <div className="form-card" style={{
      padding: "1rem 1.25rem",
      border: activeId === b.id ? "2px solid var(--color-primary)" : undefined,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "1rem", flexWrap: "wrap" }}>

        <div
          style={{ flex: 1, minWidth: 0, display: "flex", gap: "0.85rem", alignItems: "flex-start", cursor: "pointer" }}
          onClick={onView}
          role="button"
          title={`عرض بروفايل ${b.fullName}`}
        >
          {/* avatar */}
          <div style={{
            width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
            background: "var(--color-border)", overflow: "hidden",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.2rem",
          }}>
            {b.profileImageUrl
              ? <img src={b.profileImageUrl} alt={b.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : "👤"
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "0.3rem", flexWrap: "wrap" }}>
              <span style={{ fontWeight: 700, fontSize: "1rem", color: "var(--color-primary)", textDecoration: "underline", textDecorationStyle: "dotted" }}>{b.fullName}</span>
              <span style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>{b.userCode}</span>
              <span className={b.isActive ? "badge badge-green" : "badge badge-red"}>
                {b.isActive ? "نشط" : "غير نشط"}
              </span>
              {b.isDeleted && <span className="badge badge-red">محذوف</span>}
            </div>

            <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>✉️ {b.email}</p>
            {b.phone && <p style={{ margin: "0 0 0.15rem", fontSize: "0.83rem", color: "var(--color-text-secondary)" }}>📞 {b.phone}</p>}

            <div style={{ display: "flex", gap: "1.25rem", marginTop: "0.4rem", flexWrap: "wrap" }}>
              <StatPill label="وكلاء" value={b.agentCount} />
              <StatPill label="عقارات" value={b.propertyCount} />
              <StatPill label="صفقات" value={b.dealsCount} />
              {b.averageRating !== undefined && b.averageRating !== null && (
                <StatPill label="تقييم" value={`${b.averageRating.toFixed(1)} ⭐ (${b.reviewCount})`} />
              )}
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", flexShrink: 0 }}>
          <button className="btn" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={onView}>تفاصيل</button>
          <button className="btn" style={{ padding: "0.4rem 0.85rem", fontSize: "0.82rem" }} onClick={onEdit}>تعديل</button>
          <button
            className={b.isActive ? "btn" : "btn btn-primary"}
            style={{
              padding: "0.4rem 0.85rem", fontSize: "0.82rem",
              ...(!b.isActive ? {} : { border: "1.5px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-primary)" }),
            }}
            disabled={isLoading || !!actionLoading || b.isDeleted}
            onClick={() => onToggle(b.id, b.isActive)}
          >
            {isLoading ? "..." : b.isActive ? "تعطيل" : "تفعيل"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Broker Form ──────────────────────────────────────────────────────────────

interface BrokerFormFields {
  fullName: string;
  email: string;
  password: string;
  phone: string;
}

function BrokerForm({
  mode,
  initial,
  onSuccess,
  onCancel,
}: {
  mode: "create" | "edit";
  initial?: AdminBrokerResponse;
  onSuccess: (b: AdminBrokerResponse) => void;
  onCancel: () => void;
}) {
  const [fields, setFields] = useState<BrokerFormFields>({
    fullName: initial?.fullName ?? "",
    email:    initial?.email    ?? "",
    password: "",
    phone:    initial?.phone    ?? "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState("");

  function set(k: keyof BrokerFormFields, v: string) { setFields(p => ({ ...p, [k]: v })); }

  async function handleSubmit() {
    if (!fields.fullName.trim()) { setError("الاسم مطلوب"); return; }
    if (mode === "create" && !fields.email.trim()) { setError("البريد الإلكتروني مطلوب"); return; }
    if (mode === "create" && !fields.password) { setError("كلمة المرور مطلوبة"); return; }
    setSaving(true); setError("");
    try {
      let result: AdminBrokerResponse;
      if (mode === "create") {
        result = await adminApi.createAdminBroker({
          fullName: fields.fullName.trim(),
          email:    fields.email.trim(),
          password: fields.password,
          phone:    fields.phone.trim() || undefined,
        });
      } else {
        result = await adminApi.updateAdminBroker(initial!.id, {
          fullName: fields.fullName.trim(),
          phone:    fields.phone.trim() || undefined,
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
          {mode === "create" ? "إضافة وسيط عقاري جديد" : `تعديل: ${initial?.fullName}`}
        </h2>
        <button onClick={onCancel}
          style={{ background: "none", border: "none", fontSize: "1.3rem", cursor: "pointer", color: "var(--color-text-secondary)", lineHeight: 1 }}>
          ✕
        </button>
      </div>

      <InlineBanner message={error} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.25rem" }}>
        <FField label="الاسم الكامل *">
          <input className="form-input" value={fields.fullName} onChange={e => set("fullName", e.target.value)}
            placeholder="محمد العلي" disabled={saving} />
        </FField>

        {mode === "create" && (
          <FField label="البريد الإلكتروني *">
            <input className="form-input" type="email" value={fields.email} onChange={e => set("email", e.target.value)}
              placeholder="broker@example.sy" disabled={saving} />
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
      </div>

      {mode === "create" && (
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.82rem", color: "var(--color-text-secondary)" }}>
          💡 يمكنك رفع الصورة الشخصية للوسيط بعد الإنشاء من لوحة التفاصيل.
        </p>
      )}

      <div style={{ display: "flex", gap: "0.75rem" }}>
        <button className="btn btn-primary" style={{ padding: "0.5rem 1.4rem" }} onClick={handleSubmit} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : mode === "create" ? "إضافة الوسيط" : "حفظ التعديلات"}
        </button>
        <button className="btn" style={{ padding: "0.5rem 1rem" }} onClick={onCancel} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function FField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
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
