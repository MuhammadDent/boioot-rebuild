"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api, ApiError, NetworkError } from "@/lib/api";
import {
  normalizeProfile,
  ROLE_GROUP_COLORS,
  type NormalizedProfile,
} from "@/lib/profile-model";
import type { UserProfileResponse } from "@/types";

// ─── Payload types (API shape — unchanged) ────────────────────────────────────

interface UpdateProfilePayload {
  fullName: string;
  phone?: string;
  profileImageUrl?: string;
}

interface ChangePasswordPayload {
  fullName: string;
  currentPassword: string;
  newPassword: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Banner({ type, msg }: { type: "success" | "error"; msg: string }) {
  const bg     = type === "success" ? "#d1fae5" : "#fee2e2";
  const color  = type === "success" ? "#065f46" : "#991b1b";
  const border = type === "success" ? "#6ee7b7" : "#fca5a5";
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        borderRadius: 8,
        background: bg,
        color,
        border: `1px solid ${border}`,
        fontSize: "0.9rem",
        marginBottom: "1.25rem",
      }}
    >
      {msg}
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: "0.85rem",
        fontWeight: 600,
        color: "var(--color-text-secondary)",
        marginBottom: "0.35rem",
      }}
    >
      {children}
    </label>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      style={{
        width: "100%",
        padding: "0.6rem 0.85rem",
        border: "1px solid var(--color-border)",
        borderRadius: 8,
        fontSize: "0.95rem",
        fontFamily: "var(--font-arabic)",
        background: props.readOnly ? "#f8faf8" : "#fff",
        color: props.readOnly ? "var(--color-text-secondary)" : "var(--color-text)",
        outline: "none",
        boxSizing: "border-box",
        ...props.style,
      }}
    />
  );
}

function SaveBtn({
  loading,
  label = "حفظ التغييرات",
}: {
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      type="submit"
      disabled={loading}
      style={{
        padding: "0.6rem 1.75rem",
        background: loading ? "#a7c4a0" : "var(--color-primary)",
        color: "#fff",
        border: "none",
        borderRadius: 8,
        fontFamily: "var(--font-arabic)",
        fontWeight: 700,
        fontSize: "0.95rem",
        cursor: loading ? "not-allowed" : "pointer",
        transition: "background 0.15s",
      }}
    >
      {loading ? "جارٍ الحفظ…" : label}
    </button>
  );
}

// ─── ProfileRoleBadge ─────────────────────────────────────────────────────────

function ProfileRoleBadge({ profile }: { profile: NormalizedProfile }) {
  const colors = ROLE_GROUP_COLORS[profile.roleGroup];
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.2rem 0.75rem",
        borderRadius: 999,
        fontSize: "0.78rem",
        fontWeight: 700,
        background: colors.bg,
        color: colors.text,
        border: `1px solid ${colors.border}`,
        letterSpacing: "0.01em",
      }}
    >
      {profile.roleLabel}
    </span>
  );
}

// ─── ProfileHeaderCard ────────────────────────────────────────────────────────

function ProfileHeaderCard({ profile }: { profile: NormalizedProfile }) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        padding: "1.5rem",
        display: "flex",
        alignItems: "center",
        gap: "1.25rem",
        marginBottom: "1.5rem",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        flexWrap: "wrap",
      }}
    >
      {/* Avatar */}
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: "50%",
          overflow: "hidden",
          background: profile.avatarUrl ? "transparent" : "var(--color-primary)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
          border: "2px solid var(--color-border)",
        }}
      >
        {profile.avatarUrl ? (
          <img
            src={profile.avatarUrl}
            alt={profile.fullName}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        ) : (
          <span style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}>
            {initials(profile.fullName)}
          </span>
        )}
      </div>

      {/* Identity */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--color-text)" }}>
          {profile.fullName}
        </div>
        <div style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.2rem" }}>
          {profile.email}
        </div>
        <div style={{ marginTop: "0.5rem", display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
          <ProfileRoleBadge profile={profile} />
          <span style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)" }}>
            #{profile.userCode}
          </span>
        </div>
      </div>

      {/* Timestamps */}
      <div
        style={{
          fontSize: "0.8rem",
          color: "var(--color-text-secondary)",
          textAlign: "start",
          flexShrink: 0,
        }}
      >
        <div>
          عضو منذ:{" "}
          {new Date(profile.createdAt).toLocaleDateString("ar-SY", {
            year: "numeric",
            month: "long",
          })}
        </div>
      </div>
    </div>
  );
}

// ─── ProfileRoleSection — optional role-specific context block ────────────────

