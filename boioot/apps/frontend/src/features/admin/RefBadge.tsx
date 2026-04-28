"use client";

import React from "react";

const BADGE_STYLE: React.CSSProperties = {
  display: "inline-block",
  fontFamily: "monospace",
  fontSize: "0.72rem",
  fontWeight: 700,
  background: "#eff6ff",
  color: "#1d4ed8",
  borderRadius: 6,
  padding: "2px 8px",
  whiteSpace: "nowrap",
  cursor: "copy",
  userSelect: "all",
  letterSpacing: "0.02em",
};

const EMPTY_STYLE: React.CSSProperties = {
  color: "#94a3b8",
  fontSize: "0.82rem",
};

interface RefBadgeProps {
  value?: string | null;
  onClick?: (e: React.MouseEvent) => void;
}

export function RefBadge({ value, onClick }: RefBadgeProps) {
  if (!value) return <span style={EMPTY_STYLE}>—</span>;

  function handleClick(e: React.MouseEvent) {
    e.stopPropagation();
    navigator.clipboard.writeText(value!);
    onClick?.(e);
  }

  return (
    <span
      style={BADGE_STYLE}
      title="انقر للنسخ"
      onClick={handleClick}
    >
      {value}
    </span>
  );
}
