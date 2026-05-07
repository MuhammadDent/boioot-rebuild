"use client";

import { useState, useEffect, useCallback } from "react";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { normalizeError } from "@/lib/api";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { matchingApi, type BuyerRequestLead } from "@/features/matching/api";
import Link from "next/link";

const PROPERTY_TYPE_AR: Record<string, string> = {
  Apartment: "شقة سكنية",
  Villa:     "فيلا",
  Office:    "مكتب",
  Shop:      "محل تجاري",
  Land:      "أرض",
  Building:  "بناء كامل",
};

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  Open:   { label: "مفتوح",  bg: "#f0fdf4", color: "#15803d", border: "#bbf7d0" },
  Closed: { label: "مغلق",   bg: "#fef2f2", color: "#b91c1c", border: "#fecaca" },
};

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? { label: status, bg: "#f8fafc", color: "#475569", border: "#e2e8f0" };
  return (
    <span style={{
      display: "inline-block",
      padding: "2px 10px",
      borderRadius: 20,
      fontSize: "0.72rem",
      fontWeight: 600,
      background: cfg.bg,
      color:      cfg.color,
      border:     `1px solid ${cfg.border}`,
    }}>
      {cfg.label}
    </span>
  );
}

function LeadCard({ lead }: { lead: BuyerRequestLead }) {
  const ptLabel = PROPERTY_TYPE_AR[lead.propertyType] ?? lead.propertyType;

  return (
    <div style={{
      background: "#fff",
      border: "1px solid #e2e8f0",
      borderRadius: 10,
      padding: "1rem 1.25rem",
      display: "flex",
      flexDirection: "column",
      gap: "0.5rem",
      transition: "box-shadow 0.15s",
    }}>
      {/* Title row */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "0.75rem" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 700, fontSize: "0.95rem", color: "#111827", lineHeight: 1.3 }}>
            {lead.title}
          </p>
          {lead.referenceNumber && (
            <p style={{ margin: "2px 0 0", fontSize: "0.72rem", color: "#9ca3af" }}>
              #{lead.referenceNumber}
            </p>
          )}
        </div>
        <StatusBadge status={lead.status} />
      </div>

      {/* Meta row */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem 1.25rem", fontSize: "0.82rem", color: "#475569" }}>

        {/* Location */}
        {(lead.city || lead.neighborhood) && (
          <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
              <circle cx="12" cy="9" r="2.5"/>
            </svg>
            {[lead.city, lead.neighborhood].filter(Boolean).join(" — ")}
          </span>
        )}

        {/* Property type */}
        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
            <polyline points="9 22 9 12 15 12 15 22"/>
          </svg>
          {ptLabel}
        </span>

        {/* Date */}
        <span style={{ display: "flex", alignItems: "center", gap: 4, marginRight: "auto" }}>
          <svg width={13} height={13} viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
            <line x1="16" y1="2" x2="16" y2="6"/>
            <line x1="8"  y1="2" x2="8"  y2="6"/>
            <line x1="3"  y1="10" x2="21" y2="10"/>
          </svg>
          {formatDate(lead.createdAt)}
        </span>
      </div>
    </div>
  );
}

