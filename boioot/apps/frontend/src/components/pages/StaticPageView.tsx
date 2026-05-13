"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { staticPagesApi } from "@/features/pages/api";
import type { StaticPagePublic } from "@/features/pages/types";

interface Props { slug: string; }

export default function StaticPageView({ slug }: Props) {
  const [page,      setPage]      = useState<StaticPagePublic | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [notFound,  setNotFound]  = useState(false);

  useEffect(() => {
    staticPagesApi.getBySlug(slug)
      .then(setPage)
      .catch((e: Error & { status?: number }) => {
        if (e.status === 404 || e.message === "not_found") setNotFound(true);
      })
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem" }}>
        <div style={{ height: 32, width: "50%", background: "#f0f0f0", borderRadius: 8, marginBottom: "1.5rem" }} />
        {[1,2,3,4].map(i => (
          <div key={i} style={{ height: 14, width: i === 4 ? "70%" : "100%", background: "#f0f0f0", borderRadius: 6, marginBottom: "0.75rem" }} />
        ))}
      </div>
    );
  }

  if (notFound || !page) {
    return (
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "4rem 1.5rem", textAlign: "center" }}>
        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>🔍</div>
        <h1 style={{ fontSize: "1.5rem", fontWeight: 800, color: "var(--color-text-primary)", marginBottom: "0.75rem" }}>
          الصفحة غير موجودة
        </h1>
        <p style={{ color: "var(--color-text-secondary)", marginBottom: "2rem" }}>
          هذه الصفحة غير متاحة حالياً أو أن الرابط خاطئ.
        </p>
        <Link href="/" style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem",
          padding: "0.65rem 1.5rem", borderRadius: "var(--radius-md)",
          background: "var(--color-primary)", color: "#fff",
          fontWeight: 700, textDecoration: "none", fontSize: "0.95rem",
        }}>
          العودة للرئيسية
        </Link>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: "3rem 1.5rem" }}>
      <Link
        href="/"
        style={{
          display: "inline-flex", alignItems: "center", gap: "0.4rem",
          color: "var(--color-text-muted)", fontSize: "0.85rem",
          textDecoration: "none", marginBottom: "2rem",
        }}
      >
        ← الرئيسية
      </Link>

      <h1 style={{
        fontSize: "2rem", fontWeight: 900,
        color: "var(--color-text-primary)",
        marginBottom: "0.75rem", lineHeight: 1.3,
      }}>
        {page.titleAr}
      </h1>

      {page.metaDescriptionAr && (
        <p style={{
          fontSize: "1rem", color: "var(--color-text-secondary)",
          marginBottom: "2rem", lineHeight: 1.7,
        }}>
          {page.metaDescriptionAr}
        </p>
      )}

      <hr style={{ border: "none", borderTop: "1px solid var(--color-border)", marginBottom: "2rem" }} />

      {page.contentAr ? (
        <div
          style={{ lineHeight: 1.9, color: "var(--color-text-primary)", fontSize: "0.97rem" }}
          dangerouslySetInnerHTML={{ __html: page.contentAr }}
        />
      ) : (
        <p style={{ color: "var(--color-text-muted)", fontStyle: "italic" }}>
          هذه الصفحة قيد الإعداد.
        </p>
      )}
    </div>
  );
}
