"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import { normalizeError } from "@/lib/api";
import type { AdminBrokerResponse } from "@/types";

export default function BrokerProfilePage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "users.view" });
  const params   = useParams();
  const router   = useRouter();
  const brokerId = params.id as string;

  const [broker, setBroker]     = useState<AdminBrokerResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState("");

  const [editOpen, setEditOpen]   = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isLoading && user && brokerId) {
      load();
    }
  }, [isLoading, user, brokerId]);

  async function load() {
    setFetching(true);
    setError("");
    try {
      const data = await adminApi.getAdminBroker(brokerId);
      setBroker(data);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }

  async function handleToggleStatus() {
    if (!broker || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(broker.id, !broker.isActive);
      setBroker(b => b ? { ...b, isActive: updated.isActive } : b);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !broker) return;
    setUploading(true);
    setUploadError("");
    try {
      const { url } = await adminApi.uploadImage(file);
      await adminApi.updateUserProfileImage(broker.id, url);
      setBroker(b => b ? { ...b, profileImageUrl: url } : b);
    } catch (err) {
      setUploadError(normalizeError(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  if (isLoading || !user) return null;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <DashboardBackLink href="/dashboard/admin/users?role=Broker" label="← الوسطاء" />

        {fetching && <LoadingRow />}
        {error && <InlineBanner message={error} />}

        {!fetching && broker && (
          <>
            {/* ── Profile header card ── */}
            <div className="form-card" style={{ padding: "2rem", marginBottom: "1.25rem" }}>
              <div style={{ display: "flex", gap: "1.5rem", alignItems: "flex-start", flexWrap: "wrap" }}>

                {/* Avatar */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 96, height: 96, borderRadius: "50%",
                    background: "var(--color-border)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2.5rem",
                  }}>
                    {broker.profileImageUrl
                      ? <img src={broker.profileImageUrl} alt={broker.fullName}
                          style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "👤"
                    }
                  </div>
                  <button
                    title="تغيير الصورة الشخصية"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      position: "absolute", bottom: -2, left: -2,
                      width: 28, height: 28, borderRadius: "50%",
                      background: "var(--color-primary)", border: "2px solid white",
                      color: "white", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.8rem", lineHeight: 1,
                    }}
                  >
                    {uploading ? "…" : "📷"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.6rem", flexWrap: "wrap", marginBottom: "0.4rem" }}>
                    <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {broker.fullName}
                    </h1>
                    <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {broker.userCode}
                    </span>
                    <span className={broker.isActive ? "badge badge-green" : "badge badge-red"}>
                      {broker.isActive ? "نشط" : "غير نشط"}
                    </span>
                    {broker.isDeleted && <span className="badge badge-red">محذوف</span>}
                  </div>

                  <div style={{ display: "flex", flexDirection: "column", gap: "0.25rem", marginBottom: "0.75rem" }}>
                    <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>✉️ {broker.email}</span>
                    {broker.phone && <span style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)" }}>📞 {broker.phone}</span>}
                    <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
                      📅 انضم في {new Date(broker.createdAt).toLocaleDateString("ar-SY")}
                    </span>
                  </div>

                  {uploadError && (
                    <p style={{ margin: "0 0 0.5rem", fontSize: "0.8rem", color: "var(--color-error, #dc2626)" }}>{uploadError}</p>
                  )}

                  <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                    <button className="btn btn-primary" style={{ padding: "0.4rem 1rem", fontSize: "0.85rem" }}
                      onClick={() => setEditOpen(v => !v)}>
                      {editOpen ? "✕ إلغاء التعديل" : "✏️ تعديل البيانات"}
                    </button>
                    <button
                      className={broker.isActive ? "btn" : "btn btn-primary"}
                      style={{
                        padding: "0.4rem 1rem", fontSize: "0.85rem",
                        ...(!broker.isActive ? {} : { border: "1.5px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-primary)" }),
                      }}
                      disabled={actionLoading || broker.isDeleted}
                      onClick={handleToggleStatus}
                    >
                      {actionLoading ? "..." : broker.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <InlineBanner message={actionError} />

            {/* ── Edit form ── */}
            {editOpen && (
              <EditBrokerForm
                broker={broker}
                onSuccess={updated => { setBroker(updated); setEditOpen(false); }}
                onCancel={() => setEditOpen(false)}
              />
            )}

            {/* ── Stats row ── */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: "0.75rem", marginBottom: "1.25rem" }}>
              <StatCard label="الوكلاء التابعون" value={broker.agentCount} icon="👥" />
              <StatCard label="إجمالي العقارات" value={broker.propertyCount} icon="🏠" />
              <StatCard label="الصفقات المنجزة" value={broker.dealsCount} icon="✅" />
              {broker.averageRating !== undefined && broker.averageRating !== null && (
                <StatCard label="متوسط التقييم" value={`${broker.averageRating.toFixed(1)} / 5`} icon="⭐" sub={`(${broker.reviewCount} تقييم)`} />
              )}
            </div>

            {/* ── Details card ── */}
            <div className="form-card" style={{ padding: "1.5rem" }}>
              <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                معلومات الحساب
              </h2>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
                <DetailField label="الكود" value={broker.userCode} />
                <DetailField label="البريد الإلكتروني" value={broker.email} />
                <DetailField label="الهاتف" value={broker.phone} />
                <DetailField label="تاريخ الانضمام" value={new Date(broker.createdAt).toLocaleDateString("ar-SY")} />
                <DetailField label="آخر تحديث" value={new Date(broker.updatedAt).toLocaleDateString("ar-SY")} />
                <DetailField label="حالة الحساب" value={broker.isActive ? "نشط" : "غير نشط"} />
              </div>
            </div>

          </>
        )}
      </div>
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditBrokerForm({
  broker,
  onSuccess,
  onCancel,
}: {
  broker: AdminBrokerResponse;
  onSuccess: (b: AdminBrokerResponse) => void;
  onCancel: () => void;
}) {
  const [fullName, setFullName] = useState(broker.fullName);
  const [phone, setPhone]       = useState(broker.phone ?? "");
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState("");

  async function handleSubmit() {
    if (!fullName.trim()) { setError("الاسم مطلوب"); return; }
    setSaving(true); setError("");
    try {
      const updated = await adminApi.updateAdminBroker(broker.id, {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      });
      onSuccess(updated);
    } catch (e) { setError(normalizeError(e)); }
    finally { setSaving(false); }
  }

  return (
    <div className="form-card" style={{ padding: "1.5rem", marginBottom: "1.25rem", border: "2px solid var(--color-primary)" }}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
        تعديل بيانات الوسيط
      </h2>
      <InlineBanner message={error} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: "1rem", marginBottom: "1rem" }}>
        <div>
          <label className="form-label" style={{ display: "block", marginBottom: "0.35rem" }}>الاسم الكامل *</label>
          <input className="form-input" value={fullName} onChange={e => setFullName(e.target.value)} disabled={saving} />
        </div>
        <div>
          <label className="form-label" style={{ display: "block", marginBottom: "0.35rem" }}>الهاتف</label>
          <input className="form-input" value={phone} onChange={e => setPhone(e.target.value)}
            placeholder="+963..." disabled={saving} />
        </div>
      </div>
      <div style={{ display: "flex", gap: "0.6rem" }}>
        <button className="btn btn-primary" style={{ padding: "0.45rem 1.2rem" }} onClick={handleSubmit} disabled={saving}>
          {saving ? "جارٍ الحفظ..." : "حفظ"}
        </button>
        <button className="btn" style={{ padding: "0.45rem 1rem" }} onClick={onCancel} disabled={saving}>إلغاء</button>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function StatCard({ label, value, icon, sub }: { label: string; value: string | number; icon: string; sub?: string }) {
  return (
    <div className="form-card" style={{ padding: "1.25rem 1rem", textAlign: "center" }}>
      <div style={{ fontSize: "1.6rem", marginBottom: "0.35rem" }}>{icon}</div>
      <div style={{ fontSize: "1.4rem", fontWeight: 700, color: "var(--color-primary)", lineHeight: 1.2 }}>{value}</div>
      {sub && <div style={{ fontSize: "0.75rem", color: "var(--color-text-secondary)", marginTop: "0.15rem" }}>{sub}</div>}
      <div style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "0.3rem" }}>{label}</div>
    </div>
  );
}

function DetailField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ margin: "0 0 0.2rem", fontSize: "0.76rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>{label}</p>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{value}</p>
    </div>
  );
}
