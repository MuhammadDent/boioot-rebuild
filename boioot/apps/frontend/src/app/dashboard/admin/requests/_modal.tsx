"use client";

import { useEffect } from "react";
import type { RequestResponse } from "@/types";
import {
  REQUEST_STATUS_LABELS,
} from "@/features/dashboard/requests/constants";

const STATUS_PALETTE: Record<string, { bg: string; text: string; border: string }> = {
  New:       { bg: "#eff6ff", text: "#1d4ed8", border: "#bfdbfe" },
  Contacted: { bg: "#fffbeb", text: "#92400e", border: "#fde68a" },
  Qualified: { bg: "#f0fdf4", text: "#15803d", border: "#86efac" },
  Closed:    { bg: "#f8fafc", text: "#64748b", border: "#cbd5e1" },
};

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.15rem", marginBottom: "0.75rem" }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 600, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.03em" }}>
        {label}
      </span>
      <span style={{ fontSize: "0.88rem", color: "#0f172a", fontWeight: 500, wordBreak: "break-word" }}>
        {value}
      </span>
    </div>
  );
}

function SectionTitle({ children }: { children: string }) {
  return (
    <div style={{
      fontSize: "0.72rem", fontWeight: 700, color: "#64748b",
      textTransform: "uppercase", letterSpacing: "0.05em",
      borderBottom: "1px solid #f1f5f9", paddingBottom: "0.4rem",
      marginBottom: "0.85rem", marginTop: "1.1rem",
    }}>
      {children}
    </div>
  );
}

export function RequestModal({
  request: r,
  onClose,
}: {
  request: RequestResponse | null;
  onClose: () => void;
}) {
  // Close on Escape key
  useEffect(() => {
    if (!r) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [r, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (r) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [r]);

  if (!r) return null;

  const initials = r.name.trim().split(/\s+/).slice(0, 2).map(w => w[0] ?? "").join("");
  const hue      = r.name.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360;
  const pal      = STATUS_PALETTE[r.status] ?? STATUS_PALETTE.Closed;
  const subject  = r.propertyTitle ?? r.projectTitle;
  const subjectType = r.propertyTitle ? "عقار" : r.projectTitle ? "مشروع" : null;

  function fmt(iso: string) {
    return new Date(iso).toLocaleDateString("ar-SY", {
      year: "numeric", month: "long", day: "numeric",
      hour: "2-digit", minute: "2-digit",
    });
  }

  return (
    /* Backdrop */
    <div
      style={{
        position: "fixed", inset: 0, zIndex: 1000,
        backgroundColor: "rgba(0,0,0,0.55)",
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "1rem", backdropFilter: "blur(2px)",
      }}
      onClick={onClose}
    >
      {/* Modal */}
      <div
        style={{
          backgroundColor: "#fff", borderRadius: 20,
          width: "100%", maxWidth: 560,
          maxHeight: "90dvh", overflowY: "auto",
          direction: "rtl", boxShadow: "0 24px 64px rgba(0,0,0,0.25)",
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* ── Header ── */}
        <div style={{
          display: "flex", alignItems: "flex-start", gap: "1rem",
          padding: "1.4rem 1.5rem 1rem",
          borderBottom: "1px solid #f1f5f9",
          position: "sticky", top: 0,
          backgroundColor: "#fff", borderRadius: "20px 20px 0 0",
          zIndex: 1,
        }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: "50%", flexShrink: 0,
            backgroundColor: `hsl(${hue}, 55%, 88%)`,
            color: `hsl(${hue}, 55%, 32%)`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1rem", fontWeight: 800,
          }}>
            {initials || "؟"}
          </div>

          {/* Name + status */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                {r.name}
              </h2>
              <span style={{
                backgroundColor: pal.bg, color: pal.text,
                border: `1px solid ${pal.border}`,
                borderRadius: 20, padding: "0.15rem 0.7rem",
                fontSize: "0.75rem", fontWeight: 700,
              }}>
                {REQUEST_STATUS_LABELS[r.status] ?? r.status}
              </span>
            </div>
            <p style={{ margin: "0.2rem 0 0", fontSize: "0.8rem", color: "#94a3b8" }}>
              #{r.id.slice(0, 8)}… · {new Date(r.createdAt).toLocaleDateString("en-GB")}
            </p>
          </div>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: "none", border: "none",
              width: 34, height: 34, borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", fontSize: "1.2rem", color: "#94a3b8",
              flexShrink: 0,
              backgroundColor: "#f8fafc",
            }}
          >
            ×
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: "0.5rem 1.5rem 1.5rem" }}>

          <SectionTitle>معلومات التواصل</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
            <DetailRow label="الهاتف" value={r.phone} />
            {r.email
              ? <DetailRow label="البريد الإلكتروني" value={r.email} />
              : <div />
            }
          </div>

          {(subject || r.companyName) && (
            <>
              <SectionTitle>تفاصيل الطلب</SectionTitle>
              {subject && subjectType && (
                <DetailRow label={subjectType} value={subject} />
              )}
              {r.companyName && (
                <DetailRow label="الشركة" value={r.companyName} />
              )}
            </>
          )}

          {r.message && (
            <>
              <SectionTitle>الرسالة</SectionTitle>
              <div style={{
                backgroundColor: "#f8fafc", borderRadius: 10,
                padding: "0.85rem 1rem", border: "1px solid #f1f5f9",
                fontSize: "0.88rem", color: "#334155", lineHeight: 1.65,
                whiteSpace: "pre-wrap", wordBreak: "break-word",
              }}>
                {r.message}
              </div>
            </>
          )}

          <SectionTitle>التواريخ</SectionTitle>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0 1.5rem" }}>
            <DetailRow label="تاريخ الإرسال"    value={fmt(r.createdAt)} />
            <DetailRow label="آخر تحديث"        value={fmt(r.updatedAt)} />
          </div>

        </div>

        {/* ── Footer ── */}
        <div style={{
          padding: "1rem 1.5rem",
          borderTop: "1px solid #f1f5f9",
          display: "flex", justifyContent: "flex-start",
          position: "sticky", bottom: 0,
          backgroundColor: "#fff",
          borderRadius: "0 0 20px 20px",
        }}>
          <button
            onClick={onClose}
            style={{
              padding: "0.55rem 1.5rem", borderRadius: 10,
              border: "1px solid #e2e8f0", backgroundColor: "#f8fafc",
              color: "#475569", fontSize: "0.85rem", fontWeight: 600,
              cursor: "pointer", fontFamily: "inherit",
            }}
          >
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
}
