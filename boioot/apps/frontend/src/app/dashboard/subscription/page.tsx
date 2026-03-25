"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { subscriptionApi } from "@/features/subscription/api";
import { normalizeError } from "@/lib/api";
import type {
  CurrentSubscriptionResponse,
  SubscriptionHistoryDto,
} from "@/features/subscription/types";

// ── helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-SY", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function formatDatetime(iso: string | null | undefined) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("ar-SY", {
    year: "numeric", month: "short", day: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

const STATUS_LABEL: Record<string, string> = {
  Active:    "نشط",
  Trial:     "تجريبي",
  Pending:   "معلق",
  PastDue:   "متأخر",
  Canceled:  "ملغى",
  Expired:   "منتهي",
  Free:      "مجاني",
};

const STATUS_COLOR: Record<string, { bg: string; color: string; border: string }> = {
  Active:   { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
  Trial:    { bg: "#eff6ff", color: "#1d4ed8", border: "#93c5fd" },
  Pending:  { bg: "#fffbeb", color: "#92400e", border: "#fcd34d" },
  PastDue:  { bg: "#fff1f2", color: "#9f1239", border: "#fca5a5" },
  Canceled: { bg: "#f8fafc", color: "#475569", border: "#cbd5e1" },
  Expired:  { bg: "#f8fafc", color: "#475569", border: "#cbd5e1" },
  Free:     { bg: "#f0fdf4", color: "#166534", border: "#86efac" },
};

const EVENT_TYPE_LABEL: Record<string, string> = {
  created:         "إنشاء الاشتراك",
  assigned:        "تعيين باقة",
  changed:         "تغيير الباقة",
  upgraded:        "ترقية الباقة",
  downgraded:      "تخفيض الباقة",
  renewed:         "تجديد الاشتراك",
  canceled:        "إلغاء الاشتراك",
  expired:         "انتهاء الاشتراك",
  trial_started:   "بدء التجربة",
  trial_converted: "تحويل التجربة",
};

const LIMIT_LABEL: Record<string, string> = {
  max_active_listings: "إعلانات نشطة",
  max_agents:          "عدد الوكلاء",
  max_projects:        "عدد المشاريع",
  max_images_per_listing: "صور لكل إعلان",
  max_featured_slots:  "فرص مميزة",
};

const FEATURE_LABEL: Record<string, string> = {
  analytics_dashboard:  "لوحة التحليلات",
  video_upload:         "رفع الفيديو",
  featured_listings:    "الإعلانات المميزة",
  whatsapp_contact:     "زر واتساب",
  verified_badge:       "شارة التحقق",
  homepage_exposure:    "عرض الصفحة الرئيسية",
  project_management:   "إدارة المشاريع",
};

function limitDisplay(value: number) {
  if (value === -1) return "غير محدود";
  if (value === 0) return "غير متاح";
  return value.toLocaleString("ar-SY");
}

// ── CancelModal ───────────────────────────────────────────────────────────────

function CancelModal({
  onClose,
  onConfirm,
}: {
  onClose: () => void;
  onConfirm: (notes: string) => Promise<void>;
}) {
  const [notes, setNotes]       = useState("");
  const [busy, setBusy]         = useState(false);
  const [error, setError]       = useState<string | null>(null);

  async function handleConfirm() {
    setBusy(true);
    setError(null);
    try {
      await onConfirm(notes.trim());
    } catch (err) {
      setError(normalizeError(err));
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.45)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem",
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 18,
        width: "100%",
        maxWidth: 460,
        padding: "1.75rem",
      }}>
        <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.1rem", fontWeight: 800, color: "#1a2e1a" }}>
          إلغاء الاشتراك
        </h2>
        <p style={{ margin: "0 0 1.25rem", fontSize: "0.88rem", color: "#64748b", lineHeight: 1.6 }}>
          هل أنت متأكد من إلغاء اشتراكك؟ سيستمر الاشتراك حتى نهاية الفترة الحالية.
        </p>

        <div style={{ marginBottom: "1.25rem" }}>
          <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "0.4rem" }}>
            سبب الإلغاء (اختياري)
          </label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            rows={3}
            placeholder="أخبرنا سبب إلغاء اشتراكك..."
            style={{
              width: "100%",
              padding: "0.65rem 0.85rem",
              borderRadius: 9,
              border: "1.5px solid #e2e8f0",
              fontSize: "0.88rem",
              resize: "vertical",
              boxSizing: "border-box",
              fontFamily: "inherit",
            }}
          />
        </div>

        {error && (
          <div style={{
            backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
            borderRadius: 9, padding: "0.75rem", marginBottom: "1rem",
            fontSize: "0.85rem", color: "#b91c1c",
          }}>
            {error}
          </div>
        )}

        <div style={{ display: "flex", gap: "0.65rem" }}>
          <button
            onClick={onClose}
            type="button"
            disabled={busy}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: 10,
              border: "1.5px solid #e2e8f0", backgroundColor: "#f8fafc",
              color: "#475569", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer",
            }}
          >
            تراجع
          </button>
          <button
            onClick={handleConfirm}
            type="button"
            disabled={busy}
            style={{
              flex: 1, padding: "0.75rem", borderRadius: 10,
              border: "none",
              backgroundColor: busy ? "#94a3b8" : "#dc2626",
              color: "#fff", fontSize: "0.9rem", fontWeight: 700,
              cursor: busy ? "default" : "pointer",
            }}
          >
            {busy ? "جارٍ الإلغاء..." : "تأكيد الإلغاء"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function SubscriptionPage() {
  useProtectedRoute();
  const router = useRouter();

  const [sub, setSub]           = useState<CurrentSubscriptionResponse | null>(null);
  const [history, setHistory]   = useState<SubscriptionHistoryDto[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [cancelSuccess, setCancelSuccess] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [subRes, histRes] = await Promise.all([
        subscriptionApi.getCurrent(),
        subscriptionApi.getHistory().catch(() => [] as SubscriptionHistoryDto[]),
      ]);
      setSub(subRes);
      setHistory(histRes);
    } catch (err) {
      setError(normalizeError(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleCancel(notes: string) {
    await subscriptionApi.cancel({ notes: notes || null });
    setShowCancel(false);
    setCancelSuccess(true);
    await load();
  }

  const statusStyle = STATUS_COLOR[sub?.status ?? ""] ?? STATUS_COLOR["Active"];
  const isCancelable = sub && ["Active", "Trial"].includes(sub.status) && sub.isActive;

  if (loading) {
    return (
      <div style={{ padding: "2rem", textAlign: "center", color: "#94a3b8" }}>
        جارٍ التحميل...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: "2rem" }}>
        <div style={{
          backgroundColor: "#fee2e2", border: "1px solid #fca5a5",
          borderRadius: 12, padding: "1.25rem", color: "#b91c1c",
        }}>
          {error}
        </div>
      </div>
    );
  }

  if (!sub) {
    return (
      <div style={{ padding: "2rem", maxWidth: 640 }}>
        <h1 style={{ fontSize: "1.4rem", fontWeight: 800, color: "#1a2e1a", margin: "0 0 0.5rem" }}>
          اشتراكي
        </h1>
        <p style={{ color: "#64748b", margin: "0 0 1.5rem" }}>
          لا يوجد حساب مرتبط بمستخدمك. أنشئ حساباً أو انضم إلى منظمة للاستفادة من الخطط.
        </p>
        <Link
          href="/dashboard/subscription/plans"
          style={{
            display: "inline-block", padding: "0.75rem 1.5rem",
            backgroundColor: "#059669", color: "#fff",
            borderRadius: 10, fontWeight: 700, textDecoration: "none", fontSize: "0.9rem",
          }}
        >
          تصفّح الباقات
        </Link>
      </div>
    );
  }

  const enabledFeatures = Object.entries(sub.features).filter(([, v]) => v);
  const limits = Object.entries(sub.limits);

  return (
    <div style={{ padding: "1.5rem 2rem", maxWidth: 800, direction: "rtl" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 800, color: "#1a2e1a" }}>
            اشتراكي
          </h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#64748b" }}>
            إدارة اشتراكك وعرض تاريخ التغييرات
          </p>
        </div>
        <Link
          href="/dashboard/subscription/plans"
          style={{
            padding: "0.6rem 1.25rem",
            backgroundColor: "#1a2e1a",
            color: "#fff",
            borderRadius: 10,
            textDecoration: "none",
            fontWeight: 700,
            fontSize: "0.875rem",
          }}
        >
          تغيير الباقة
        </Link>
      </div>

      {cancelSuccess && (
        <div style={{
          backgroundColor: "#fef3c7", border: "1px solid #fcd34d",
          borderRadius: 10, padding: "0.85rem 1rem", marginBottom: "1.25rem",
          fontSize: "0.875rem", color: "#92400e", fontWeight: 600,
        }}>
          ✅ تم إلغاء الاشتراك بنجاح. سيستمر الاشتراك حتى نهاية الفترة الحالية.
        </div>
      )}

      {/* Current plan card */}
      <div style={{
        backgroundColor: "#fff",
        borderRadius: 16,
        padding: "1.5rem",
        boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
        border: "1.5px solid #e2e8f0",
        marginBottom: "1.5rem",
      }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.25rem" }}>
          <div>
            <p style={{ margin: "0 0 0.3rem", fontSize: "0.78rem", color: "#94a3b8", fontWeight: 500 }}>
              باقتك الحالية
            </p>
            <h2 style={{ margin: 0, fontSize: "1.35rem", fontWeight: 800, color: "#1a2e1a" }}>
              {sub.planName}
            </h2>
            {sub.tier && (
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#64748b" }}>
                {sub.audienceType} · {sub.tier}
              </p>
            )}
          </div>
          <span style={{
            display: "inline-flex", alignItems: "center",
            padding: "0.3rem 0.85rem",
            borderRadius: 20,
            fontSize: "0.78rem", fontWeight: 700,
            backgroundColor: statusStyle.bg,
            color: statusStyle.color,
            border: `1.5px solid ${statusStyle.border}`,
          }}>
            {STATUS_LABEL[sub.status] ?? sub.status}
          </span>
        </div>

        {/* Dates grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
          gap: "0.75rem",
          borderTop: "1px solid #f1f5f9",
          paddingTop: "1.25rem",
          marginBottom: "1.25rem",
        }}>
          <div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>تاريخ البدء</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#1e293b", fontWeight: 600 }}>
              {formatDate(sub.startDate)}
            </p>
          </div>
          {sub.endDate && (
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>تاريخ الانتهاء</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#1e293b", fontWeight: 600 }}>
                {formatDate(sub.endDate)}
              </p>
            </div>
          )}
          {sub.currentPeriodEnd && (
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>نهاية الفترة الحالية</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#1e293b", fontWeight: 600 }}>
                {formatDate(sub.currentPeriodEnd)}
              </p>
            </div>
          )}
          {sub.trialEndsAt && (
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#1d4ed8", fontWeight: 600 }}>انتهاء التجربة</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#1d4ed8", fontWeight: 700 }}>
                {formatDate(sub.trialEndsAt)}
              </p>
            </div>
          )}
          {sub.canceledAt && (
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#dc2626", fontWeight: 600 }}>تاريخ الإلغاء</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#dc2626", fontWeight: 700 }}>
                {formatDate(sub.canceledAt)}
              </p>
            </div>
          )}
          <div>
            <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>التجديد التلقائي</p>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#1e293b", fontWeight: 600 }}>
              {sub.autoRenew ? "✅ مفعّل" : "❌ موقوف"}
            </p>
          </div>
          {sub.priceAmount > 0 && (
            <div>
              <p style={{ margin: 0, fontSize: "0.72rem", color: "#94a3b8", fontWeight: 600 }}>السعر</p>
              <p style={{ margin: "0.2rem 0 0", fontSize: "0.88rem", color: "#059669", fontWeight: 700 }}>
                {sub.priceAmount.toLocaleString("ar-SY")} {sub.currencyCode} / {sub.billingCycle === "Monthly" ? "شهرياً" : "سنوياً"}
              </p>
            </div>
          )}
        </div>

        {/* Cancel button */}
        {isCancelable && (
          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: "1rem" }}>
            <button
              onClick={() => setShowCancel(true)}
              type="button"
              style={{
                padding: "0.55rem 1.1rem",
                borderRadius: 9,
                border: "1.5px solid #fca5a5",
                backgroundColor: "#fff",
                color: "#dc2626",
                fontSize: "0.85rem",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              إلغاء الاشتراك
            </button>
          </div>
        )}
      </div>

      {/* Limits + Features row */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
        gap: "1.25rem",
        marginBottom: "1.5rem",
      }}>
        {/* Limits */}
        {limits.length > 0 && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: "1.25rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1.5px solid #e2e8f0",
          }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
              📊 الحدود والإمكانات
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
              {limits.map(([key, value]) => (
                <div
                  key={key}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    fontSize: "0.85rem",
                  }}
                >
                  <span style={{ color: "#475569" }}>{LIMIT_LABEL[key] ?? key}</span>
                  <span style={{
                    fontWeight: 700,
                    color: value === -1 ? "#059669" : value === 0 ? "#94a3b8" : "#1e293b",
                  }}>
                    {limitDisplay(value)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Features */}
        {enabledFeatures.length > 0 && (
          <div style={{
            backgroundColor: "#fff",
            borderRadius: 14,
            padding: "1.25rem",
            boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
            border: "1.5px solid #e2e8f0",
          }}>
            <h3 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
              ✨ المميزات المفعّلة
            </h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {enabledFeatures.map(([key]) => (
                <div
                  key={key}
                  style={{ display: "flex", alignItems: "center", gap: "0.5rem", fontSize: "0.85rem", color: "#166534" }}
                >
                  <span>✓</span>
                  <span>{FEATURE_LABEL[key] ?? key}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Subscription History */}
      {history.length > 0 && (
        <div style={{
          backgroundColor: "#fff",
          borderRadius: 14,
          padding: "1.25rem",
          boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
          border: "1.5px solid #e2e8f0",
        }}>
          <h3 style={{ margin: "0 0 1.25rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>
            🕒 سجل التغييرات
          </h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "0" }}>
            {history.map((item, idx) => (
              <div
                key={item.id}
                style={{
                  display: "flex",
                  gap: "1rem",
                  paddingBottom: idx < history.length - 1 ? "1rem" : 0,
                }}
              >
                {/* Timeline line + dot */}
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                  <div style={{
                    width: 10, height: 10, borderRadius: "50%",
                    backgroundColor: "#059669", marginTop: 4, flexShrink: 0,
                  }} />
                  {idx < history.length - 1 && (
                    <div style={{ width: 2, flex: 1, backgroundColor: "#e2e8f0", marginTop: 4 }} />
                  )}
                </div>
                {/* Content */}
                <div style={{ flex: 1, paddingBottom: idx < history.length - 1 ? "0.5rem" : 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "0.5rem" }}>
                    <p style={{ margin: 0, fontSize: "0.88rem", fontWeight: 700, color: "#1e293b" }}>
                      {EVENT_TYPE_LABEL[item.eventType] ?? item.eventType}
                    </p>
                    <p style={{ margin: 0, fontSize: "0.75rem", color: "#94a3b8", flexShrink: 0 }}>
                      {formatDatetime(item.createdAtUtc)}
                    </p>
                  </div>
                  {(item.oldPlanName || item.newPlanName) && (
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
                      {item.oldPlanName && `${item.oldPlanName} → `}
                      {item.newPlanName ?? "—"}
                    </p>
                  )}
                  {item.notes && (
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.78rem", color: "#94a3b8", fontStyle: "italic" }}>
                      {item.notes}
                    </p>
                  )}
                  {item.createdByName && (
                    <p style={{ margin: "0.2rem 0 0", fontSize: "0.75rem", color: "#94a3b8" }}>
                      بواسطة: {item.createdByName}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cancel modal */}
      {showCancel && (
        <CancelModal
          onClose={() => setShowCancel(false)}
          onConfirm={handleCancel}
        />
      )}
    </div>
  );
}
