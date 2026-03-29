"use client";

import type {
  EnrichedRequest, IsolationState, DistributionEntry,
} from "./_types";
import { GROUP_BY_OPTIONS, GROUP_KEY_LABELS } from "./_types";
import { computeDistribution } from "./_helpers";

// ─── Palette for distribution bars ────────────────────────────────────────────
const GROUP_COLORS: Record<string, string> = {
  status:   "#3b82f6",
  city:     "#0ea5e9",
  district: "#8b5cf6",
  propType: "#f59e0b",
  rooms:    "#10b981",
  company:  "#f97316",
};

// ─── GroupBy selector ─────────────────────────────────────────────────────────
function GroupBySelector({
  groupBy, onChange,
}: {
  groupBy: string;
  onChange: (key: string) => void;
}) {
  return (
    <div style={{ marginBottom: "0.85rem" }}>
      <div style={{ fontSize: "0.72rem", fontWeight: 700, color: "#64748b", marginBottom: "0.45rem" }}>
        عرض التحليل حسب
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem" }}>
        {GROUP_BY_OPTIONS.map(opt => {
          const active = groupBy === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => onChange(opt.key)}
              style={{
                padding: "0.35rem 0.85rem", borderRadius: 20,
                fontSize: "0.78rem", fontWeight: 600,
                border: `1.5px solid ${active ? GROUP_COLORS[opt.key] : "#e2e8f0"}`,
                backgroundColor: active ? GROUP_COLORS[opt.key] : "#f8fafc",
                color: active ? "#fff" : "#64748b",
                cursor: "pointer", fontFamily: "inherit",
                transition: "all 0.15s",
              }}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Isolation chips ──────────────────────────────────────────────────────────
function IsolationChips({
  isolation, onRemove, onClearAll,
}: {
  isolation: IsolationState;
  onRemove: (key: string) => void;
  onClearAll: () => void;
}) {
  const entries = Object.entries(isolation);
  if (entries.length === 0) return null;

  return (
    <div style={{
      display: "flex", flexWrap: "wrap", gap: "0.4rem",
      alignItems: "center", marginBottom: "0.85rem",
      padding: "0.7rem 0.85rem",
      backgroundColor: "#eff6ff", borderRadius: 10,
      border: "1px solid #bfdbfe",
    }}>
      <span style={{ fontSize: "0.72rem", fontWeight: 700, color: "#1d4ed8" }}>التصفية التحليلية:</span>
      {entries.map(([key, value]) => (
        <span
          key={key}
          style={{
            display: "inline-flex", alignItems: "center", gap: "0.25rem",
            backgroundColor: "#1d4ed8", color: "#fff",
            borderRadius: 20, padding: "0.2rem 0.5rem 0.2rem 0.75rem",
            fontSize: "0.76rem", fontWeight: 600,
          }}
        >
          {GROUP_KEY_LABELS[key]}: {value}
          <button
            onClick={() => onRemove(key)}
            style={{
              background: "none", border: "none",
              color: "rgba(255,255,255,0.8)", cursor: "pointer",
              fontSize: "0.95rem", lineHeight: 1, padding: "0 0.1rem",
              fontFamily: "inherit",
            }}
          >
            ×
          </button>
        </span>
      ))}
      <button
        onClick={onClearAll}
        style={{
          marginRight: "auto",
          background: "none", border: "1px solid #93c5fd",
          color: "#1d4ed8", borderRadius: 8,
          padding: "0.2rem 0.6rem", fontSize: "0.74rem",
          fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
        }}
      >
        مسح التصفية التحليلية
      </button>
    </div>
  );
}

// ─── Single distribution bar row ──────────────────────────────────────────────
function DistributionRow({
  entry, total, color, isActive, onClick,
}: {
  entry: DistributionEntry;
  total: number;
  color: string;
  isActive: boolean;
  onClick: () => void;
}) {
  const pct = total > 0 ? Math.round((entry.count / total) * 100) : 0;

  return (
    <div
      onClick={onClick}
      title={isActive ? `إلغاء عزل "${entry.displayLabel}"` : `عزل "${entry.displayLabel}"`}
      style={{
        display: "flex", alignItems: "center", gap: "0.75rem",
        padding: "0.55rem 0.65rem", borderRadius: 8,
        marginBottom: "0.3rem",
        backgroundColor: isActive ? `${color}14` : "transparent",
        border: `1px solid ${isActive ? color : "transparent"}`,
        cursor: "pointer", transition: "all 0.15s",
      }}
      onMouseEnter={e => {
        if (!isActive) (e.currentTarget as HTMLDivElement).style.backgroundColor = "#f8fafc";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.backgroundColor = isActive ? `${color}14` : "transparent";
      }}
    >
      {/* Active indicator */}
      <div style={{
        width: 10, height: 10, borderRadius: "50%", flexShrink: 0,
        backgroundColor: isActive ? color : "transparent",
        border: `2px solid ${isActive ? color : "#e2e8f0"}`,
        transition: "all 0.15s",
      }} />

      {/* Label */}
      <span style={{
        fontSize: "0.82rem", fontWeight: isActive ? 700 : 500,
        color: isActive ? "#0f172a" : "#334155",
        minWidth: 90, maxWidth: 120,
        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>
        {entry.displayLabel}
      </span>

      {/* Bar */}
      <div style={{ flex: 1, height: 8, backgroundColor: "#f1f5f9", borderRadius: 4, overflow: "hidden" }}>
        <div style={{
          height: "100%", width: `${pct}%`,
          backgroundColor: isActive ? color : `${color}99`,
          borderRadius: 4, transition: "width 0.4s ease, background-color 0.15s",
          minWidth: entry.count > 0 ? 4 : 0,
        }} />
      </div>

      {/* Stats */}
      <span style={{
        fontSize: "0.75rem", color: "#64748b",
        whiteSpace: "nowrap", flexShrink: 0, minWidth: 60, textAlign: "left",
      }}>
        <strong style={{ color: "#0f172a" }}>{entry.count}</strong> · {pct}%
      </span>
    </div>
  );
}

// ─── Distribution widget ───────────────────────────────────────────────────────
function DistributionWidget({
  entries, total, color, isolation, groupBy, onRowClick,
}: {
  entries: DistributionEntry[];
  total: number;
  color: string;
  isolation: IsolationState;
  groupBy: string;
  onRowClick: (rawValue: string) => void;
}) {
  if (entries.length === 0) {
    return (
      <div style={{ padding: "1.5rem", textAlign: "center", color: "#94a3b8", fontSize: "0.85rem" }}>
        لا توجد بيانات كافية للتحليل
      </div>
    );
  }

  const activeValue = isolation[groupBy];

  return (
    <div>
      {entries.map(entry => (
        <DistributionRow
          key={entry.rawValue}
          entry={entry}
          total={total}
          color={color}
          isActive={activeValue === entry.rawValue}
          onClick={() => onRowClick(entry.rawValue)}
        />
      ))}
      <p style={{
        margin: "0.75rem 0 0", fontSize: "0.73rem", color: "#94a3b8",
        textAlign: "center", fontStyle: "italic",
      }}>
        اضغط على أي صف للتعمق في بياناته — اضغط مرة أخرى لإلغاء العزل
      </p>
    </div>
  );
}

// ─── Main AnalyticsSection export ────────────────────────────────────────────
export function AnalyticsSection({
  fullyFiltered,
  baseFilteredCount,
  groupBy,
  isolation,
  onGroupByChange,
  onIsolationRemove,
  onIsolationClearAll,
  onSegmentClick,
}: {
  fullyFiltered:       EnrichedRequest[];
  baseFilteredCount:   number;
  groupBy:             string;
  isolation:           IsolationState;
  onGroupByChange:     (key: string) => void;
  onIsolationRemove:   (key: string) => void;
  onIsolationClearAll: () => void;
  onSegmentClick:      (rawValue: string) => void;
}) {
  const entries = computeDistribution(fullyFiltered, groupBy);
  const color   = GROUP_COLORS[groupBy] ?? "#3b82f6";
  const hasIsolation = Object.keys(isolation).length > 0;

  return (
    <div style={{
      backgroundColor: "#fff", borderRadius: 14,
      border: "1px solid #e2e8f0",
      padding: "1.25rem",
      marginBottom: "1.5rem",
      boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    }}>

      {/* ── Header ── */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", marginBottom: "1rem", flexWrap: "wrap" }}>
        <span style={{ fontSize: "1rem" }}>📊</span>
        <h3 style={{ margin: 0, fontSize: "0.92rem", fontWeight: 800, color: "#0f172a" }}>
          التحليلات التفاعلية
        </h3>
        <span style={{
          marginRight: "auto",
          fontSize: "0.75rem",
          backgroundColor: hasIsolation ? "#eff6ff" : "#f1f5f9",
          color: hasIsolation ? "#1d4ed8" : "#64748b",
          borderRadius: 10, padding: "0.15rem 0.6rem",
          fontWeight: 600,
        }}>
          {hasIsolation
            ? `${fullyFiltered.length} من ${baseFilteredCount} طلب (معزول)`
            : `${fullyFiltered.length} طلب`}
        </span>
      </div>

      {/* ── GroupBy selector ── */}
      <GroupBySelector groupBy={groupBy} onChange={onGroupByChange} />

      {/* ── Isolation chips ── */}
      <IsolationChips
        isolation={isolation}
        onRemove={onIsolationRemove}
        onClearAll={onIsolationClearAll}
      />

      {/* ── Distribution ── */}
      <DistributionWidget
        entries={entries}
        total={fullyFiltered.length}
        color={color}
        isolation={isolation}
        groupBy={groupBy}
        onRowClick={onSegmentClick}
      />
    </div>
  );
}
