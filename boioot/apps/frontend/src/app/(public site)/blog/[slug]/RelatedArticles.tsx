"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { publicBlogApi } from "@/features/public/blog-api";
import type { PublicBlogPostSummary } from "@/types";

function formatDateAr(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ar-SY", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function RelatedCard({ post }: { post: PublicBlogPostSummary }) {
  const category = post.categories[0] ?? null;
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{
        display: "flex",
        flexDirection: "column",
        textDecoration: "none",
        color: "inherit",
        background: "#fff",
        borderRadius: 12,
        overflow: "hidden",
        boxShadow: "0 1px 6px rgba(0,0,0,0.07)",
        transition: "box-shadow 0.2s, transform 0.2s",
        border: "1px solid var(--color-border, #e5e7eb)",
      }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 4px 18px rgba(0,0,0,0.13)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-2px)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLAnchorElement).style.boxShadow = "0 1px 6px rgba(0,0,0,0.07)";
        (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(0)";
      }}
    >
      {post.coverImageUrl ? (
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? post.title}
          style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
          onError={e => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div style={{
          height: 160,
          background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.5rem",
        }}>
          📝
        </div>
      )}

      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", flex: 1, gap: "0.4rem" }}>
        {category && (
          <span style={{
            fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.6rem",
            background: "#e8f5e9", color: "var(--color-primary)",
            borderRadius: 20, display: "inline-block", alignSelf: "flex-start",
          }}>
            {category.name}
          </span>
        )}

        <h3 style={{
          margin: 0, fontSize: "0.95rem", fontWeight: 700,
          lineHeight: 1.4, color: "var(--color-text-primary)",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {post.title}
        </h3>

        {post.excerpt && (
          <p style={{
            margin: 0, fontSize: "0.82rem", color: "var(--color-text-secondary)",
            lineHeight: 1.5,
            display: "-webkit-box", WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical", overflow: "hidden",
          }}>
            {post.excerpt}
          </p>
        )}

        <div style={{
          marginTop: "auto", paddingTop: "0.5rem",
          display: "flex", gap: "0.75rem", alignItems: "center",
          fontSize: "0.75rem", color: "var(--color-text-secondary)",
          borderTop: "1px solid var(--color-border, #f0f0f0)",
        }}>
          {post.publishedAt && <span>{formatDateAr(post.publishedAt)}</span>}
          {post.readTimeMinutes && <span>· {post.readTimeMinutes} دق</span>}
        </div>
      </div>
    </Link>
  );
}

interface Props {
  slug: string;
}

export default function RelatedArticles({ slug }: Props) {
  const [related, setRelated] = useState<PublicBlogPostSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    publicBlogApi
      .getRelatedPosts(slug, 3)
      .then(setRelated)
      .catch(() => setRelated([]))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <section style={{ maxWidth: 1100, margin: "4rem auto 0", padding: "0 1.25rem" }}>
        <h2 style={{
          fontSize: "1.25rem", fontWeight: 800,
          color: "var(--color-text-primary)",
          marginBottom: "1.5rem",
          borderRight: "4px solid var(--color-primary)",
          paddingRight: "0.75rem",
        }}>
          اقرأ أيضًا
        </h2>
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
          gap: "1.25rem",
        }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{
              background: "#f9f9f9", borderRadius: 12, height: 280,
            }} />
          ))}
        </div>
      </section>
    );
  }

  if (related.length === 0) return null;

  return (
    <section style={{ maxWidth: 1100, margin: "4rem auto 0", padding: "0 1.25rem" }}>
      <h2 style={{
        fontSize: "1.25rem", fontWeight: 800,
        color: "var(--color-text-primary)",
        marginBottom: "1.5rem",
        borderRight: "4px solid var(--color-primary)",
        paddingRight: "0.75rem",
      }}>
        اقرأ أيضًا
      </h2>
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
        gap: "1.25rem",
      }}>
        {related.map(r => (
          <RelatedCard key={r.id} post={r} />
        ))}
      </div>
    </section>
  );
}
