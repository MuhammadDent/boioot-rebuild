"use client";

import { useState, useEffect, use } from "react";
import Link from "next/link";
import { publicBlogApi } from "@/features/public/blog-api";
import { normalizeError } from "@/lib/api";
import type { PublicBlogPostDetail, PublicBlogPostSummary } from "@/types";

interface Props {
  params: Promise<{ slug: string }>;
}

function formatDateAr(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ar-SY", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── Related article card ───────────────────────────────────────────────────────

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
      {/* Cover image */}
      {post.coverImageUrl ? (
        <img
          src={post.coverImageUrl}
          alt={post.coverImageAlt ?? post.title}
          style={{ width: "100%", height: 160, objectFit: "cover", display: "block" }}
          onError={e => (e.currentTarget.style.display = "none")}
        />
      ) : (
        <div style={{
          height: 160, background: "linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "2.5rem",
        }}>
          📝
        </div>
      )}

      {/* Card body */}
      <div style={{ padding: "1rem", display: "flex", flexDirection: "column", flex: 1, gap: "0.4rem" }}>
        {/* Category badge */}
        {category && (
          <span style={{
            fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.6rem",
            background: "#e8f5e9", color: "var(--color-primary)",
            borderRadius: 20, display: "inline-block", alignSelf: "flex-start",
          }}>
            {category.name}
          </span>
        )}

        {/* Title */}
        <h3 style={{
          margin: 0, fontSize: "0.95rem", fontWeight: 700,
          lineHeight: 1.4, color: "var(--color-text-primary)",
          display: "-webkit-box", WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical", overflow: "hidden",
        }}>
          {post.title}
        </h3>

        {/* Excerpt */}
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

        {/* Meta */}
        <div style={{
          marginTop: "auto", paddingTop: "0.5rem",
          display: "flex", gap: "0.75rem", alignItems: "center",
          fontSize: "0.75rem", color: "var(--color-text-secondary)",
          borderTop: "1px solid var(--color-border, #f0f0f0)",
        }}>
          {post.publishedAt && (
            <span>{formatDateAr(post.publishedAt)}</span>
          )}
          {post.readTimeMinutes && (
            <span>· {post.readTimeMinutes} دق</span>
          )}
        </div>
      </div>
    </Link>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function BlogPostPage({ params }: Props) {
  const { slug } = use(params);

  const [post,    setPost]    = useState<PublicBlogPostDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState("");

  const [related,        setRelated]        = useState<PublicBlogPostSummary[]>([]);
  const [relatedLoading, setRelatedLoading] = useState(false);

  // Load post
  useEffect(() => {
    setLoading(true); setError(""); setPost(null); setRelated([]);
    publicBlogApi.getPost(slug)
      .then(setPost)
      .catch(e => setError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [slug]);

  // Load related posts after main post is loaded
  useEffect(() => {
    if (!post) return;
    setRelatedLoading(true);
    publicBlogApi.getRelatedPosts(slug, 3)
      .then(setRelated)
      .catch(() => setRelated([]))
      .finally(() => setRelatedLoading(false));
  }, [post, slug]);

  // SEO: update document title + meta description when post is loaded
  useEffect(() => {
    if (!post) return;
    const prevTitle = document.title;
    document.title = post.seoTitle || `${post.title} | بيوت`;

    let metaDesc = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const prevDesc = metaDesc?.content ?? "";
    if (!metaDesc) {
      metaDesc = document.createElement("meta");
      metaDesc.name = "description";
      document.head.appendChild(metaDesc);
    }
    metaDesc.content = post.seoDescription || post.excerpt || "";

    return () => {
      document.title = prevTitle;
      if (metaDesc) metaDesc.content = prevDesc;
    };
  }, [post]);

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
    <div style={{ background: "var(--color-background)", minHeight: "100vh", padding: "2rem 0 4rem" }}>
      <article style={{ maxWidth: 780, margin: "0 auto", padding: "0 1.25rem" }}>

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
        <div style={{
          display: "flex", gap: "1rem", alignItems: "center",
          flexWrap: "wrap", marginBottom: "1.5rem",
          fontSize: "0.85rem", color: "var(--color-text-secondary)",
        }}>
          {post.publishedAt && (
            <span>{formatDateAr(post.publishedAt)}</span>
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
            alt={post.coverImageAlt ?? post.title}
            style={{
              width: "100%", borderRadius: 12, marginBottom: "2rem",
              maxHeight: 420, objectFit: "cover", display: "block",
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

        {/* ── Content (HTML from TipTap) ── */}
        <div
          className="blog-content"
          dangerouslySetInnerHTML={{ __html: post.content ?? "" }}
          style={{
            fontSize: "1rem",
            lineHeight: 1.9,
            color: "var(--color-text-primary)",
            wordBreak: "break-word",
          }}
        />

        {/* ── Tags ── */}
        {post.tags.length > 0 && (
          <div style={{
            marginTop: "2.5rem", display: "flex", gap: "0.4rem",
            flexWrap: "wrap", alignItems: "center",
          }}>
            <span style={{ fontSize: "0.82rem", color: "var(--color-text-secondary)", marginLeft: "0.25rem" }}>
              الكلمات المفتاحية:
            </span>
            {post.tags.map(tag => (
              <span key={tag} style={{
                fontSize: "0.78rem", padding: "0.2rem 0.65rem",
                background: "#f3f4f6", color: "var(--color-text-secondary)",
                borderRadius: 20,
              }}>
                #{tag}
              </span>
            ))}
          </div>
        )}

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
            آخر تحديث: {formatDateAr(post.createdAt)}
          </p>
        </div>

      </article>

      {/* ── Related articles ── */}
      {(related.length > 0 || relatedLoading) && (
        <section style={{
          maxWidth: 1100, margin: "4rem auto 0", padding: "0 1.25rem",
        }}>
          <h2 style={{
            fontSize: "1.25rem", fontWeight: 800,
            color: "var(--color-text-primary)",
            marginBottom: "1.5rem",
            borderRight: "4px solid var(--color-primary)",
            paddingRight: "0.75rem",
          }}>
            اقرأ أيضًا
          </h2>

          {relatedLoading ? (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}>
              {[1,2,3].map(i => (
                <div key={i} style={{
                  background: "#f9f9f9", borderRadius: 12,
                  height: 280, animation: "pulse 1.5s infinite",
                }} />
              ))}
            </div>
          ) : (
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))",
              gap: "1.25rem",
            }}>
              {related.map(r => (
                <RelatedCard key={r.id} post={r} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
