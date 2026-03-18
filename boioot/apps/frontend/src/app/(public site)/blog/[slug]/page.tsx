"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { publicBlogApi } from "@/features/public/blog-api";
import { normalizeError } from "@/lib/api";
import type { PublicBlogPostDetail } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

export default function BlogPostPage({ params }: Props) {
  const { slug } = use(params);
  const [post,    setPost]    = useState<PublicBlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  useEffect(() => {
    setLoading(true); setError("");
    publicBlogApi.getPost(slug)
      .then(setPost)
      .catch(e => setError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return (
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "3rem 1.25rem" }}>
        <div style={{ height: 32, background: "#f0f0f0", borderRadius: 6, marginBottom: "1rem", width: "60%" }} />
        <div style={{ height: 320, background: "#f0f0f0", borderRadius: 12, marginBottom: "1.5rem" }} />
        <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {[1,2,3,4,5].map(i => (
            <div key={i} style={{ height: 14, background: "#f0f0f0", borderRadius: 6, width: i % 2 === 0 ? "80%" : "100%" }} />
          ))}
        </div>
      </div>
    );
  }

  if (error || !post) {
    return (
      <div style={{ maxWidth: 780, margin: "0 auto", padding: "3rem 1.25rem", textAlign: "center" }}>
        <p style={{ fontSize: "1.1rem", color: "var(--color-text-secondary)", marginBottom: "1rem" }}>
          {error || "لم يتم العثور على المقال"}
        </p>
        <Link href="/blog" style={{ color: "var(--color-primary)", textDecoration: "none", fontSize: "0.9rem" }}>
          ← العودة إلى المدونة
        </Link>
      </div>
    );
  }

  return (
    <article style={{ maxWidth: 780, margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

      {/* ── Breadcrumb ── */}
      <nav style={{ marginBottom: "1.5rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
        <Link href="/" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>الرئيسية</Link>
        <span style={{ margin: "0 0.4rem" }}>←</span>
        <Link href="/blog" style={{ color: "var(--color-text-secondary)", textDecoration: "none" }}>المدونة</Link>
        <span style={{ margin: "0 0.4rem" }}>←</span>
        <span style={{ color: "var(--color-text-primary)" }}>{post.title}</span>
      </nav>

      {/* ── Categories ── */}
      {post.categories.length > 0 && (
        <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {post.categories.map(c => (
            <Link
              key={c.id}
              href={`/blog?category=${c.slug}`}
              style={{
                fontSize: "0.78rem", padding: "0.2rem 0.65rem",
                background: "#e8f5e9", color: "var(--color-primary)",
                borderRadius: 20, textDecoration: "none", fontWeight: 500,
              }}
            >
              {c.name}
            </Link>
          ))}
        </div>
      )}

      {/* ── Title ── */}
      <h1 style={{ margin: "0 0 1rem", fontSize: "clamp(1.5rem, 4vw, 2rem)", fontWeight: 800, lineHeight: 1.35 }}>
        {post.isFeatured && <span style={{ marginLeft: "0.4rem" }}>⭐</span>}
        {post.title}
      </h1>

      {/* ── Meta ── */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "center", flexWrap: "wrap", marginBottom: "1.5rem", fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
        {post.publishedAt && (
          <span>
            {new Date(post.publishedAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })}
          </span>
        )}
        {post.readTimeMinutes && (
          <span>· {post.readTimeMinutes} دقائق قراءة</span>
        )}
        <span>· {post.viewCount} مشاهدة</span>
      </div>

      {/* ── Cover image ── */}
      {post.coverImageUrl && (
        <img
          src={post.coverImageUrl}
          alt={post.title}
          style={{
            width: "100%", borderRadius: 12, marginBottom: "2rem",
            maxHeight: 420, objectFit: "cover",
          }}
          onError={e => (e.currentTarget.style.display = "none")}
        />
      )}

      {/* ── Excerpt ── */}
      {post.excerpt && (
        <p style={{
          margin: "0 0 1.5rem",
          padding: "1rem 1.25rem",
          borderRight: "4px solid var(--color-primary)",
          background: "#f1f8f1",
          borderRadius: "0 8px 8px 0",
          fontStyle: "italic",
          fontSize: "1.05rem",
          lineHeight: 1.7,
          color: "var(--color-text-secondary)",
        }}>
          {post.excerpt}
        </p>
      )}

      {/* ── Content ── */}
      <div style={{
        fontSize: "1rem",
        lineHeight: 1.85,
        color: "var(--color-text-primary)",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
      }}>
        {post.content}
      </div>

      {/* ── Footer ── */}
      <div style={{
        marginTop: "3rem",
        paddingTop: "1.5rem",
        borderTop: "1px solid var(--color-border, #e5e7eb)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        flexWrap: "wrap",
        gap: "0.75rem",
      }}>
        <Link
          href="/blog"
          style={{
            color: "var(--color-primary)", textDecoration: "none",
            fontSize: "0.9rem", fontWeight: 500,
            display: "flex", alignItems: "center", gap: "0.4rem",
          }}
        >
          ← العودة إلى المدونة
        </Link>
        <p style={{ margin: 0, fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
          آخر تحديث: {new Date(post.createdAt).toLocaleDateString("ar-SY", { year: "numeric", month: "long", day: "numeric" })}
        </p>
      </div>
    </article>
  );
}
