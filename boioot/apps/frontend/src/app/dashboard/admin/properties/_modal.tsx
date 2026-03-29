"use client";

import { useState, useEffect, type CSSProperties } from "react";
import {
  PROPERTY_STATUS_LABELS,
  PROPERTY_TYPE_LABELS,
  LISTING_TYPE_LABELS,
  formatPrice,
} from "@/features/properties/constants";
import { PROPERTY_STATUS_BADGE } from "@/features/admin/constants";
import type { PropertyResponse } from "@/types";

// ─── Status options ───────────────────────────────────────────────────────────
const STATUSES = ["Available", "Inactive", "Sold", "Rented"] as const;

// ─── Field row ────────────────────────────────────────────────────────────────
function Row({ label, value }: { label: string; value?: string | number | null }) {
  if (!value && value !== 0) return null;
  return (
    <div style={{ display: "flex", gap: "0.5rem", fontSize: "0.85rem", paddingBottom: "0.5rem" }}>
      <span style={{ color: "#64748b", minWidth: 110, flexShrink: 0 }}>{label}</span>
      <span style={{ color: "#0f172a", fontWeight: 600 }}>{value}</span>
    </div>
  );
}

// ─── Main Modal ───────────────────────────────────────────────────────────────
// ─── Moderation badge config ──────────────────────────────────────────────────
const MODERATION_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  Active:   { label: "نشط",     bg: "#f0fdf4", color: "#15803d", border: "#86efac" },
  Pending:  { label: "قيد المراجعة", bg: "#fefce8", color: "#a16207", border: "#fde68a" },
  Rejected: { label: "مرفوض",   bg: "#fef2f2", color: "#dc2626", border: "#fecaca" },
};

