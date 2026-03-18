"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { publicBlogApi } from "@/features/public/blog-api";
import { normalizeError } from "@/lib/api";
import type { PublicBlogPostSummary, PublicBlogCategory } from "@/types";

const PAGE_SIZE = 12;

function PostCard({ post }: { post: PublicBlogPostSummary }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      style={{ textDecoration: "none", color: "inherit", display: "block" }}
    >
      <article style={{
        background: "var(--color-bg-card, #fff)",
        border: "1px solid var(--color-border, #e5e7eb)",
        borderRadius: 12,
        overflow: "hidden",
        transition: "box-shadow 0.2s, transform 0.2s",
        height: "100%",
        display: "flex",
        flexDirection: "column",
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 20px rgba(0,0,0,0.10)";
          (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)";
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLElement).style.boxShadow = "none";
          (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
        }}
      >
        {/* Cover image */}
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.title}
            style={{ width: "100%", height: 200, objectFit: "cover" }}
            onError={e => (e.currentTarget.style.display = "none")}
          />
        ) : (
          <div style={{
            width: "100%", height: 200,
            background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#2e7d32" strokeWidth="1.5">
              <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
            </svg>
          </div>
        )}

        {/* Content */}
        <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
          {/* Featured badge */}
          {post.isFeatured && (
            <span style={{
              display: "inline-block", fontSize: "0.72rem", fontWeight: 700,
              background: "#fff8e1", color: "#f57f17",
              padding: "0.15rem 0.5rem", borderRadius: 20, border: "1px solid #ffe082",
              alignSelf: "flex-start",
            }}>
              ⭐ مميز
            </span>
          )}

          {/* Categories */}
          {post.categories.length > 0 && (
            <div style={{ display: "flex", gap: "0.35rem", flexWrap: "wrap" }}>
              {post.categories.map(c => (
                <span key={c.id} style={{
                  fontSize: "0.72rem", padding: "0.1rem 0.5rem",
                  background: "#e8f5e9", color: "var(--color-primary)",
                  borderRadius: 20,
                }}>
                  {c.name}
                </span>
              ))}
            </div>
          )}

          <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, lineHeight: 1.4, flex: 1 }}>
            {post.title}
          </h2>

          {post.excerpt && (
            <p style={{
              margin: 0, fontSize: "0.85rem", color: "var(--color-text-secondary)",
              lineHeight: 1.6,
              display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
            }}>
              {post.excerpt}
            </p>
          )}

          {/* Footer meta */}
          <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "auto", paddingTop: "0.5rem" }}>
            {post.publishedAt && (
              <span>{new Date(post.publishedAt).toLocaleDateString("ar-SY", { year: "numeric", month: "short", day: "numeric" })}</span>
            )}
            {post.readTimeMinutes && (
              <span>· {post.readTimeMinutes} دقائق قراءة</span>
            )}
          </div>
        </div>
      </article>
    </Link>
  );
}

export default function BlogPage() {
  const [posts,      setPosts]      = useState<PublicBlogPostSummary[]>([]);
  const [categories, setCategories] = useState<PublicBlogCategory[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [page,       setPage]       = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [activeSlug, setActiveSlug] = useState<string | null>(null);

  useEffect(() => {
    publicBlogApi.getCategories()
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true); setError("");
    publicBlogApi
      .getPosts({ page, pageSize: PAGE_SIZE, categorySlug: activeSlug ?? undefined })
      .then(r => { setPosts(r.items); setTotalPages(r.totalPages); setTotalCount(r.totalCount); })
      .catch(e => setError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [page, activeSlug]);

  function selectCategory(slug: string | null) {
    setActiveSlug(slug);
    setPage(1);
  }

  return (
    <div style={{ maxWidth: "var(--max-width, 1200px)", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

      {/* ── Header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.8rem", fontWeight: 800 }}>المدونة</h1>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
          {totalCount > 0 ? `${totalCount} مقال` : "مقالات عقارية ومفيدة"}
        </p>
      </div>

      {/* ── Categories filter ── */}
      {categories.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
          <button
            onClick={() => selectCategory(null)}
            style={{
              padding: "0.4rem 1rem", borderRadius: 20, fontSize: "0.85rem", cursor: "pointer",
              border: "1.5px solid " + (activeSlug === null ? "var(--color-primary)" : "var(--color-border, #e5e7eb)"),
              background: activeSlug === null ? "var(--color-primary)" : "transparent",
              color: activeSlug === null ? "#fff" : "var(--color-text-secondary)",
              fontWeight: activeSlug === null ? 700 : 400,
            }}
          >
            الكل
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => selectCategory(cat.slug)}
              style={{
                padding: "0.4rem 1rem", borderRadius: 20, fontSize: "0.85rem", cursor: "pointer",
                border: "1.5px solid " + (activeSlug === cat.slug ? "var(--color-primary)" : "var(--color-border, #e5e7eb)"),
                background: activeSlug === cat.slug ? "var(--color-primary)" : "transparent",
                color: activeSlug === cat.slug ? "#fff" : "var(--color-text-secondary)",
                fontWeight: activeSlug === cat.slug ? 700 : 400,
              }}
            >
              {cat.name}
              <span style={{ fontSize: "0.72rem", marginRight: "0.35rem", opacity: 0.75 }}>({cat.postCount})</span>
            </button>
          ))}
        </div>
      )}

      {/* ── Error ── */}
      {error && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error)", padding: "1rem", borderRadius: 10, marginBottom: "1.5rem" }}>
          {error}
        </div>
      )}

      {/* ── Posts grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {[1,2,3,4,5,6].map(i => (
            <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border, #e5e7eb)" }}>
              <div style={{ height: 200, background: "#f0f0f0", animation: "pulse 1.5s infinite" }} />
              <div style={{ padding: "1rem" }}>
                <div style={{ height: 16, background: "#f0f0f0", borderRadius: 6, marginBottom: "0.5rem", animation: "pulse 1.5s infinite" }} />
                <div style={{ height: 12, background: "#f0f0f0", borderRadius: 6, width: "70%", animation: "pulse 1.5s infinite" }} />
              </div>
            </div>
          ))}
        </div>
      ) : posts.length === 0 ? (
        <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-text-secondary)" }}>
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" style={{ opacity: 0.3, marginBottom: "1rem" }}>
            <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
          <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>لا توجد مقالات بعد</p>
          {activeSlug && (
            <button onClick={() => selectCategory(null)} style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}>
              عرض جميع المقالات
            </button>
          )}
        </div>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {posts.map(post => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "0.75rem", marginTop: "2.5rem", alignItems: "center" }}>
          <button
            onClick={() => setPage(p => p - 1)}
            disabled={page <= 1}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: 8, cursor: page <= 1 ? "default" : "pointer",
              border: "1.5px solid var(--color-border, #e5e7eb)",
              background: page <= 1 ? "var(--color-bg-secondary, #f9fafb)" : "#fff",
              opacity: page <= 1 ? 0.5 : 1,
            }}
          >
            السابق
          </button>
          <span style={{ fontSize: "0.9rem", color: "var(--color-text-secondary)" }}>
            صفحة {page} من {totalPages}
          </span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= totalPages}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: 8, cursor: page >= totalPages ? "default" : "pointer",
              border: "1.5px solid var(--color-border, #e5e7eb)",
              background: page >= totalPages ? "var(--color-bg-secondary, #f9fafb)" : "#fff",
              opacity: page >= totalPages ? 0.5 : 1,
            }}
          >
            التالي
          </button>
        </div>
      )}
    </div>
  );
}
