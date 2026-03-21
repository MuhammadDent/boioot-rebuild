"use client";

import { useState, useEffect, useRef } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import type { UserProfileResponse } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

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

function roleName(role: string): string {
  const map: Record<string, string> = {
    Admin: "مدير النظام",
    Owner: "مالك عقار",
    User: "مستخدم",
    Agent: "وكيل",
    Company: "شركة",
  };
  return map[role] ?? role;
}

// ─── Shared UI atoms ──────────────────────────────────────────────────────────

function Banner({ type, msg }: { type: "success" | "error"; msg: string }) {
  const bg = type === "success" ? "#d1fae5" : "#fee2e2";
  const color = type === "success" ? "#065f46" : "#991b1b";
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

// ─── Tab 1: Profile Info ───────────────────────────────────────────────────────

function ProfileInfoTab({
  user,
  onUpdate,
}: {
  user: UserProfileResponse;
  onUpdate: (u: UserProfileResponse) => void;
}) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone ?? "");
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBanner(null);
    setLoading(true);
    try {
      const updated = await api.put<UserProfileResponse>("/api/auth/profile", {
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
          <Input value={user.email} readOnly />
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
          <FieldLabel>الدور في المنصة</FieldLabel>
          <Input value={roleName(user.role)} readOnly />
        </div>

        <div>
          <FieldLabel>رمز المستخدم</FieldLabel>
          <Input value={user.userCode} readOnly />
        </div>

        <div>
          <FieldLabel>تاريخ الإنشاء</FieldLabel>
          <Input
            value={new Date(user.createdAt).toLocaleDateString("ar-SY", {
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

// ─── Password field with show/hide toggle ─────────────────────────────────────

function PasswordField({
  label,
  value,
  onChange,
  placeholder,
  error,
  id,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  error?: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <div style={{ position: "relative" }}>
        <input
          id={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder ?? "••••••••"}
          autoComplete="off"
          style={{
            width: "100%",
            padding: "0.6rem 2.8rem 0.6rem 0.85rem",
            border: `1px solid ${error ? "#f87171" : "var(--color-border)"}`,
            borderRadius: 8,
            fontSize: "0.95rem",
            fontFamily: "var(--font-arabic)",
            background: "#fff",
            color: "var(--color-text)",
            outline: "none",
            boxSizing: "border-box",
            transition: "border-color 0.15s",
          }}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}
          style={{
            position: "absolute",
            left: "0.6rem",
            top: "50%",
            transform: "translateY(-50%)",
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "0.2rem",
            color: "var(--color-text-secondary)",
            display: "flex",
            alignItems: "center",
          }}
        >
          {visible ? <EyeOff size={17} /> : <Eye size={17} />}
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

// ─── Tab 2: Security ──────────────────────────────────────────────────────────

function SecurityTab({ user }: { user: UserProfileResponse }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);

  // Per-field validation errors
  const [errors, setErrors] = useState<{
    current?: string;
    next?: string;
    confirm?: string;
  }>({});

  // Top-level feedback banner
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

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
      await api.put<UserProfileResponse>("/api/auth/profile", {
        fullName: user.fullName,
        currentPassword: current,
        newPassword: next,
      } as ChangePasswordPayload);

      setBanner({ type: "success", msg: "تم تغيير كلمة المرور بنجاح." });
      setCurrent("");
      setNext("");
      setConfirm("");
      setErrors({});
    } catch (err: unknown) {
      const msg = (err as Error).message;
      // Surface common API error messages in plain Arabic
      const arabic =
        msg?.includes("incorrect") || msg?.includes("wrong") || msg?.includes("invalid")
          ? "كلمة المرور الحالية غير صحيحة"
          : msg || "حدث خطأ غير متوقع، حاول مرة أخرى";
      setBanner({ type: "error", msg: arabic });
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>

      {/* ── Top feedback banner ── */}
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

      {/* ── Tip card ── */}
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

      {/* ── Fields ── */}
      <div style={{ display: "grid", gap: "1.25rem", maxWidth: 480 }}>
        <PasswordField
          id="pwd-current"
          label="كلمة المرور الحالية *"
          value={current}
          onChange={(v) => { setCurrent(v); setErrors((p) => ({ ...p, current: undefined })); }}
          error={errors.current}
        />

        <PasswordField
          id="pwd-new"
          label="كلمة المرور الجديدة *"
          value={next}
          onChange={(v) => { setNext(v); setErrors((p) => ({ ...p, next: undefined })); }}
          placeholder="8 أحرف على الأقل"
          error={errors.next}
        />

        <PasswordField
          id="pwd-confirm"
          label="تأكيد كلمة المرور الجديدة *"
          value={confirm}
          onChange={(v) => { setConfirm(v); setErrors((p) => ({ ...p, confirm: undefined })); }}
          placeholder="أعد إدخال كلمة المرور"
          error={errors.confirm}
        />
      </div>

      {/* ── Submit ── */}
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
          {loading && (
            <span
              style={{
                width: 15,
                height: 15,
                border: "2px solid rgba(255,255,255,0.4)",
                borderTopColor: "#fff",
                borderRadius: "50%",
                display: "inline-block",
                animation: "spin 0.7s linear infinite",
              }}
            />
          )}
          {loading ? "جارٍ الحفظ…" : "حفظ التغييرات"}
        </button>

        {/* Inline spinner keyframes injected once */}
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </form>
  );
}

// ─── Tab 3: Media (Avatar) ────────────────────────────────────────────────────

function MediaTab({
  user,
  onUpdate,
}: {
  user: UserProfileResponse;
  onUpdate: (u: UserProfileResponse) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(user.profileImageUrl ?? null);
  const [loading, setLoading] = useState(false);
  const [banner, setBanner] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  function pickFile() {
    fileRef.current?.click();
  }

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
      const updated = await api.put<UserProfileResponse>("/api/auth/profile", {
        fullName: user.fullName,
        phone: user.phone,
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
              {initials(user.fullName)}
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

// ─── Tab 4: Settings ──────────────────────────────────────────────────────────

function SettingsTab() {
  return (
    <div style={{ color: "var(--color-text-secondary)", fontSize: "0.95rem", lineHeight: 1.7 }}>
      <p style={{ marginBottom: "0.75rem" }}>
        ستُضاف إعدادات إضافية هنا قريباً، مثل:
      </p>
      <ul style={{ paddingRight: "1.25rem", listStyle: "disc" }}>
        <li>إعدادات الإشعارات</li>
        <li>اللغة والمنطقة الزمنية</li>
        <li>الاشتراكات والفواتير</li>
        <li>الخصوصية وإدارة البيانات</li>
      </ul>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const TABS = [
  { id: "info",     label: "الملف الشخصي" },
  { id: "security", label: "الأمان"        },
  { id: "media",    label: "الصورة الشخصية" },
  { id: "settings", label: "الإعدادات"     },
];

export default function ProfilePage() {
  const { user: ctxUser, setUser, token } = useAuth();
  const [user, setLocal] = useState<UserProfileResponse | null>(ctxUser);
  const [activeTab, setActiveTab] = useState("info");
  const [fetchError, setFetchError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) return;
    api
      .get<UserProfileResponse>("/api/auth/me")
      .then((u) => {
        setLocal(u);
        setUser(u);
      })
      .catch((err: Error) => setFetchError(err.message));
  }, [token, setUser]);

  function handleUpdate(updated: UserProfileResponse) {
    setLocal(updated);
    setUser(updated);
  }

  if (fetchError) {
    return (
      <div style={{ maxWidth: 640, margin: "3rem auto", padding: "0 1rem" }}>
        <Banner type="error" msg={`تعذّر تحميل بياناتك: ${fetchError}`} />
      </div>
    );
  }

  if (!user) {
    return (
      <div style={{ textAlign: "center", padding: "4rem", color: "var(--color-text-secondary)" }}>
        جارٍ التحميل…
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: 820,
        margin: "2rem auto",
        padding: "0 1rem 3rem",
        fontFamily: "var(--font-arabic)",
      }}
    >
      {/* ── Breadcrumb ── */}
      <nav style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)", marginBottom: "1.25rem" }}>
        <span>لوحة التحكم</span>
        <span style={{ margin: "0 0.4rem" }}>›</span>
        <span style={{ color: "var(--color-primary)", fontWeight: 600 }}>الملف الشخصي</span>
      </nav>

      {/* ── Header card ── */}
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
        }}
      >
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            overflow: "hidden",
            background: user.profileImageUrl ? "transparent" : "var(--color-primary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            border: "2px solid var(--color-border)",
          }}
        >
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt={user.fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{ color: "#fff", fontSize: "1.5rem", fontWeight: 700 }}>
              {initials(user.fullName)}
            </span>
          )}
        </div>

        <div>
          <div style={{ fontWeight: 700, fontSize: "1.15rem", color: "var(--color-text)" }}>
            {user.fullName}
          </div>
          <div style={{ fontSize: "0.88rem", color: "var(--color-text-secondary)", marginTop: "0.25rem" }}>
            {user.email}
          </div>
          <div
            style={{
              display: "inline-block",
              marginTop: "0.4rem",
              padding: "0.15rem 0.65rem",
              borderRadius: 999,
              background: "var(--color-primary-light, #e8f5e9)",
              color: "var(--color-primary)",
              fontSize: "0.8rem",
              fontWeight: 600,
            }}
          >
            {roleName(user.role)}
          </div>
        </div>

        <div style={{ marginRight: "auto", textAlign: "left", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          <div>آخر تحديث</div>
          <div style={{ fontWeight: 600 }}>
            {new Date(user.createdAt).toLocaleDateString("ar-SY", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })}
          </div>
        </div>
      </div>

      {/* ── Tabs ── */}
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
            scrollbarWidth: "none",
          }}
        >
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                padding: "0.85rem 1.4rem",
                border: "none",
                background: "transparent",
                fontFamily: "var(--font-arabic)",
                fontSize: "0.9rem",
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? "var(--color-primary)" : "var(--color-text-secondary)",
                borderBottom: activeTab === tab.id ? "2.5px solid var(--color-primary)" : "2.5px solid transparent",
                cursor: "pointer",
                whiteSpace: "nowrap",
                transition: "color 0.15s",
                marginBottom: "-1px",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div style={{ padding: "1.75rem 1.5rem" }}>
          {activeTab === "info" && (
            <ProfileInfoTab user={user} onUpdate={handleUpdate} />
          )}
          {activeTab === "security" && (
            <SecurityTab user={user} />
          )}
          {activeTab === "media" && (
            <MediaTab user={user} onUpdate={handleUpdate} />
          )}
          {activeTab === "settings" && (
            <SettingsTab />
          )}
        </div>
      </div>
    </div>
  );
}
