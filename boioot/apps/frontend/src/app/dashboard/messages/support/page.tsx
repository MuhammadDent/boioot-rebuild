"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { messagingApi } from "@/features/dashboard/messages/api";
import { normalizeError } from "@/lib/api";

export default function SupportConversationPage() {
  const { user, isLoading } = useProtectedRoute();
  const router = useRouter();
  const [error, setError] = useState("");

  useEffect(() => {
    if (isLoading || !user) return;

    messagingApi
      .getOrCreateSupportConversation()
      .then((conv) => {
        router.replace(`/dashboard/messages/${conv.id}`);
      })
      .catch((e) => {
        setError(normalizeError(e));
      });
  }, [isLoading, user, router]);

  if (error) {
    return (
      <div
        style={{
          minHeight: "60vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          fontFamily: "var(--font-arabic)",
        }}
      >
        <p style={{ color: "#dc2626", fontSize: "0.95rem" }}>{error}</p>
        <button
          onClick={() => router.push("/dashboard/messages")}
          style={{
            padding: "0.5rem 1.25rem",
            background: "var(--color-primary)",
            color: "#fff",
            border: "none",
            borderRadius: 8,
            fontFamily: "var(--font-arabic)",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          العودة إلى الرسائل
        </button>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "60vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "0.75rem",
        fontFamily: "var(--font-arabic)",
        color: "var(--color-text-secondary)",
      }}
    >
      <svg
        width="32"
        height="32"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        style={{ animation: "spin 1s linear infinite", opacity: 0.5 }}
      >
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
      </svg>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
      <p style={{ margin: 0, fontSize: "0.9rem" }}>جارٍ فتح محادثة الدعم الفني…</p>
    </div>
  );
}
