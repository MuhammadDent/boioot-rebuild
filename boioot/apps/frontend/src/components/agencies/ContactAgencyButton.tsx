"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { messagingApi } from "@/features/dashboard/messages/api";
import { normalizeError } from "@/lib/api";

interface Props {
  agencyId:   string;
  agencyName: string;
  /** visual variant — "card" (compact) or "detail" (prominent) */
  variant?: "card" | "detail";
}

export default function ContactAgencyButton({
  agencyId,
  agencyName,
  variant = "card",
}: Props) {
  const { user, isAuthenticated } = useAuth();
  const router = useRouter();

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState("");

  const isSelf = isAuthenticated && user?.id === agencyId;

  async function handleContact() {
    setError("");

    if (!isAuthenticated) {
      const current = typeof window !== "undefined" ? window.location.pathname + window.location.search : "";
      router.push(`/login?redirect=${encodeURIComponent(current)}`);
      return;
    }

    if (isSelf) {
      setError("لا يمكنك مراسلة نفسك");
      return;
    }

    setLoading(true);
    try {
      const conv = await messagingApi.getOrCreateConversation({ recipientId: agencyId });
      router.push(`/dashboard/messages/${conv.id}`);
    } catch (e) {
      setError(normalizeError(e));
      setLoading(false);
    }
  }

  if (variant === "detail") {
    return (
      <div>
        <button
          onClick={handleContact}
          disabled={loading || isSelf}
          style={{
            padding:       "0.65rem 1.5rem",
            background:    loading || isSelf ? "#94a3b8" : "#0f766e",
            color:         "#fff",
            border:        "none",
            borderRadius:  10,
            fontWeight:    700,
            fontSize:      "0.92rem",
            cursor:        loading || isSelf ? "not-allowed" : "pointer",
            fontFamily:    "var(--font-arabic)",
            transition:    "background 0.15s",
          }}
        >
          {loading ? "جارٍ الفتح…" : "💬 مراسلة"}
        </button>
        {isSelf && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "#64748b" }}>
            هذا ملفك الشخصي
          </p>
        )}
        {error && (
          <p style={{ margin: "0.4rem 0 0", fontSize: "0.82rem", color: "#dc2626" }}>
            ⚠️ {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div style={{ flex: 1 }}>
      <button
        onClick={handleContact}
        disabled={loading || isSelf}
        style={{
          width:         "100%",
          padding:       "0.5rem",
          background:    loading || isSelf ? "#f1f5f9" : "#f1f5f9",
          color:         loading || isSelf ? "#94a3b8"  : "#0f172a",
          border:        "none",
          borderRadius:  "8px",
          fontSize:      "0.85rem",
          fontWeight:    600,
          cursor:        loading || isSelf ? "not-allowed" : "pointer",
          fontFamily:    "var(--font-arabic)",
          textAlign:     "center",
          transition:    "background 0.15s, color 0.15s",
        }}
        title={isSelf ? "هذا ملفك الشخصي" : `مراسلة ${agencyName}`}
      >
        {loading ? "جارٍ…" : "مراسلة"}
      </button>
      {error && (
        <p style={{ margin: "0.25rem 0 0", fontSize: "0.75rem", color: "#dc2626", textAlign: "center" }}>
          {error}
        </p>
      )}
    </div>
  );
}