function ProfileRoleSection({ profile }: { profile: NormalizedProfile }) {
  const { roleGroup, roleLabel, companyName, officeName, agentTitle } = profile;

  if (roleGroup === "individual") return null;

  const colors = ROLE_GROUP_COLORS[roleGroup];

  return (
    <div
      style={{
        background: colors.bg,
        border: `1px solid ${colors.border}`,
        borderRadius: 10,
        padding: "0.85rem 1.1rem",
        marginBottom: "1.5rem",
        fontSize: "0.88rem",
        color: colors.text,
        display: "flex",
        flexDirection: "column",
        gap: "0.3rem",
      }}
    >
      <div style={{ fontWeight: 700, marginBottom: "0.2rem" }}>
        {roleGroup === "admin"    && "حساب إداري — صلاحيات كاملة على لوحة التحكم"}
        {roleGroup === "business" && `حساب تجاري — ${roleLabel}`}
        {roleGroup === "agent"    && `حساب وكيل — ${roleLabel}`}
      </div>
      {companyName && (
        <div>اسم الشركة: <strong>{companyName}</strong></div>
      )}
      {officeName && (
        <div>اسم المكتب: <strong>{officeName}</strong></div>
      )}
      {agentTitle && (
        <div>المسمى الوظيفي: <strong>{agentTitle}</strong></div>
      )}
      {roleGroup === "admin" && (
        <div style={{ fontSize: "0.8rem", opacity: 0.85 }}>
          الصلاحيات النشطة: {profile.permissions.length} صلاحية
        </div>
      )}
    </div>
  );
}

// ─── Tab 1: ProfileBasicInfoForm ──────────────────────────────────────────────

