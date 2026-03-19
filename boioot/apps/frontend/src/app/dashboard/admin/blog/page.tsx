"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { AdminPagination } from "@/features/admin/components/AdminPagination";
import { BlogStatusBadge } from "@/features/admin/blog/BlogStatusBadge";
import { blogAdminApi } from "@/features/admin/blog-api";
import { normalizeError } from "@/lib/api";
import { BLOG_POST_PAGE_SIZE, BLOG_STATUS_LABELS } from "@/features/admin/constants";
import type { BlogPostSummaryResponse, BlogCategoryResponse, PagedResult } from "@/types";

// ── Styles ────────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: "0.6rem 0.75rem", textAlign: "start", fontWeight: 600,
  fontSize: "0.82rem", color: "var(--color-text-secondary)",
  borderBottom: "1px solid var(--color-border, #e5e7eb)", whiteSpace: "nowrap",
};

const tdStyle: React.CSSProperties = {
  padding: "0.7rem 0.75rem", fontSize: "0.88rem", verticalAlign: "middle",
  borderBottom: "1px solid var(--color-border, #e5e7eb)",
};

// ── Page ─────────────────────────────────────────────────────────────────────

export default function AdminBlogPage() {
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "blog.view" });

  const [result,     setResult]     = useState<PagedResult<BlogPostSummaryResponse> | null>(null);
  const [categories, setCategories] = useState<BlogCategoryResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");

  // Filters
  const [search,     setSearch]     = useState("");
  const [status,     setStatus]     = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [page,       setPage]       = useState(1);

  // Row actions
  const [actionError,   setActionError]   = useState("");
  const [actioning,     setActioning]     = useState<string | null>(null); // postId being acted on

  const load = useCallback(async () => {
    setLoading(true); setFetchError("");
    try {
      const [posts, cats] = await Promise.all([
        blogAdminApi.getPosts({
          page, pageSize: BLOG_POST_PAGE_SIZE,
          search: search || undefined,
          status: status || undefined,
          categoryId: categoryId || undefined,
          sortBy: "createdAt", sortDir: "desc",
        }),
        categories.length === 0 ? blogAdminApi.getCategories() : Promise.resolve(categories),
      ]);
      setResult(posts);
      if (categories.length === 0) setCategories(cats);
    } catch (e) {
      setFetchError(normalizeError(e));
    } finally {
      setLoading(false);
    }
  }, [page, search, status, categoryId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!authLoading) load();
  }, [authLoading, load]);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    load();
  }

  function resetFilters() {
    setSearch(""); setStatus(""); setCategoryId(""); setPage(1);
  }

  // ── Row actions ─────────────────────────────────────────────────────────

  async function handleAction(
    id: string,
    action: "publish" | "unpublish" | "archive" | "delete"
  ) {
    const confirmMessages: Record<string, string> = {
      archive: "هل تريد أرشفة هذا المقال؟",
      delete:  "هل أنت متأكد من حذف هذا المقال نهائياً؟",
    };
    if (confirmMessages[action] && !confirm(confirmMessages[action])) return;

    setActioning(id); setActionError("");
    try {
      if (action === "publish")   await blogAdminApi.publishPost(id);
      if (action === "unpublish") await blogAdminApi.unpublishPost(id);
      if (action === "archive")   await blogAdminApi.archivePost(id);
      if (action === "delete")    await blogAdminApi.deletePost(id);
      await load();
    } catch (e) {
      setActionError(normalizeError(e));
    } finally {
      setActioning(null);
    }
  }

  const items = result?.items ?? [];
  const totalPages = result?.totalPages ?? 1;

  return (
    <div className="dash-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      <DashboardBackLink href="/dashboard" label="→ لوحة التحكم" />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "0.75rem", marginBottom: "1.25rem" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700 }}>إدارة المدونة</h1>
          <p style={{ margin: "0.25rem 0 0", color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
            {result ? `${result.totalCount} مقال إجمالاً` : ""}
          </p>
        </div>
        <Link href="/dashboard/admin/blog/posts/new" className="btn btn-primary" style={{ textDecoration: "none" }}>
          + مقال جديد
        </Link>
      </div>

      <InlineBanner message={fetchError} />
      {actionError && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem", fontSize: "0.9rem" }}>
          {actionError}
        </div>
      )}

      {/* ── Filters ── */}
      <form onSubmit={handleSearch} style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="بحث بالعنوان..."
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8, border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.9rem", minWidth: 200, flex: 1 }}
        />
        <select
          value={status}
          onChange={e => { setStatus(e.target.value); setPage(1); }}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8, border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.9rem", cursor: "pointer" }}
        >
          <option value="">جميع الحالات</option>
          {Object.entries(BLOG_STATUS_LABELS).map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={categoryId}
          onChange={e => { setCategoryId(e.target.value); setPage(1); }}
          style={{ padding: "0.5rem 0.75rem", borderRadius: 8, border: "1.5px solid var(--color-border, #e5e7eb)", fontSize: "0.9rem", cursor: "pointer" }}
        >
          <option value="">جميع التصنيفات</option>
          {categories.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
        <button type="submit" className="btn btn-primary" style={{ padding: "0.5rem 1rem" }}>بحث</button>
        {(search || status || categoryId) && (
          <button type="button" className="btn" onClick={resetFilters} style={{ padding: "0.5rem 1rem" }}>إعادة تعيين</button>
        )}
        <Link href="/dashboard/admin/blog/categories" className="btn" style={{ padding: "0.5rem 1rem", textDecoration: "none" }}>
          إدارة التصنيفات
        </Link>
      </form>

      {/* ── Table ── */}
      {loading ? (
        <p style={{ color: "var(--color-text-secondary)", textAlign: "center", padding: "3rem 0" }}>جاري التحميل...</p>
      ) : items.length === 0 ? (
        <div style={{ textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)" }}>
          <p style={{ fontSize: "1.1rem", marginBottom: "0.5rem" }}>لا توجد مقالات</p>
          <p style={{ fontSize: "0.9rem" }}>
            <Link href="/dashboard/admin/blog/posts/new" style={{ color: "var(--color-primary)" }}>أنشئ مقالك الأول</Link>
          </p>
        </div>
      ) : (
        <div style={{ overflowX: "auto", borderRadius: 10, border: "1px solid var(--color-border, #e5e7eb)" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 700 }}>
            <thead style={{ background: "var(--color-bg-secondary, #f9fafb)" }}>
              <tr>
                <th style={thStyle}>العنوان</th>
                <th style={thStyle}>الحالة</th>
                <th style={thStyle}>التصنيفات</th>
                <th style={thStyle}>مميز</th>
                <th style={thStyle}>تاريخ النشر</th>
                <th style={thStyle}>تاريخ التعديل</th>
                <th style={thStyle}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {items.map(post => {
                const busy = actioning === post.id;
                return (
                  <tr key={post.id} style={{ background: "var(--color-bg)" }}>
                    <td style={{ ...tdStyle, maxWidth: 260 }}>
                      <Link
                        href={`/dashboard/admin/blog/posts/${post.id}`}
                        style={{ fontWeight: 600, color: "var(--color-primary)", textDecoration: "none", fontSize: "0.9rem" }}
                      >
                        {post.title}
                      </Link>
                      <p style={{ margin: "0.15rem 0 0", fontSize: "0.75rem", color: "var(--color-text-secondary)", fontFamily: "monospace" }}>
                        {post.slug}
                      </p>
                    </td>
                    <td style={tdStyle}>
                      <BlogStatusBadge status={post.status} />
                    </td>
                    <td style={{ ...tdStyle, maxWidth: 160 }}>
                      {post.categories.length === 0 ? (
                        <span style={{ color: "var(--color-text-secondary)", fontSize: "0.8rem" }}>—</span>
                      ) : (
                        <span style={{ fontSize: "0.82rem" }}>{post.categories.map(c => c.name).join("، ")}</span>
                      )}
                    </td>
                    <td style={{ ...tdStyle, textAlign: "center" }}>
                      {post.isFeatured ? "⭐" : "—"}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString("ar-SY") : "—"}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap", fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                      {new Date(post.updatedAt).toLocaleDateString("ar-SY")}
                    </td>
                    <td style={{ ...tdStyle, whiteSpace: "nowrap" }}>
                      <div style={{ display: "flex", gap: "0.3rem", flexWrap: "wrap" }}>
                        <Link
                          href={`/dashboard/admin/blog/posts/${post.id}`}
                          className="btn"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", textDecoration: "none" }}
                        >
                          تعديل
                        </Link>
                        {post.status === "Draft" && (
                          <button
                            className="btn"
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", color: "#2e7d32", borderColor: "#2e7d32" }}
                            onClick={() => handleAction(post.id, "publish")}
                            disabled={busy}
                          >
                            {busy ? "..." : "نشر"}
                          </button>
                        )}
                        {post.status === "Published" && (
                          <button
                            className="btn"
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem" }}
                            onClick={() => handleAction(post.id, "unpublish")}
                            disabled={busy}
                          >
                            {busy ? "..." : "إلغاء نشر"}
                          </button>
                        )}
                        {(post.status === "Draft" || post.status === "Published") && (
                          <button
                            className="btn"
                            style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", color: "#f57f17", borderColor: "#f57f17" }}
                            onClick={() => handleAction(post.id, "archive")}
                            disabled={busy}
                          >
                            {busy ? "..." : "أرشفة"}
                          </button>
                        )}
                        <button
                          className="btn"
                          style={{ padding: "0.25rem 0.6rem", fontSize: "0.78rem", color: "var(--color-error)", borderColor: "var(--color-error)" }}
                          onClick={() => handleAction(post.id, "delete")}
                          disabled={busy}
                        >
                          {busy ? "..." : "حذف"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <AdminPagination
          page={page}
          totalPages={totalPages}
          onPrev={() => setPage(p => p - 1)}
          onNext={() => setPage(p => p + 1)}
        />
      )}
    </div>
  );
}
