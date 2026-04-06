"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { PlanLimitPayload } from "@/lib/api";

// ─── Limit key → human label ──────────────────────────────────────────────────

const LIMIT_LABELS: Record<string, string> = {
  max_active_listings:    "عدد الإعلانات النشطة",
  max_agents:             "عدد الوكلاء",
  max_conversations:      "عدد المحادثات",
  monthly_lead_unlocks:   "كشف بيانات التواصل الشهرية",
  max_images_per_listing: "عدد الصور لكل إعلان",
  max_videos_per_listing: "رفع الفيديو",
  video_upload:           "رفع الفيديو",
  featured_listings:      "الإعلانات المميزة",
};

// ─── Plan meta ────────────────────────────────────────────────────────────────

interface PlanMeta {
  name:     string;
  badge:    string;
  color:    string;
  features: string[];
}

const PLAN_META: Record<string, PlanMeta> = {
  office_basic: {
    name:  "الباقة الأساسية",
    badge: "الأكثر شيوعاً",
    color: "var(--color-primary)",
    features: [
      "حتى 20 إعلاناً نشطاً",
      "حتى 5 وكلاء",
      "50 محادثة شهرياً",
      "10 كشوفات تواصل شهرياً",
      "رفع الصور والفيديو",
      "الإعلانات المميزة",
    ],
  },
  office_advanced: {
    name:  "الباقة المتقدمة",
    badge: "الأفضل للوكالات الكبيرة",
    color: "#7c3aed",
    features: [
      "إعلانات غير محدودة",
      "وكلاء غير محدودون",
      "محادثات غير محدودة",
      "كشوفات تواصل غير محدودة",
      "جميع المزايا الأساسية",
      "لوحة تحليلات متقدمة",
      "دعم أولوية",
    ],
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function UpsellModal() {
  const router = useRouter();
  const [payload, setPayload] = useState<PlanLimitPayload | null>(null);

  const handleEvent = useCallback((e: Event) => {
    const detail = (e as CustomEvent<PlanLimitPayload>).detail;
    setPayload(detail);
  }, []);

  useEffect(() => {
    window.addEventListener("upsell:trigger", handleEvent);
    return () => window.removeEventListener("upsell:trigger", handleEvent);
  }, [handleEvent]);

  if (!payload) return null;

  const planCode = payload.suggestedPlanCode ?? "office_basic";
  const meta     = PLAN_META[planCode] ?? PLAN_META.office_basic;
  const limitLabel = LIMIT_LABELS[payload.limitKey] ?? payload.limitKey;

  const handleUpgrade = () => {
    setPayload(null);
    router.push("/dashboard/subscription");
  };

  const handleClose = () => setPayload(null);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="upsell-title"
      style={{
        position:       "fixed",
        inset:          0,
        zIndex:         1100,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        background:     "rgba(0,0,0,0.5)",
        backdropFilter: "blur(4px)",
        padding:        "1rem",
        direction:      "rtl",
      }}
      onClick={(e) => { if (e.target === e.currentTarget) handleClose(); }}
    >
      <div style={{
        background:   "var(--color-surface)",
        borderRadius: "var(--radius-lg)",
        padding:      "2rem",
        maxWidth:     "480px",
        width:        "100%",
        boxShadow:    "0 24px 64px rgba(0,0,0,0.25)",
        animation:    "fadeInUp 0.22s ease",
      }}>

        {/* Icon + Title */}
        <div style={{ textAlign: "center", marginBottom: "1.25rem" }}>
          <div style={{ fontSize: "2.75rem", marginBottom: "0.5rem" }}>🚀</div>
          <h2 id="upsell-title" style={{
            margin:     0,
            fontSize:   "1.15rem",
            fontWeight: 800,
            color:      "var(--color-text-primary)",
          }}>
            وصلت إلى حد خطتك الحالية
          </h2>
          <p style={{
            margin:     "0.5rem 0 0",
            fontSize:   "0.9rem",
            color:      "var(--color-text-secondary)",
            lineHeight: 1.6,
          }}>
            {payload.message}
          </p>
        </div>

        {/* Usage bar */}
        {payload.planLimit != null && payload.currentValue != null && (
          <div style={{
            background:   "var(--color-bg-secondary)",
            borderRadius: "var(--radius-md)",
            padding:      "0.85rem 1rem",
            marginBottom: "1.25rem",
          }}>
            <div style={{
              display:        "flex",
              justifyContent: "space-between",
              fontSize:       "0.85rem",
              color:          "var(--color-text-secondary)",
              marginBottom:   "0.5rem",
            }}>
              <span>{limitLabel}</span>
              <span style={{ fontWeight: 700, color: "var(--color-text-primary)" }}>
                {payload.currentValue} / {payload.planLimit}
              </span>
            </div>
            <div style={{
              height:       "6px",
              background:   "var(--color-border)",
              borderRadius: "999px",
              overflow:     "hidden",
            }}>
              <div style={{
                height:       "100%",
                width:        `${Math.min(100, (payload.currentValue / payload.planLimit) * 100)}%`,
                background:   "#ef4444",
                borderRadius: "999px",
                transition:   "width 0.4s ease",
              }} />
            </div>
          </div>
        )}

        {/* Suggested plan card */}
        <div style={{
          border:       `2px solid ${meta.color}`,
          borderRadius: "var(--radius-md)",
          padding:      "1rem 1.1rem",
          marginBottom: "1.5rem",
          position:     "relative",
        }}>
          {/* Badge */}
          <div style={{
            position:     "absolute",
            top:          "-0.65rem",
            right:        "0.85rem",
            background:   meta.color,
            color:        "#fff",
            fontSize:     "0.72rem",
            fontWeight:   700,
            padding:      "0.15rem 0.6rem",
            borderRadius: "999px",
            letterSpacing: "0.02em",
          }}>
            {meta.badge}
          </div>

          <div style={{
            fontWeight:   800,
            fontSize:     "1rem",
            color:        meta.color,
            marginBottom: "0.75rem",
          }}>
            {meta.name}
          </div>

          <ul style={{
            margin:       0,
            padding:      0,
            listStyle:    "none",
            display:      "grid",
            gridTemplateColumns: "1fr 1fr",
            gap:          "0.35rem 0.5rem",
          }}>
            {meta.features.map((f) => (
              <li key={f} style={{
                fontSize:   "0.82rem",
                color:      "var(--color-text-secondary)",
                display:    "flex",
                alignItems: "center",
                gap:        "0.3rem",
              }}>
                <span style={{ color: meta.color, fontWeight: 700 }}>✓</span>
                {f}
              </li>
            ))}
          </ul>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "0.75rem" }}>
          <button
            onClick={handleClose}
            style={{
              flex:         1,
              padding:      "0.7rem",
              borderRadius: "var(--radius-md)",
              border:       "1px solid var(--color-border)",
              background:   "transparent",
              cursor:       "pointer",
              fontFamily:   "inherit",
              fontSize:     "0.9rem",
              color:        "var(--color-text-secondary)",
            }}
          >
            لاحقاً
          </button>

          <button
            onClick={handleUpgrade}
            style={{
              flex:         2,
              padding:      "0.7rem",
              borderRadius: "var(--radius-md)",
              border:       "none",
              background:   meta.color,
              color:        "#fff",
              cursor:       "pointer",
              fontFamily:   "inherit",
              fontSize:     "0.95rem",
              fontWeight:   700,
            }}
          >
            ترقية الباقة الآن ⬆️
          </button>
        </div>
      </div>
    </div>
  );
}