export default function LeadsPage() {
  const { user, isLoading } = useProtectedRoute();

  const [leads,      setLeads]     = useState<BuyerRequestLead[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [fetching,   setFetching]  = useState(true);
  const [fetchError, setFetchError] = useState("");
  const [filter,     setFilter]    = useState<"all" | "Open" | "Closed">("all");

  const load = useCallback(async () => {
    setFetching(true);
    setFetchError("");
    try {
      const data = await matchingApi.getMyLeads();
      setLeads(data.leads ?? []);
      setTotalCount(data.totalCount ?? 0);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setFetching(false);
    }
  }, []);

  useEffect(() => {
    if (!isLoading && user) load();
  }, [isLoading, user, load]);

  if (isLoading || !user) return null;

  const filtered = filter === "all" ? leads : leads.filter(l => l.status === filter);

  return (
    <div dir="rtl" style={{ minHeight: "100vh", backgroundColor: "#f8fafc" }}>

      {/* Header */}
      <div style={{
        backgroundColor: "#fff",
        borderBottom: "1px solid #e2e8f0",
        padding: "1rem 1.5rem",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "1rem",
        flexWrap: "wrap",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <circle cx="12" cy="12" r="4"/>
            <line x1="21.17" y1="8" x2="12" y2="8"/>
            <line x1="3.95"  y1="6.06" x2="8.54" y2="14"/>
            <line x1="10.88" y1="21.94" x2="15.46" y2="14"/>
          </svg>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.1rem", fontWeight: 700, color: "#111827" }}>
              الطلبات المطابقة
            </h1>
            <p style={{ margin: 0, fontSize: "0.78rem", color: "#6b7280" }}>
              طلبات الباحثين في المناطق التي تغطيها
            </p>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          {/* Free professional access badge */}
          <span style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.3rem",
            padding: "3px 10px",
            borderRadius: 20,
            fontSize: "0.72rem",
            fontWeight: 700,
            background: "#f0fdf4",
            color: "#15803d",
            border: "1px solid #bbf7d0",
          }}>
            <svg width={11} height={11} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"/>
            </svg>
            مجاني للمحترفين
          </span>
          <span style={{
            fontSize: "0.78rem",
            background: "#eff6ff",
            color: "#1d4ed8",
            border: "1px solid #bfdbfe",
            borderRadius: 12,
            padding: "3px 10px",
            fontWeight: 600,
          }}>
            {totalCount} طلب
          </span>
        </div>
      </div>

      <div style={{ maxWidth: 820, margin: "0 auto", padding: "1.25rem 1rem" }}>

        {fetchError && <div style={{ marginBottom: "1rem" }}><InlineBanner type="error" message={fetchError} /></div>}

        {/* Info banner — shown only when there are leads */}
        {!fetching && leads.length > 0 && (
          <div style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "0.6rem",
            padding: "0.75rem 1rem",
            borderRadius: 10,
            background: "#f0fdf4",
            border: "1px solid #bbf7d0",
            marginBottom: "1.25rem",
            fontSize: "0.83rem",
            color: "#15803d",
          }}>
            <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#15803d" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, marginTop: 1 }}>
              <circle cx="12" cy="12" r="10"/>
              <line x1="12" y1="8" x2="12" y2="12"/>
              <line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              استقبال الطلبات المطابقة مجاني تماماً لجميع الوسطاء والمكاتب العقارية.
              لضبط مناطق التغطية وإعدادات الإشعارات،{" "}
              <Link href="/dashboard/matching/settings" style={{ color: "#15803d", fontWeight: 700 }}>
                اذهب إلى إعدادات المطابقة
              </Link>.
            </span>
          </div>
        )}

        {/* Filter tabs */}
        <div style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.25rem",
          background: "#fff",
          border: "1px solid #e2e8f0",
          borderRadius: 10,
          padding: "0.4rem",
        }}>
          {([["all", "الكل"], ["Open", "مفتوحة"], ["Closed", "مغلقة"]] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setFilter(val)}
              style={{
                flex: 1,
                padding: "0.45rem 0",
                borderRadius: 7,
                border: "none",
                fontWeight: filter === val ? 700 : 500,
                fontSize: "0.82rem",
                background: filter === val ? "#16a34a" : "transparent",
                color:      filter === val ? "#fff"    : "#6b7280",
                cursor: "pointer",
                transition: "all 0.15s",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Content */}
        {fetching ? (
          <div style={{ textAlign: "center", padding: "3rem", color: "#9ca3af", fontSize: "0.88rem" }}>
            جاري تحميل الطلبات المطابقة...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            background: "#fff",
            border: "1px solid #e2e8f0",
            borderRadius: 12,
            padding: "3rem",
            textAlign: "center",
          }}>
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🎯</div>
            <p style={{ fontWeight: 600, color: "#374151", margin: "0 0 0.4rem", fontSize: "1rem" }}>
              {leads.length === 0 ? "لا توجد طلبات مطابقة بعد" : "لا توجد نتائج لهذا الفلتر"}
            </p>
            <p style={{ color: "#9ca3af", margin: 0, fontSize: "0.85rem" }}>
              {leads.length === 0
                ? "تأكد من إضافة مناطق التغطية أولاً حتى يتمكن النظام من مطابقة الطلبات معك."
                : "جرب تغيير الفلتر لعرض نتائج مختلفة."}
            </p>
            {leads.length === 0 && (
              <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center", flexWrap: "wrap", marginTop: "1rem" }}>
                <Link
                  href="/dashboard/coverage"
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1.25rem",
                    borderRadius: 8,
                    background: "#16a34a",
                    color: "#fff",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                  }}
                >
                  إدارة مناطق التغطية
                </Link>
                <Link
                  href="/dashboard/matching/settings"
                  style={{
                    display: "inline-block",
                    padding: "0.5rem 1.25rem",
                    borderRadius: 8,
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    color: "#374151",
                    fontWeight: 600,
                    fontSize: "0.85rem",
                    textDecoration: "none",
                  }}
                >
                  إعدادات المطابقة
                </Link>
              </div>
            )}
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {filtered.map(lead => (
              <LeadCard key={lead.id} lead={lead} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