function ProfileBasicInfoForm({
  raw,
  onUpdate,
}: {
  raw: UserProfileResponse;
  onUpdate: (u: UserProfileResponse) => void;
}) {
  const profile = normalizeProfile(raw);
  const [fullName, setFullName] = useState(raw.fullName);
  const [phone, setPhone] = useState(raw.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setLoading(true);
    try {
      const updated = await api.put<UserProfileResponse>("/auth/profile", {
        fullName: fullName.trim(),
        phone: phone.trim() || undefined,
      } as UpdateProfilePayload);
      onUpdate(updated);
      setBanner({ type: "success", msg: "تم تحديث بياناتك بنجاح." });
    } catch (err: unknown) {
      setBanner({ type: "error", msg: (err as Error).message ?? "حدث خطأ." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      {banner && <Banner type={banner.type} msg={banner.msg} />}

      <div style={{ display: "grid", gap: "1.1rem" }}>
        <div>
          <FieldLabel>الاسم الكامل *</FieldLabel>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            minLength={2}
            maxLength={150}
            placeholder="أدخل اسمك الكامل"
          />
        </div>

        <div>
          <FieldLabel>البريد الإلكتروني (للقراءة فقط)</FieldLabel>
          <Input
            value={profile.email}
            readOnly
          />
        </div>

        <div>
          <FieldLabel>رقم الهاتف</FieldLabel>
          <Input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            maxLength={30}
            placeholder="مثال: 09xx xxx xxx"
            type="tel"
          />
        </div>

        <div>
          <FieldLabel>نوع الحساب</FieldLabel>
          <Input
            value={profile.roleLabel}
            readOnly
          />
        </div>

        <div>
          <FieldLabel>رمز المستخدم</FieldLabel>
          <Input
            value={profile.userCode}
            readOnly
          />
        </div>

        <div>
          <FieldLabel>تاريخ الإنشاء</FieldLabel>
          <Input
            value={new Date(profile.createdAt).toLocaleDateString("ar-SY", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
            readOnly
          />
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <SaveBtn loading={loading} />
      </div>
    </form>
  );
}

// ─── Password field ───────────────────────────────────────────────────────────

function PwdField({
  id,
  label,
  value,
  onChange,
  placeholder,
  error,
  show,
  onToggleShow,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  show: boolean;
  onToggleShow: () => void;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete="new-password"
          style={{
            width: "100%",
            padding: "0.65rem 0.85rem 0.65rem 2.6rem",
            border: `1.5px solid ${error ? "#f87171" : "#d1d5db"}`,
            borderRadius: 8,
            fontSize: "0.95rem",
            fontFamily: "var(--font-arabic)",
            background: "#fff",
            color: "#111",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
        />
        <button
          type="button"
          onClick={onToggleShow}
          tabIndex={-1}
          aria-label={show ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          style={{
            position: "absolute",
            left: "0.65rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.15rem",
            color: "#6b7280",
            display: "flex",
            alignItems: "center",
            lineHeight: 1,
          }}
        >
          {show ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
      {error && (
        <p style={{ margin: "0.3rem 0 0", fontSize: "0.8rem", color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ─── Tab 2: ProfileSecurityTab ────────────────────────────────────────────────

function ProfileSecurityTab({ raw }: { raw: UserProfileResponse }) {
  const [current, setCurrent]   = useState("");
  const [next, setNext]         = useState("");
  const [confirm, setConfirm]   = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword,     setShowNewPassword]     = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [errors, setErrors]   = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [banner, setBanner]   = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function validate(): boolean {
    const e: typeof errors = {};
    if (!current.trim()) e.current = "هذا الحقل مطلوب";
    if (!next.trim()) {
      e.next = "هذا الحقل مطلوب";
    } else if (next.length < 8) {
      e.next = "يجب أن تكون كلمة المرور 8 أحرف على الأقل";
    }
    if (!confirm.trim()) {
      e.confirm = "هذا الحقل مطلوب";
    } else if (next && confirm && next !== confirm) {
      e.confirm = "كلمة المرور الجديدة وتأكيدها غير متطابقين";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    if (!validate()) return;
    setLoading(true);
    try {
      await api.put<UserProfileResponse>("/auth/profile", {
        fullName: raw.fullName,
        currentPassword: current,
        newPassword: next,
      } as ChangePasswordPayload);
      setBanner({ type: "success", msg: "تم تغيير كلمة المرور بنجاح." });
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
      setShowCurrentPassword(false);
      setShowNewPassword(false);
      setShowConfirmPassword(false);
    } catch (err: unknown) {
      const msg = (err as Error).message;
      const arabic =
        msg?.includes("incorrect") || msg?.includes("wrong") || msg?.includes("invalid") ||
        msg?.includes("غير صحيحة")
          ? "كلمة المرور الحالية غير صحيحة"
          : msg || "حدث خطأ غير متوقع، حاول مرة أخرى";
      setBanner({ type: "error", msg: arabic });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      {banner && (
        <div
          role={banner.type === "error" ? "alert" : "status"}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            padding: "0.85rem 1rem",
            borderRadius: 10,
            marginBottom: "1.5rem",
            background: banner.type === "success" ? "#d1fae5" : "#fee2e2",
            border: `1px solid ${banner.type === "success" ? "#6ee7b7" : "#fca5a5"}`,
            color: banner.type === "success" ? "#065f46" : "#991b1b",
            fontSize: "0.9rem",
            fontWeight: 600,
          }}
        >
          <span style={{ fontSize: "1.1rem", lineHeight: 1 }}>
            {banner.type === "success" ? "✓" : "✕"}
          </span>
          {banner.msg}
        </div>
      )}

      <div
        style={{
          background: "#f0fdf4",
          border: "1px solid #bbf7d0",
          borderRadius: 10,
          padding: "0.75rem 1rem",
          fontSize: "0.83rem",
          color: "#166534",
          marginBottom: "1.5rem",
          lineHeight: 1.6,
        }}
      >
        اختر كلمة مرور قوية لا تقل عن 8 أحرف، وتحتوي على أرقام وحروف.
      </div>

      <div style={{ display: "grid", gap: "1.25rem", maxWidth: 480 }}>
        <PwdField
          id="pwd-current"
          label="كلمة المرور الحالية *"
          value={current}
          onChange={(v) => { setCurrent(v); setErrors((p) => ({ ...p, current: undefined })); }}
          show={showCurrentPassword}
          onToggleShow={() => setShowCurrentPassword((s) => !s)}
          error={errors.current}
        />
        <PwdField
          id="pwd-new"
          label="كلمة المرور الجديدة *"
          value={next}
          onChange={(v) => { setNext(v); setErrors((p) => ({ ...p, next: undefined })); }}
          placeholder="8 أحرف على الأقل"
          show={showNewPassword}
          onToggleShow={() => setShowNewPassword((s) => !s)}
          error={errors.next}
        />
        <PwdField
          id="pwd-confirm"
          label="تأكيد كلمة المرور الجديدة *"
          value={confirm}
          onChange={(v) => { setConfirm(v); setErrors((p) => ({ ...p, confirm: undefined })); }}
          placeholder="أعد إدخال كلمة المرور"
          show={showConfirmPassword}
          onToggleShow={() => setShowConfirmPassword((s) => !s)}
          error={errors.confirm}
        />
      </div>

      <div style={{ marginTop: "1.75rem", display: "flex", alignItems: "center", gap: "1rem" }}>
        <button
          type="submit"
          disabled={loading}
          style={{
            padding: "0.65rem 1.9rem",
            background: loading ? "#a7c4a0" : "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontFamily: "var(--font-arabic)",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: loading ? "not-allowed" : "pointer",
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            transition: "background 0.15s",
          }}
        >
          {loading ? "جارٍ الحفظ…" : "حفظ التغييرات"}
        </button>
      </div>
    </form>
  );
}

// ─── Tab 3: ProfileAvatarTab ──────────────────────────────────────────────────

function ProfileAvatarTab({
  raw,
  onUpdate,
}: {
  raw: UserProfileResponse;
  onUpdate: (u: UserProfileResponse) => void;
}) {
  const profile  = normalizeProfile(raw);
  const fileRef  = useRef<HTMLInputElement>(null);
  const [preview, setPreview]   = useState<string | null>(profile.avatarUrl);
  const [loading, setLoading]   = useState(false);
  const [banner,  setBanner]    = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function pickFile() { fileRef.current?.click(); }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setBanner({ type: "error", msg: "حجم الصورة يجب أن لا يتجاوز 2MB." });
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setPreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  async function handleSave() {
    setBanner(null);
    setLoading(true);
    try {
      const updated = await api.put<UserProfileResponse>("/auth/profile", {
        fullName: raw.fullName,
        phone: raw.phone,
        profileImageUrl: preview ?? "",
      });
      onUpdate(updated);
      setBanner({ type: "success", msg: "تم تحديث الصورة الشخصية بنجاح." });
    } catch (err: unknown) {
      setBanner({ type: "error", msg: (err as Error).message ?? "حدث خطأ." });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      {banner && <Banner type={banner.type} msg={banner.msg} />}

      <p style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
        الصورة الشخصية تظهر في لوحة التحكم والإعلانات. الحجم الأقصى 2MB.
      </p>

      <div style={{ display: "flex", alignItems: "center", gap: "1.5rem", flexWrap: "wrap" }}>
        <div
          style={{
            width: 110,
            height: 110,
            borderRadius: "50%",
            overflow: "hidden",
            background: preview ? "transparent" : "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "3px solid var(--color-border)",
            boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
          }}
        >
          {preview ? (
            <img
              src={preview}
              alt="الصورة الشخصية"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#fff", fontSize: "2rem", fontWeight: 700 }}>
              {initials(profile.fullName)}
            </span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={onFileChange}
            style={{ display: "none" }}
          />
          <button
            type="button"
            onClick={pickFile}
            style={{
              padding: "0.5rem 1.2rem",
              border: "1.5px solid var(--color-primary)",
              background: "#fff",
              color: "var(--color-primary)",
              borderRadius: 8,
              fontFamily: "var(--font-arabic)",
              fontWeight: 600,
              fontSize: "0.9rem",
              cursor: "pointer",
            }}
          >
            اختر صورة
          </button>
          {preview && (
            <button
              type="button"
              onClick={removeImage}
              style={{
                padding: "0.5rem 1.2rem",
                border: "1.5px solid #dc2626",
                background: "#fff",
                color: "#dc2626",
                borderRadius: 8,
                fontFamily: "var(--font-arabic)",
                fontWeight: 600,
                fontSize: "0.9rem",
                cursor: "pointer",
              }}
            >
              حذف الصورة
            </button>
          )}
        </div>
      </div>

      <div style={{ marginTop: "1.5rem" }}>
        <button
          type="button"
          onClick={handleSave}
          disabled={loading}
          style={{
            padding: "0.6rem 1.75rem",
            background: loading ? "#a7c4a0" : "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontFamily: "var(--font-arabic)",
            fontWeight: 700,
            fontSize: "0.95rem",
            cursor: loading ? "not-allowed" : "pointer",
          }}
        >
          {loading ? "جارٍ الحفظ…" : "حفظ الصورة"}
        </button>
      </div>
    </div>
  );
}

// ─── Tab 4: ProfileSettingsTab ────────────────────────────────────────────────

function ProfileSettingsTab({ profile }: { profile: NormalizedProfile }) {
  return (
    <div style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: 1.7 }}>
      <p style={{ marginBottom: "0.75rem" }}>ستُضاف إعدادات إضافية هنا قريباً، مثل:</p>
      <ul style={{ paddingRight: "1.25rem", listStyle: "disc" }}>
        <li>إعدادات الإشعارات</li>
        <li>اللغة والمنطقة الزمنية</li>
        <li>الاشتراكات والفواتير</li>
        <li>الخصوصية وإدارة البيانات</li>
        {profile.roleGroup === "admin" && <li>إدارة الصلاحيات والأدوار</li>}
        {profile.roleGroup === "business" && <li>إعدادات الشركة والمكتب</li>}
        {profile.roleGroup === "agent" && <li>إعدادات الوكالة العقارية</li>}
      </ul>
    </div>
  );
}

// ─── ProfileTabs ──────────────────────────────────────────────────────────────

const TABS = [
  { id: "info",     label: "الملف الشخصي"  },
  { id: "security", label: "الأمان"         },
  { id: "media",    label: "الصورة الشخصية" },
  { id: "settings", label: "الإعدادات"      },
];

function ProfileTabs({
  raw,
  profile,
  activeTab,
  setActiveTab,
  onUpdate,
}: {
  raw:          UserProfileResponse;
  profile:      NormalizedProfile;
  activeTab:    string;
  setActiveTab: (id: string) => void;
  onUpdate:     (u: UserProfileResponse) => void;
}) {
  return (
    <div
      style={{
        background: "#fff",
        borderRadius: 14,
        border: "1px solid var(--color-border)",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        overflow: "hidden",
      }}
    >
      {/* Tab bar */}
      <div
        style={{
          display: "flex",
          borderBottom: "1px solid var(--color-border)",
          overflowX: "auto",
        }}
      >
        {TABS.map((tab) => {
          const active = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.85rem 1.35rem",
                fontFamily: "var(--font-arabic)",
                fontWeight: active ? 700 : 500,
                fontSize: "0.9rem",
                color: active ? "var(--color-primary)" : "var(--color-text-secondary)",
                background: "none",
                border: "none",
                borderBottom: active ? "2px solid var(--color-primary)" : "2px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s, border-color 0.15s",
                marginBottom: -1,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab content */}
      <div style={{ padding: "1.75rem" }}>
        {activeTab === "info"     && <ProfileBasicInfoForm raw={raw} onUpdate={onUpdate} />}
        {activeTab === "security" && <ProfileSecurityTab raw={raw} />}
        {activeTab === "media"    && <ProfileAvatarTab raw={raw} onUpdate={onUpdate} />}
        {activeTab === "settings" && <ProfileSettingsTab profile={profile} />}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const router = useRouter();
  const { user: ctxUser, setUser, token, isLoading: authLoading } = useAuth();

  const [raw,       setRaw]       = useState<UserProfileResponse | null>(ctxUser);
  const [activeTab, setActiveTab] = useState("info");
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!token) {
      router.replace("/login");
      return;
    }
    api
      .get<UserProfileResponse>("/auth/me")
      .then((u) => {
        setRaw(u);
        setUser(u);
      })
      .catch((err: unknown) => {
        if (process.env.NODE_ENV !== "production") {
          console.error("[ProfilePage] /auth/me failed:", err);
        }
        if (err instanceof NetworkError) {
          setFetchError("تعذّر الاتصال بالخادم. تحقق من اتصالك بالإنترنت.");
        } else if (err instanceof ApiError) {
          if (err.status === 401) {
            setFetchError("انتهت جلستك. يرجى تسجيل الدخول مرة أخرى.");
          } else if (err.status === 403) {
            setFetchError("ليس لديك صلاحية للوصول إلى هذه الصفحة.");
          } else if (err.status >= 500) {
            setFetchError("حدث خطأ في الخادم. يرجى المحاولة لاحقاً.");
          } else {
            setFetchError(err.message || "حدث خطأ أثناء تحميل بياناتك.");
          }
        } else {
          setFetchError("حدث خطأ غير متوقع أثناء تحميل بياناتك.");
        }
      });
  }, [token, authLoading, router, setUser]);

  function handleUpdate(updated: UserProfileResponse) {
    setRaw(updated);
    setUser(updated);
  }

  if (fetchError) {
    return (
      <div style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
        <Banner type="error" msg={fetchError} />
      </div>
    );
  }

  if (!raw) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-secondary)" }}>
        جارٍ التحميل…
      </div>
    );
  }

  const profile = normalizeProfile(raw);

  return (
    <div
      style={{
        maxWidth: 820,
        margin: "2rem auto",
        padding: "0 1rem 3rem",
        fontFamily: "var(--font-arabic)",
      }}
    >
      {/* Breadcrumb */}
      <nav style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
        <span>لوحة التحكم</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>الملف الشخصي</span>
      </nav>

      {/* Header card — unified for all roles */}
      <ProfileHeaderCard profile={profile} />

      {/* Optional role-specific context block */}
      <ProfileRoleSection profile={profile} />

      {/* Tabs — same structure for every role */}
      <ProfileTabs
        raw={raw}
        profile={profile}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onUpdate={handleUpdate}
      />
    </div>
  );
}