export function PropertyDetailModal({
  property,
  onClose,
  onStatusChange,
  onModerationChange,
  onDelete,
  onEdit,
  actionLoading,
}: {
  property: PropertyResponse | null;
  onClose: () => void;
  onStatusChange: (id: string, status: string) => Promise<void>;
  onModerationChange: (id: string, moderationStatus: string) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onEdit: (id: string) => void;
  actionLoading: boolean;
}) {
  const [pendingStatus,     setPendingStatus]     = useState("");
  const [pendingModeration, setPendingModeration] = useState("Active");
  const [confirmDelete,     setConfirmDelete]     = useState(false);
  const [statusSuccess,     setStatusSuccess]     = useState(false);
  const [moderSuccess,      setModerSuccess]      = useState(false);
  const [localError,        setLocalError]        = useState("");

  // Sync state when property changes
  useEffect(() => {
    if (property) {
      setPendingStatus(property.status);
      setPendingModeration(property.moderationStatus ?? "Active");
      setConfirmDelete(false);
      setStatusSuccess(false);
      setModerSuccess(false);
      setLocalError("");
    }
  }, [property?.id]);

  // Scroll lock
  useEffect(() => {
    if (property) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [!!property]);

  // Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  if (!property) return null;

  const primaryImage = property.images?.find(i => i.isPrimary) ?? property.images?.[0];

  async function handleStatusApply() {
    if (pendingStatus === property.status) return;
    setLocalError("");
    setStatusSuccess(false);
    try {
      await onStatusChange(property.id, pendingStatus);
      setStatusSuccess(true);
      setTimeout(() => setStatusSuccess(false), 2000);
    } catch (e) {
      setLocalError(String(e));
    }
  }

  async function handleModerationApply(newStatus: string) {
    if (newStatus === (property.moderationStatus ?? "Active")) return;
    setLocalError("");
    setModerSuccess(false);
    try {
      await onModerationChange(property.id, newStatus);
      setPendingModeration(newStatus);
      setModerSuccess(true);
      setTimeout(() => setModerSuccess(false), 2000);
    } catch (e) {
      setLocalError(String(e));
    }
  }

  async function handleDeleteConfirm() {
    setLocalError("");
    try {
      await onDelete(property.id);
      onClose();
    } catch (e) {
      setLocalError(String(e));
    }
  }

  const overlayStyle: CSSProperties = {
    position: "fixed", inset: 0, zIndex: 1200,
    backgroundColor: "rgba(15,23,42,0.65)",
    display: "flex", alignItems: "flex-start",
    justifyContent: "center",
    overflowY: "auto", padding: "2rem 1rem",
  };

  const sheetStyle: CSSProperties = {
    backgroundColor: "#fff", borderRadius: 18,
    width: "100%", maxWidth: 680,
    boxShadow: "0 24px 60px rgba(0,0,0,0.22)",
    overflow: "hidden",
    position: "relative",
    margin: "auto",
  };

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div style={sheetStyle}>

        {/* ── Image ── */}
        {primaryImage ? (
          <div style={{ width: "100%", height: 220, overflow: "hidden", backgroundColor: "#f1f5f9" }}>
            <img
              src={primaryImage.imageUrl}
              alt={property.title}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div style={{
            width: "100%", height: 100,
            backgroundColor: "#f8fafc",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "2.5rem", color: "#cbd5e1",
          }}>🏠</div>
        )}

        {/* ── Header ── */}
        <div style={{ padding: "1.25rem 1.5rem 0" }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: "0.75rem", justifyContent: "space-between" }}>
            <div style={{ flex: 1 }}>
              <h2 style={{ margin: "0 0 0.5rem", fontSize: "1.15rem", fontWeight: 800, color: "#0f172a", lineHeight: 1.4 }}>
                {property.title}
              </h2>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "center" }}>
                <span className={PROPERTY_STATUS_BADGE[property.status] ?? "badge badge-gray"}>
                  {PROPERTY_STATUS_LABELS[property.status] ?? property.status}
                </span>
                {(() => {
                  const ms = pendingModeration;
                  const cfg = MODERATION_CONFIG[ms] ?? MODERATION_CONFIG.Active;
                  return (
                    <span style={{
                      backgroundColor: cfg.bg, color: cfg.color,
                      border: `1px solid ${cfg.border}`, borderRadius: 20,
                      padding: "0.15rem 0.65rem", fontSize: "0.76rem", fontWeight: 700,
                    }}>
                      {cfg.label}
                    </span>
                  );
                })()}
                <span style={{
                  backgroundColor: "#f1f5f9", borderRadius: 20,
                  padding: "0.15rem 0.65rem", fontSize: "0.76rem", color: "#475569", fontWeight: 600,
                }}>
                  {PROPERTY_TYPE_LABELS[property.type] ?? property.type}
                </span>
                <span style={{
                  backgroundColor: "#eff6ff", borderRadius: 20,
                  padding: "0.15rem 0.65rem", fontSize: "0.76rem", color: "#1d4ed8", fontWeight: 600,
                }}>
                  {LISTING_TYPE_LABELS[property.listingType] ?? property.listingType}
                </span>
              </div>
            </div>
            <button onClick={onClose} style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: "1.5rem", color: "#94a3b8", lineHeight: 1, padding: "0.1rem",
              flexShrink: 0,
            }}>×</button>
          </div>

          {/* Price */}
          <div style={{
            fontSize: "1.5rem", fontWeight: 800, color: "var(--color-primary)",
            margin: "0.75rem 0 0",
          }}>
            {formatPrice(property.price, property.currency)}
          </div>
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "1rem 0" }} />

        {/* ── Details ── */}
        <div style={{ padding: "0 1.5rem" }}>
          <Row label="📍 المدينة"       value={property.city} />
          <Row label="🏘 الحي"          value={property.neighborhood} />
          <Row label="🏛 المنطقة"       value={property.province} />
          <Row label="📐 المساحة"       value={property.area ? `${property.area} م²` : null} />
          <Row label="🛏 غرف النوم"     value={property.bedrooms != null ? String(property.bedrooms) : null} />
          <Row label="🚿 دورات المياه"  value={property.bathrooms != null ? String(property.bathrooms) : null} />
          <Row label="🛋 الصالات"       value={property.hallsCount != null ? String(property.hallsCount) : null} />
          <Row label="📅 الطابق"        value={property.floor} />
          <Row label="🏗 عمر العقار"    value={property.propertyAge != null ? `${property.propertyAge} سنة` : null} />
          <Row label="📊 المشاهدات"     value={property.viewCount ?? null} />
          <Row label="🏢 الشركة"        value={property.companyName} />
          <Row label="👤 المالك"         value={property.ownerName} />
          <Row label="📞 جوال المالك"   value={property.ownerPhone} />
          <Row label="📅 تاريخ الإضافة" value={new Date(property.createdAt).toLocaleDateString("en-GB")} />
        </div>

        {/* ── Description ── */}
        {property.description && (
          <div style={{ padding: "0.75rem 1.5rem 0" }}>
            <p style={{ fontSize: "0.73rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.35rem" }}>الوصف</p>
            <p style={{
              margin: 0, fontSize: "0.85rem", color: "#334155",
              lineHeight: 1.65, whiteSpace: "pre-wrap",
            }}>{property.description}</p>
          </div>
        )}

        {/* ── Features ── */}
        {property.features && property.features.length > 0 && (
          <div style={{ padding: "0.75rem 1.5rem 0" }}>
            <p style={{ fontSize: "0.73rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.5rem" }}>المميزات</p>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
              {property.features.map(f => (
                <span key={f} style={{
                  backgroundColor: "#f0fdf4", color: "#15803d",
                  border: "1px solid #86efac", borderRadius: 20,
                  padding: "0.2rem 0.65rem", fontSize: "0.78rem", fontWeight: 600,
                }}>✓ {f}</span>
              ))}
            </div>
          </div>
        )}

        {/* ── Divider ── */}
        <div style={{ height: 1, backgroundColor: "#f1f5f9", margin: "1rem 0" }} />

        {/* ── Actions ── */}
        <div style={{ padding: "0 1.5rem 1.5rem" }}>

          {/* Edit button — primary CTA */}
          {!confirmDelete && (
            <div style={{ marginBottom: "1rem" }}>
              <button
                onClick={() => { onClose(); onEdit(property.id); }}
                disabled={actionLoading}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  width: "100%",
                  padding: "0.6rem 1.25rem",
                  borderRadius: 8,
                  border: "none",
                  backgroundColor: "#1d4ed8",
                  color: "#fff",
                  fontSize: "0.88rem",
                  fontWeight: 700,
                  cursor: actionLoading ? "not-allowed" : "pointer",
                  fontFamily: "inherit",
                  justifyContent: "center",
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={e => { if (!actionLoading) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1e40af"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#1d4ed8"; }}
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                تعديل العقار
              </button>
            </div>
          )}

          {/* Divider */}
          {!confirmDelete && (
            <div style={{ height: 1, backgroundColor: "#f1f5f9", marginBottom: "1rem" }} />
          )}

          {/* ─── Moderation control ──── */}
          {!confirmDelete && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.5rem" }}>
                حالة الإشراف
              </p>
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
                {(["Active", "Pending", "Rejected"] as const).map(ms => {
                  const cfg = MODERATION_CONFIG[ms];
                  const isActive = pendingModeration === ms;
                  return (
                    <button
                      key={ms}
                      onClick={() => handleModerationApply(ms)}
                      disabled={actionLoading || isActive}
                      style={{
                        padding: "0.4rem 0.9rem", borderRadius: 20,
                        border: `1.5px solid ${isActive ? cfg.border : "#e2e8f0"}`,
                        backgroundColor: isActive ? cfg.bg : "#f8fafc",
                        color: isActive ? cfg.color : "#64748b",
                        fontSize: "0.82rem", fontWeight: 700,
                        cursor: actionLoading || isActive ? "default" : "pointer",
                        fontFamily: "inherit",
                        transition: "all 0.15s",
                      }}
                    >
                      {cfg.label}
                    </button>
                  );
                })}
                {moderSuccess && (
                  <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600, alignSelf: "center" }}>✓ تم</span>
                )}
              </div>
            </div>
          )}

          {/* Divider */}
          {!confirmDelete && <div style={{ height: 1, backgroundColor: "#f1f5f9", marginBottom: "1rem" }} />}

          {/* Status change */}
          {!confirmDelete && (
            <div style={{ marginBottom: "1rem" }}>
              <p style={{ fontSize: "0.78rem", fontWeight: 700, color: "#64748b", margin: "0 0 0.5rem" }}>
                تغيير حالة العقار
              </p>
              <div style={{ display: "flex", gap: "0.6rem", alignItems: "center", flexWrap: "wrap" }}>
                <select
                  value={pendingStatus}
                  onChange={e => { setPendingStatus(e.target.value); setStatusSuccess(false); }}
                  style={{
                    padding: "0.45rem 0.75rem", borderRadius: 8,
                    border: "1px solid #e2e8f0", fontSize: "0.85rem",
                    fontFamily: "inherit", color: "#0f172a", backgroundColor: "#f8fafc",
                    cursor: "pointer",
                  }}
                >
                  {STATUSES.map(s => (
                    <option key={s} value={s}>{PROPERTY_STATUS_LABELS[s]}</option>
                  ))}
                </select>
                <button
                  onClick={handleStatusApply}
                  disabled={actionLoading || pendingStatus === property.status}
                  style={{
                    padding: "0.45rem 1.1rem", borderRadius: 8,
                    border: "none", cursor: actionLoading || pendingStatus === property.status ? "not-allowed" : "pointer",
                    backgroundColor: pendingStatus !== property.status ? "var(--color-primary)" : "#e2e8f0",
                    color: pendingStatus !== property.status ? "#fff" : "#94a3b8",
                    fontSize: "0.85rem", fontWeight: 700, fontFamily: "inherit",
                    transition: "all 0.15s",
                  }}
                >
                  {actionLoading ? "جارٍ الحفظ..." : "تطبيق"}
                </button>
                {statusSuccess && (
                  <span style={{ fontSize: "0.82rem", color: "#16a34a", fontWeight: 600 }}>✓ تم التحديث</span>
                )}
              </div>
            </div>
          )}

          {/* Error */}
          {localError && (
            <div style={{
              backgroundColor: "#fef2f2", border: "1px solid #fecaca",
              borderRadius: 8, padding: "0.6rem 0.85rem", marginBottom: "0.75rem",
              fontSize: "0.83rem", color: "#dc2626",
            }}>
              {localError}
            </div>
          )}

          {/* Delete or confirm */}
          {!confirmDelete ? (
            <button
              onClick={() => setConfirmDelete(true)}
              disabled={actionLoading}
              style={{
                padding: "0.5rem 1.25rem", borderRadius: 8,
                border: "1.5px solid #fecaca", backgroundColor: "#fef2f2",
                color: "#dc2626", fontSize: "0.85rem", fontWeight: 700,
                cursor: "pointer", fontFamily: "inherit",
              }}
            >
              🗑 حذف العقار
            </button>
          ) : (
            <div style={{
              backgroundColor: "#fef2f2", border: "1.5px solid #fecaca",
              borderRadius: 12, padding: "1rem",
            }}>
              <p style={{ margin: "0 0 0.75rem", fontSize: "0.88rem", color: "#dc2626", fontWeight: 700 }}>
                ⚠ هل أنت متأكد من حذف هذا العقار؟
              </p>
              <p style={{ margin: "0 0 1rem", fontSize: "0.82rem", color: "#7f1d1d" }}>
                سيتم حذف <strong>{property.title}</strong> نهائياً ولا يمكن التراجع عن هذا الإجراء.
              </p>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={actionLoading}
                  style={{
                    padding: "0.5rem 1.25rem", borderRadius: 8,
                    border: "none", backgroundColor: "#dc2626",
                    color: "#fff", fontSize: "0.85rem", fontWeight: 700,
                    cursor: actionLoading ? "not-allowed" : "pointer", fontFamily: "inherit",
                  }}
                >
                  {actionLoading ? "جارٍ الحذف..." : "تأكيد الحذف"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  disabled={actionLoading}
                  style={{
                    padding: "0.5rem 1.1rem", borderRadius: 8,
                    border: "1px solid #e2e8f0", backgroundColor: "#fff",
                    color: "#475569", fontSize: "0.85rem", fontWeight: 600,
                    cursor: "pointer", fontFamily: "inherit",
                  }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
