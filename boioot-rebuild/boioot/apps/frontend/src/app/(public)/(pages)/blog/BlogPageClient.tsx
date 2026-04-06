"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { publicBlogApi } from "@/features/public/blog-api";
import { normalizeError } from "@/lib/api";
import type { PublicBlogPostSummary, PublicBlogCategory } from "@/types";

const PAGE_SIZE = 10;

interface Props {
  initialCategory: string | null;
  categories: PublicBlogCategory[];
}

// ── helpers ─────────────────────────────────────────────────────────────────

function buildUrl(category: string | null, page: number): string {
  const qs = new URLSearchParams();
  if (category) qs.set("category", category);
  if (page > 1)  qs.set("page", String(page));
  const q = qs.toString();
  return `/blog${q ? "?" + q : ""}`;
}

// ── sub-components ──────────────────────────────────────────────────────────

function PostCard({ post }: { post: PublicBlogPostSummary }) {
  return (
    <Link href={`/blog/${post.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
      <article
        style={{
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
        {post.coverImageUrl ? (
          <img
            src={post.coverImageUrl}
            alt={post.coverImageAlt ?? post.title}
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
              <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
            </svg>
          </div>
        )}

        <div style={{ padding: "1rem 1.1rem", flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem" }}>
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
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}>
              {post.excerpt}
            </p>
          )}

          <div style={{
            display: "flex", gap: "0.75rem", alignItems: "center",
            fontSize: "0.78rem", color: "var(--color-text-secondary)",
            marginTop: "auto", paddingTop: "0.5rem",
          }}>
            {post.publishedAt && (
              <span>
                {new Date(post.publishedAt).toLocaleDateString("ar-SY", {
                  year: "numeric", month: "short", day: "numeric",
                })}
              </span>
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

function PostSkeleton() {
  return (
    <div style={{ borderRadius: 12, overflow: "hidden", border: "1px solid var(--color-border, #e5e7eb)" }}>
      <div style={{ height: 200, background: "#f0f0f0" }} />
      <div style={{ padding: "1rem" }}>
        <div style={{ height: 16, background: "#f0f0f0", borderRadius: 6, marginBottom: "0.5rem" }} />
        <div style={{ height: 12, background: "#f0f0f0", borderRadius: 6, width: "70%" }} />
      </div>
    </div>
  );
}

// ── main component ───────────────────────────────────────────────────────────

export default function BlogPageClient({ categories }: Props) {
  const router      = useRouter();
  const searchParams = useSearchParams();

  // URL is the single source of truth for both category and page
  const activeSlug   = searchParams.get("category");
  const currentPage  = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  const [posts,      setPosts]      = useState<PublicBlogPostSummary[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState("");
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    publicBlogApi
      .getPosts({ page: currentPage, pageSize: PAGE_SIZE, categorySlug: activeSlug ?? undefined })
      .then(r => {
        if (controller.signal.aborted) return;
        setPosts(r.items);
        setTotalPages(r.totalPages);
        setTotalCount(r.totalCount);
      })
      .catch(e => {
        if (controller.signal.aborted) return;
        setError(normalizeError(e));
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [activeSlug, currentPage]);

  function selectCategory(slug: string | null) {
    router.replace(buildUrl(slug, 1), { scroll: false });
  }

  function selectPage(newPage: number) {
    router.replace(buildUrl(activeSlug, newPage), { scroll: true });
  }

  // ── render ─────────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: "var(--max-width, 1200px)", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>

      {/* ── header ── */}
      <div style={{ marginBottom: "2rem" }}>
        <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.8rem", fontWeight: 800 }}>المدونة</h1>
        <p style={{ margin: 0, color: "var(--color-text-secondary)", fontSize: "0.95rem" }}>
          {totalCount > 0 ? `${totalCount} مقال` : "مقالات عقارية ومفيدة"}
        </p>
      </div>

      {/* ── category filter tabs ── */}
      {categories.length > 0 && (
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.75rem" }}>
          <CategoryTab
            label="الكل"
            active={!activeSlug}
            onClick={() => selectCategory(null)}
          />
          {categories.map(cat => (
            <CategoryTab
              key={cat.id}
              label={`${cat.name} (${cat.postCount})`}
              active={activeSlug === cat.slug}
              onClick={() => selectCategory(cat.slug)}
            />
          ))}
        </div>
      )}

      {/* ── error ── */}
      {error && (
        <div style={{
          background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error, #dc2626)",
          padding: "1rem", borderRadius: 10, marginBottom: "1.5rem",
        }}>
          {error}
        </div>
      )}

      {/* ── posts grid ── */}
      {loading ? (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {Array.from({ length: PAGE_SIZE }).map((_, i) => <PostSkeleton key={i} />)}
        </div>
      ) : posts.length === 0 ? (
        <EmptyState activeSlug={activeSlug} onReset={() => selectCategory(null)} />
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
          {posts.map(post => <PostCard key={post.id} post={post} />)}
        </div>
      )}

      {/* ── pagination ── */}
      {totalPages > 1 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPage={selectPage}
          activeSlug={activeSlug}
        />
      )}
    </div>
  );
}

// ── small presentational components ─────────────────────────────────────────

function CategoryTab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      style={{
        padding: "0.4rem 1rem", borderRadius: 20, fontSize: "0.85rem", cursor: "pointer",
        border: `1.5px solid ${active ? "var(--color-primary)" : "var(--color-border, #e5e7eb)"}`,
        background: active ? "var(--color-primary)" : "transparent",
        color: active ? "#fff" : "var(--color-text-secondary)",
        fontWeight: active ? 700 : 400,
        transition: "all 0.15s",
      }}
    >
      {label}
    </button>
  );
}

function EmptyState({ activeSlug, onReset }: { activeSlug: string | null; onReset: () => void }) {
  return (
    <div style={{ textAlign: "center", padding: "4rem 1rem", color: "var(--color-text-secondary)" }}>
      <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"
        style={{ opacity: 0.3, marginBottom: "1rem" }}>
        <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
      </svg>
      <p style={{ fontSize: "1.1rem", margin: "0 0 0.5rem" }}>لا توجد مقالات بعد</p>
      {activeSlug && (
        <button
          onClick={onReset}
          style={{ color: "var(--color-primary)", background: "none", border: "none", cursor: "pointer", fontSize: "0.9rem" }}
        >
          عرض جميع المقالات
        </button>
      )}
    </div>
  );
}

function Pagination({
  currentPage, totalPages, onPage, activeSlug,
}: {
  currentPage: number;
  totalPages: number;
  onPage: (p: number) => void;
  activeSlug: string | null;
}) {
  const pages = buildPageNumbers(currentPage, totalPages);

  return (
    <nav
      aria-label="التنقل بين صفحات المدونة"
      style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: "0.4rem", marginTop: "2.5rem", flexWrap: "wrap" }}
    >
      {/* prev */}
      <PaginationBtn
        href={buildUrl(activeSlug, currentPage - 1)}
        disabled={currentPage <= 1}
        onClick={() => onPage(currentPage - 1)}
        label="السابق"
        arrow="right"
      />

      {/* page numbers */}
      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`ellipsis-${i}`} style={{ padding: "0 0.35rem", color: "var(--color-text-secondary)", userSelect: "none" }}>
            …
          </span>
        ) : (
          <a
            key={p}
            href={buildUrl(activeSlug, p as number)}
            onClick={e => { e.preventDefault(); onPage(p as number); }}
            aria-current={p === currentPage ? "page" : undefined}
            style={{
              minWidth: 38, height: 38, display: "flex", alignItems: "center", justifyContent: "center",
              borderRadius: 8, fontSize: "0.9rem", textDecoration: "none",
              border: `1.5px solid ${p === currentPage ? "var(--color-primary)" : "var(--color-border, #e5e7eb)"}`,
              background: p === currentPage ? "var(--color-primary)" : "#fff",
              color: p === currentPage ? "#fff" : "inherit",
              fontWeight: p === currentPage ? 700 : 400,
              transition: "all 0.15s",
            }}
          >
            {p}
          </a>
        )
      )}

      {/* next */}
      <PaginationBtn
        href={buildUrl(activeSlug, currentPage + 1)}
        disabled={currentPage >= totalPages}
        onClick={() => onPage(currentPage + 1)}
        label="التالي"
        arrow="left"
      />
    </nav>
  );
}

function PaginationBtn({
  href, disabled, onClick, label, arrow,
}: {
  href: string; disabled: boolean; onClick: () => void; label: string; arrow: "left" | "right";
}) {
  const style: React.CSSProperties = {
    padding: "0.45rem 1rem", borderRadius: 8, fontSize: "0.88rem",
    border: "1.5px solid var(--color-border, #e5e7eb)",
    background: disabled ? "var(--color-bg-secondary, #f9fafb)" : "#fff",
    color: disabled ? "var(--color-text-secondary)" : "inherit",
    opacity: disabled ? 0.55 : 1,
    cursor: disabled ? "default" : "pointer",
    display: "flex", alignItems: "center", gap: "0.3rem",
    textDecoration: "none",
    transition: "all 0.15s",
  };
  const chevron = arrow === "right"
    ? <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M9 18l6-6-6-6"/></svg>
    : <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>;

  if (disabled) {
    return <span style={style}>{arrow === "right" && chevron}{label}{arrow === "left" && chevron}</span>;
  }
  return (
    <a href={href} onClick={e => { e.preventDefault(); onClick(); }} style={style}>
      {arrow === "right" && chevron}{label}{arrow === "left" && chevron}
    </a>
  );
}

/** Returns page numbers with "…" gaps for large page counts */
function buildPageNumbers(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages: (number | "…")[] = [1];
  if (current > 3)  pages.push("…");

  const start = Math.max(2, current - 1);
  const end   = Math.min(total - 1, current + 1);
  for (let i = start; i <= end; i++) pages.push(i);

  if (current < total - 2) pages.push("…");
  pages.push(total);
  return pages;
}
