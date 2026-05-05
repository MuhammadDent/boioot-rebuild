"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { SYRIA_PROVINCES, PROVINCE_NAMES, citiesForProvince } from "@/lib/syria-provinces";

// ── Types ─────────────────────────────────────────────────────────────────────

interface AgencyProfileData {
  businessName:  string | null;
  bio:           string | null;
  city:          string | null;
  province:      string | null;
  logoUrl:       string | null;
  contactNumber: string | null;
  whatsappLink:  string | null;
  address:       string | null;
  websiteUrl:    string | null;
  // read-only admin fields
  isVisible:          boolean;
  isFeatured:         boolean;
  verificationStatus: string;
  verificationBadge:  string | null;
  isVerified:         boolean;
}

// ── UI atoms ──────────────────────────────────────────────────────────────────

function Banner({ type, msg }: { type: "success" | "error"; msg: string }) {
  const bg     = type === "success" ? "#d1fae5" : "#fee2e2";
  const color  = type === "success" ? "#065f46" : "#991b1b";
  const border = type === "success" ? "#6ee7b7" : "#fca5a5";
  return (
    <div style={{ background: bg, color, border: `1px solid ${border}`, borderRadius: 8, padding: "10px 16px", marginBottom: 16, fontSize: 14 }}>
      {msg}
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 18 }}>
      <label style={{ display: "block", fontWeight: 600, marginBottom: 6, fontSize: 14, color: "#374151" }}>
        {label}{required && <span style={{ color: "#ef4444", marginRight: 2 }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "9px 12px",
  border: "1px solid #d1d5db",
  borderRadius: 8,
  fontSize: 14,
  color: "#111827",
  background: "#fff",
  outline: "none",
  boxSizing: "border-box",
  fontFamily: "inherit",
  direction: "rtl",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "none",
  WebkitAppearance: "none",
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E")`,
  backgroundRepeat: "no-repeat",
  backgroundPosition: "left 12px center",
  paddingLeft: 36,
};

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: 100,
  resize: "vertical",
};

