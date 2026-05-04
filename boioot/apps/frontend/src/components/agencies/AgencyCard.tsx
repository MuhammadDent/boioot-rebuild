"use client";

import Link from "next/link";

export interface AgencyListItem {
  id:           string;
  fullName:     string;
  role:         string;
  roleLabel:    string;
  city:         string | null;
  bio:          string | null;
  logoUrl:      string | null;
  isVerified:   boolean;
  isFeatured:   boolean;
  listingCount: number;
}

interface Props {
  agency: AgencyListItem;
}

export default function AgencyCard({ agency }: Props) {
  const initial = agency.fullName.trim()[0] ?? "؟";

  return (
    <article
      style={{
        background:    "#fff",
        border:        `1.5px solid ${agency.isFeatured ? "#0f766e" : "#e2e8f0"}`,
        borderRadius:  "14px",
        padding:       "1.5rem",
        display:       "flex",
        flexDirection: "column",
        gap:           "1rem",
        position:      "relative",
        boxShadow:     agency.isFeatured
          ? "0 4px 24px rgba(15,118,110,0.10)"
          : "0 1px 6px rgba(0,0,0,0.05)",
        transition:    "box-shadow 0.2s, border-color 0.2s",
      }}
    >
      {/* Featured badge */}
      {agency.isFeatured && (
        <span style={{
          position:     "absolute",
          top:          "0.75rem",
          left:         "0.75rem",
          background:   "#0f766e",
          color:        "#fff",
          fontSize:     "0.7rem",
          fontWeight:   700,
          padding:      "0.2rem 0.6rem",
          borderRadius: "999px",
        }}>
          مميز ⭐
        </span>
      )}

      {/* Logo + name */}
      <div style={{ display: "flex", alignItems: "center", gap: "0.85rem" }}>
        <div style={{
          width:         60,
          height:        60,
          borderRadius:  "12px",
          overflow:      "hidden",
          flexShrink:    0,
          background:    "var(--color-primary-light, #e8f5e9)",
          display:       "flex",
          alignItems:    "center",
          justifyContent:"center",
          border:        "1.5px solid #e2e8f0",
        }}>
          {agency.logoUrl ? (
            <img
              src={agency.logoUrl}
              alt={agency.fullName}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          ) : (
            <span style={{
              fontSize:   "1.5rem",
              fontWeight: 700,
              color:      "var(--color-primary, #0f766e)",
            }}>
              {initial}
            </span>
          )}
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin:       0,
            fontSize:     "1rem",
            fontWeight:   700,
            color:        "#0f172a",
            whiteSpace:   "nowrap",
            overflow:     "hidden",
            textOverflow: "ellipsis",
          }}>
            {agency.fullName}
          </h3>

          <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", marginTop: "0.2rem", flexWrap: "wrap" }}>
            <span style={{
              fontSize:     "0.75rem",
              padding:      "0.15rem 0.55rem",
              borderRadius: "999px",
              background:   agency.role === "Broker" ? "#eff6ff" : "#f0fdf4",
              color:        agency.role === "Broker" ? "#1d4ed8"  : "#15803d",
              fontWeight:   600,
            }}>
              {agency.roleLabel}
            </span>

            {agency.isVerified && (
              <span style={{
                fontSize:     "0.75rem",
                padding:      "0.15rem 0.55rem",
                borderRadius: "999px",
                background:   "#fefce8",
                color:        "#92400e",
                fontWeight:   600,
              }}>
                ✓ موثق
              </span>
            )}
          </div>
        </div>
      </div>

      {/* City + listings */}
      <div style={{ display: "flex", gap: "1rem", fontSize: "0.82rem", color: "#64748b" }}>
        {agency.city && (
          <span>📍 {agency.city}</span>
        )}
        <span>🏠 {agency.listingCount} إعلان</span>
      </div>

      {/* Bio */}
      {agency.bio && (
        <p style={{
          margin:        0,
          fontSize:      "0.85rem",
          color:         "#475569",
          lineHeight:    1.6,
          display:       "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical" as const,
          overflow:      "hidden",
        }}>
          {agency.bio}
        </p>
      )}

      {/* Actions */}
      <div style={{ display: "flex", gap: "0.5rem", marginTop: "auto" }}>
        <Link
          href={`/agencies/${agency.id}`}
          style={{
            flex:           1,
            textAlign:      "center",
            padding:        "0.5rem",
            background:     "var(--color-primary, #0f766e)",
            color:          "#fff",
            borderRadius:   "8px",
            textDecoration: "none",
            fontSize:       "0.85rem",
            fontWeight:     600,
          }}
        >
          عرض الملف
        </Link>

        <Link
          href={`/dashboard/messages?userId=${agency.id}`}
          style={{
            flex:           1,
            textAlign:      "center",
            padding:        "0.5rem",
            background:     "#f1f5f9",
            color:          "#0f172a",
            borderRadius:   "8px",
            textDecoration: "none",
            fontSize:       "0.85rem",
            fontWeight:     600,
          }}
        >
          مراسلة
        </Link>
      </div>
    </article>
  );
}
