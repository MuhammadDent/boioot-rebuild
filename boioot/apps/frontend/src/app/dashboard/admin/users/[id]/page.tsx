"use client";

import { useState, useEffect, useRef } from "react";
import { useParams } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { LoadingRow } from "@/components/dashboard/LoadingRow";
import { adminApi } from "@/features/admin/api";
import { ROLE_LABELS, ROLE_BADGE } from "@/features/admin/constants";
import { normalizeError } from "@/lib/api";
import type { AdminUserResponse } from "@/types";

export default function UserProfilePage() {
  const { user, isLoading } = useProtectedRoute({ requiredPermission: "users.view" });
  const params = useParams();
  const userId = params.id as string;

  const [profile, setProfile]   = useState<AdminUserResponse | null>(null);
  const [fetching, setFetching] = useState(true);
  const [error, setError]       = useState("");

  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError]     = useState("");
  const [actionNotice, setActionNotice]   = useState("");

  const [uploading, setUploading]     = useState(false);
  const [uploadError, setUploadError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    if (!isLoading && user && userId) load();
  }, [isLoading, user, userId]);

  async function load() {
    setFetching(true);
    setError("");
    try {
      const data = await adminApi.getAdminUser(userId);
      setProfile(data);
    } catch (e) {
      setError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }

  async function handleToggleStatus() {
    if (!profile || actionLoading) return;
    setActionLoading(true);
    setActionError("");
    try {
      const updated = await adminApi.updateUserStatus(profile.id, !profile.isActive);
      setProfile(updated);
      setActionNotice(updated.isActive ? "تم تفعيل المستخدم بنجاح" : "تم تعطيل المستخدم بنجاح");
      setTimeout(() => setActionNotice(""), 3000);
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActionLoading(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !profile) return;
    setUploading(true);
    setUploadError("");
    try {
      const { url } = await adminApi.uploadImage(file);
      const updated = await adminApi.updateUserProfileImage(profile.id, url);
      setProfile(prev => prev ? { ...prev, profileImageUrl: updated.profileImageUrl } : prev);
    } catch (err) {
      setUploadError(normalizeError(err));
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  function openEdit() {
    if (!profile) return;
    setEditName(profile.fullName);
    setEditPhone(profile.phone ?? "");
    setEditError("");
    setEditOpen(true);
  }

  if (isLoading || !user) return null;

  const isSelf = profile?.id === user.id;

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "var(--color-bg)", padding: "2rem 1rem" }}>
      <div style={{ maxWidth: 760, margin: "0 auto" }}>

        <DashboardBackLink href="/dashboard/admin/users" label="← قائمة المستخدمين" />

        {fetching && <LoadingRow />}
        {error && <InlineBanner message={error} />}

        {!fetching && profile && (
          <>
            {/* ── Profile card ── */}
            <div className="form-card" style={{ padding: "1.75rem", marginBottom: "1.25rem" }}>

              {/* Header: avatar + name + badges */}
              <div style={{ display: "flex", gap: "1.25rem", alignItems: "flex-start", marginBottom: "1.5rem", flexWrap: "wrap" }}>

                {/* Avatar with upload */}
                <div style={{ position: "relative", flexShrink: 0 }}>
                  <div style={{
                    width: 80, height: 80, borderRadius: "50%",
                    background: "var(--color-border)", overflow: "hidden",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "2.2rem",
                  }}>
                    {profile.profileImageUrl
                      ? <img src={profile.profileImageUrl} alt={profile.fullName} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                      : "👤"
                    }
                  </div>
                  <button
                    title="تغيير الصورة الشخصية"
                    disabled={uploading}
                    onClick={() => fileRef.current?.click()}
                    style={{
                      position: "absolute", bottom: -2, left: -2,
                      width: 26, height: 26, borderRadius: "50%",
                      background: "var(--color-primary)", border: "2px solid white",
                      color: "white", cursor: "pointer",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "0.75rem", lineHeight: 1,
                    }}
                  >
                    {uploading ? "..." : "📷"}
                  </button>
                  <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleFileChange} />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <h1 style={{ margin: "0 0 0.4rem", fontSize: "1.3rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
                    {profile.fullName}
                    {isSelf && <span className="badge badge-gray" style={{ marginRight: "0.5rem", fontSize: "0.72rem" }}>أنت</span>}
                  </h1>
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "0.5rem" }}>
                    <span className={ROLE_BADGE[profile.role] ?? "badge badge-gray"}>
                      {ROLE_LABELS[profile.role] ?? profile.role}
                    </span>
                    <span className={profile.isActive ? "badge badge-green" : "badge badge-red"}>
                      {profile.isActive ? "نشط" : "غير نشط"}
                    </span>
                    {profile.isDeleted && <span className="badge badge-red">محذوف</span>}
                  </div>
                  {uploadError && (
                    <p style={{ margin: 0, fontSize: "0.78rem", color: "var(--color-error, #dc2626)" }}>{uploadError}</p>
                  )}
                </div>
              </div>

              {/* Fields grid */}
              <div style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: "1rem",
                marginBottom: "1.5rem",
                padding: "1.25rem",
                background: "#f8fafc",
                borderRadius: 10,
                border: "1px solid var(--color-border)",
              }}>
                <InfoField label="البريد الإلكتروني" value={profile.email} />
                <InfoField label="الهاتف" value={profile.phone} />
                <InfoField label="تاريخ الانضمام" value={new Date(profile.createdAt).toLocaleDateString("ar-SY")} />
                <InfoField label="آخر تحديث" value={new Date(profile.updatedAt).toLocaleDateString("ar-SY")} />
              </div>

              {/* Notices */}
              {actionNotice && (
                <div style={{
                  marginBottom: "1rem", padding: "0.65rem 1rem",
                  backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0",
                  borderRadius: 8, fontSize: "0.83rem", color: "#15803d", fontWeight: 600,
                }}>
                  ✓ {actionNotice}
                </div>
              )}
              <InlineBanner message={actionError} />

              {/* Actions */}
              <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                <button
                  className="btn btn-primary"
                  style={{ padding: "0.5rem 1.25rem" }}
                  onClick={openEdit}
                >
                  تعديل البيانات
                </button>
                {!isSelf && (
                  <button
                    className={profile.isActive ? "btn" : "btn btn-primary"}
                    style={{
                      padding: "0.5rem 1.25rem",
                      ...(!profile.isActive ? {} : {
                        border: "1.5px solid var(--color-error)",
                        backgroundColor: "transparent",
                        color: "var(--color-error)",
                      }),
                    }}
                    disabled={actionLoading || profile.isDeleted}
                    onClick={handleToggleStatus}
                  >
                    {actionLoading ? "..." : profile.isActive ? "تعطيل الحساب" : "تفعيل الحساب"}
                  </button>
                )}
              </div>
            </div>

            {/* ── Edit form ── */}
            {editOpen && (
              <EditUserForm
                profile={profile}
                onCancel={() => setEditOpen(false)}
                onSaved={(updated) => {
                  setProfile(updated);
                  setEditOpen(false);
                }}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ─── Info field ───────────────────────────────────────────────────────────────

function InfoField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p style={{ margin: "0 0 0.2rem", fontSize: "0.77rem", fontWeight: 600, color: "var(--color-text-secondary)", textTransform: "uppercase" }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: "0.9rem", color: "var(--color-text-primary)" }}>{value}</p>
    </div>
  );
}