function StatusBadge({ label, active, color }: { label: string; active: boolean; color: string }) {
  return (
    <span style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 5,
      padding: "3px 10px",
      borderRadius: 999,
      fontSize: 12,
      fontWeight: 600,
      background: active ? `${color}20` : "#f3f4f6",
      color: active ? color : "#6b7280",
      border: `1px solid ${active ? color : "#e5e7eb"}`,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: "50%", background: active ? color : "#d1d5db" }} />
      {label}
    </span>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AgencyProfilePage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();

  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [banner, setBanner]     = useState<{ type: "success" | "error"; msg: string } | null>(null);
  const [profile, setProfile]   = useState<AgencyProfileData | null>(null);

  // Form state
  const [businessName,  setBusinessName]  = useState("");
  const [bio,           setBio]           = useState("");
  const [province,      setProvince]      = useState("");
  const [city,          setCity]          = useState("");
  const [logoUrl,       setLogoUrl]       = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [whatsappLink,  setWhatsappLink]  = useState("");
  const [address,       setAddress]       = useState("");
  const [websiteUrl,    setWebsiteUrl]    = useState("");

  const allowedRoles = ["Broker", "Office"];

  // Redirect if not allowed role
  useEffect(() => {
    if (!authLoading && user && !allowedRoles.includes(user.role)) {
      router.replace("/dashboard");
    }
  }, [user, authLoading, router]);

  // Load profile on mount
  useEffect(() => {
    if (!user || authLoading) return;
    if (!allowedRoles.includes(user.role)) return;

    async function load() {
      try {
        const data = await api.get<AgencyProfileData>("/my/agency-profile");
        setProfile(data);
        setBusinessName(data.businessName  ?? "");
        setBio(data.bio                    ?? "");
        setProvince(data.province          ?? "");
        setCity(data.city                  ?? "");
        setLogoUrl(data.logoUrl            ?? "");
        setContactNumber(data.contactNumber ?? "");
        setWhatsappLink(data.whatsappLink  ?? "");
        setAddress(data.address            ?? "");
        setWebsiteUrl(data.websiteUrl      ?? "");
      } catch {
        setBanner({ type: "error", msg: "تعذّر تحميل بيانات الملف. حاول مرة أخرى." });
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [user, authLoading]);

  // Reset city if province changes and city no longer belongs to it
  useEffect(() => {
    const cities = citiesForProvince(province);
    if (city && cities.length > 0 && !cities.includes(city)) {
      setCity("");
    }
  }, [province]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setBanner(null);
    try {
      const data = await api.put<AgencyProfileData>("/my/agency-profile", {
        businessName:  businessName.trim()  || null,
        bio:           bio.trim()           || null,
        province:      province             || null,
        city:          city                 || null,
        logoUrl:       logoUrl.trim()       || null,
        contactNumber: contactNumber.trim() || null,
        whatsappLink:  whatsappLink.trim()  || null,
        address:       address.trim()       || null,
        websiteUrl:    websiteUrl.trim()    || null,
      });
      setProfile(data);
      setBanner({ type: "success", msg: "تم حفظ الملف بنجاح. سيظهر للعموم بعد موافقة الإدارة." });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "حدث خطأ أثناء الحفظ";
      setBanner({ type: "error", msg });
    } finally {
      setSaving(false);
    }
  }

  // Auth loading / role check
  if (authLoading || (!user && !authLoading)) {
    return null;
  }
  if (!allowedRoles.includes(user!.role)) {
    return null;
  }

  const roleLabel = user!.role === "Broker" ? "الوسيط" : "المكتب";
  const provinceCities = citiesForProvince(province);
  const verificationLabel =
    profile?.verificationStatus === "Verified"          ? "موثّق"
    : profile?.verificationStatus === "PartiallyVerified" ? "موثّق جزئياً"
    : profile?.verificationStatus === "Pending"           ? "قيد المراجعة"
    : profile?.verificationStatus === "Rejected"          ? "مرفوض"
    : "غير موثّق";

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px", direction: "rtl", fontFamily: "inherit" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 22, fontWeight: 700, color: "#111827", margin: 0 }}>
          ملف {roleLabel}
        </h1>
        <p style={{ fontSize: 14, color: "#6b7280", marginTop: 6 }}>
          أضف بياناتك التجارية — ستظهر في صفحة المكاتب والوسطاء بعد موافقة الإدارة.
        </p>
      </div>

      {/* Status bar */}
      {profile && (
        <div style={{
          display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center",
          marginBottom: 24, padding: "12px 16px",
          background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 10,
        }}>
          <span style={{ fontSize: 13, color: "#6b7280", marginLeft: "auto" }}>حالة الملف:</span>
          <StatusBadge
            label={profile.isVisible ? "ظاهر للعموم" : "مخفي (بانتظار الإدارة)"}
            active={profile.isVisible}
            color="#16a34a"
          />
          {profile.isFeatured && (
            <StatusBadge label="مميّز" active color="#d97706" />
          )}
          <StatusBadge
            label={verificationLabel}
            active={profile.isVerified}
            color="#2563eb"
          />
          {profile.verificationBadge && (
            <span style={{ fontSize: 12, color: "#7c3aed", fontWeight: 600 }}>
              🏷 {profile.verificationBadge}
            </span>
          )}
        </div>
      )}

      {/* Info note */}
      {profile && !profile.isVisible && (
        <div style={{
          background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: 8,
          padding: "10px 14px", marginBottom: 20, fontSize: 13, color: "#92400e",
        }}>
          ملفك غير مرئي للعموم حالياً. سيتم تفعيله بعد مراجعة الإدارة.
        </div>
      )}

      {loading ? (
        <div style={{ textAlign: "center", padding: 48, color: "#9ca3af" }}>جارٍ التحميل…</div>
      ) : (
        <form onSubmit={handleSubmit}>
          {banner && <Banner type={banner.type} msg={banner.msg} />}

          {/* Card: basic info */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 20, marginTop: 0 }}>
              المعلومات الأساسية
            </h2>

            <Field label="الاسم التجاري">
              <input
                style={inputStyle}
                type="text"
                placeholder={`مثال: مكتب النور العقاري`}
                value={businessName}
                onChange={e => setBusinessName(e.target.value)}
                maxLength={300}
              />
            </Field>

            <Field label="النبذة التعريفية">
              <textarea
                style={textareaStyle}
                placeholder="اكتب نبذة مختصرة عن نشاطك ومجال عملك…"
                value={bio}
                onChange={e => setBio(e.target.value)}
                maxLength={2000}
              />
              <div style={{ fontSize: 12, color: "#9ca3af", marginTop: 4, textAlign: "left" }}>
                {bio.length} / 2000
              </div>
            </Field>

            <Field label="رابط الشعار (URL)">
              <input
                style={inputStyle}
                type="url"
                placeholder="https://example.com/logo.png"
                value={logoUrl}
                onChange={e => setLogoUrl(e.target.value)}
                maxLength={1000}
                dir="ltr"
              />
            </Field>
          </div>

          {/* Card: location */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px", marginBottom: 20 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 20, marginTop: 0 }}>
              الموقع الجغرافي
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="المحافظة">
                <div style={{ position: "relative" }}>
                  <select
                    style={selectStyle}
                    value={province}
                    onChange={e => setProvince(e.target.value)}
                  >
                    <option value="">-- اختر المحافظة --</option>
                    {PROVINCE_NAMES.map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
              </Field>

              <Field label="المدينة">
                <div style={{ position: "relative" }}>
                  <select
                    style={{ ...selectStyle, opacity: !province ? 0.5 : 1 }}
                    value={city}
                    onChange={e => setCity(e.target.value)}
                    disabled={!province}
                  >
                    <option value="">-- اختر المدينة --</option>
                    {provinceCities.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </Field>
            </div>

            <Field label="العنوان التفصيلي">
              <input
                style={inputStyle}
                type="text"
                placeholder="مثال: شارع الثورة، بجانب مسجد الفاروق"
                value={address}
                onChange={e => setAddress(e.target.value)}
                maxLength={500}
              />
            </Field>
          </div>

          {/* Card: contact */}
          <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 12, padding: "24px", marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: "#111827", marginBottom: 20, marginTop: 0 }}>
              معلومات التواصل
            </h2>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              <Field label="رقم التواصل">
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="+963 9XX XXX XXXX"
                  value={contactNumber}
                  onChange={e => setContactNumber(e.target.value)}
                  maxLength={50}
                  dir="ltr"
                />
              </Field>

              <Field label="رابط واتساب">
                <input
                  style={inputStyle}
                  type="url"
                  placeholder="https://wa.me/963xxxxxxxxx"
                  value={whatsappLink}
                  onChange={e => setWhatsappLink(e.target.value)}
                  maxLength={500}
                  dir="ltr"
                />
              </Field>
            </div>

            <Field label="الموقع الإلكتروني">
              <input
                style={inputStyle}
                type="url"
                placeholder="https://myoffice.sy"
                value={websiteUrl}
                onChange={e => setWebsiteUrl(e.target.value)}
                maxLength={500}
                dir="ltr"
              />
            </Field>
          </div>

          {/* Submit */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                background: saving ? "#9ca3af" : "#2563eb",
                color: "#fff",
                border: "none",
                borderRadius: 8,
                padding: "10px 28px",
                fontSize: 15,
                fontWeight: 600,
                cursor: saving ? "not-allowed" : "pointer",
                transition: "background 0.2s",
              }}
            >
              {saving ? "جارٍ الحفظ…" : "حفظ الملف"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