// ─── Edit form ────────────────────────────────────────────────────────────────

function EditUserForm({
  profile,
  onCancel,
  onSaved,
}: {
  profile: AdminUserResponse;
  onCancel: () => void;
  onSaved: (updated: AdminUserResponse) => void;
}) {
  const [name, setName]   = useState(profile.fullName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const updated = await adminApi.updateAdminUser(profile.id, {
        fullName: name.trim(),
        phone: phone.trim() || undefined,
      });
      onSaved(updated);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="form-card" style={{ padding: "1.5rem" }}>
      <h2 style={{ margin: "0 0 1.25rem", fontSize: "1rem", fontWeight: 700, color: "var(--color-text-primary)" }}>
        تعديل بيانات المستخدم
      </h2>
      {error && (
        <div style={{
          marginBottom: "1rem", padding: "0.65rem 1rem",
          backgroundColor: "#fef2f2", border: "1px solid #fecaca",
          borderRadius: 8, fontSize: "0.83rem", color: "#b91c1c",
        }}>
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "0.9rem", marginBottom: "1.25rem" }}>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.35rem" }}>الاسم الكامل *</label>
            <input
              className="form-input"
              value={name}
              onChange={e => setName(e.target.value)}
              required
              disabled={loading}
              style={{ padding: "0.5rem 0.75rem" }}
            />
          </div>
          <div>
            <label className="form-label" style={{ display: "block", marginBottom: "0.35rem" }}>رقم الهاتف</label>
            <input
              className="form-input"
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              disabled={loading}
              style={{ padding: "0.5rem 0.75rem", direction: "ltr", textAlign: "right" }}
            />
          </div>
        </div>
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1.25rem" }} disabled={loading}>
            {loading ? "جارٍ الحفظ..." : "حفظ التغييرات"}
          </button>
          <button type="button" className="btn" style={{ padding: "0.5rem 1rem" }} onClick={onCancel} disabled={loading}>
            إلغاء
          </button>
        </div>
      </form>
    </div>
  );
}
