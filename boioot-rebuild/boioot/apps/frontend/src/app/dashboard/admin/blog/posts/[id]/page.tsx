"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { InlineBanner } from "@/components/dashboard/InlineBanner";
import { BlogPostForm } from "@/features/admin/blog/BlogPostForm";
import { BlogStatusBadge } from "@/features/admin/blog/BlogStatusBadge";
import { blogAdminApi } from "@/features/admin/blog-api";
import { normalizeError } from "@/lib/api";
import type { BlogPostDetailResponse, BlogCategoryResponse } from "@/types";

interface Props {
  params: Promise<{ id: string }>;
}

export default function AdminBlogEditPostPage({ params }: Props) {
  const { id } = use(params);
  const { isLoading: authLoading } = useProtectedRoute({ requiredPermission: "blog.edit" });
  const router = useRouter();

  const [post,       setPost]       = useState<BlogPostDetailResponse | null>(null);
  const [categories, setCategories] = useState<BlogCategoryResponse[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [fetchError, setFetchError] = useState("");

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);
    Promise.all([
      blogAdminApi.getPost(id),
      blogAdminApi.getCategories(),
    ])
      .then(([p, cats]) => { setPost(p); setCategories(cats); })
      .catch(e => setFetchError(normalizeError(e)))
      .finally(() => setLoading(false));
  }, [authLoading, id]);

  if (authLoading || loading) {
    return (
      <div className="dash-container" style={{ paddingTop: "2rem" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>جاري التحميل...</p>
      </div>
    );
  }

  if (fetchError) {
    return (
      <div className="dash-container" style={{ paddingTop: "2rem" }}>
        <DashboardBackLink href="/dashboard/admin/blog" label="→ قائمة المقالات" />
        <InlineBanner message={fetchError} />
      </div>
    );
  }

  if (!post) return null;

  return (
    <div className="dash-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      <DashboardBackLink href="/dashboard/admin/blog" label="→ قائمة المقالات" marginBottom="0.75rem" />

      <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700 }}>تعديل المقال</h1>
        <BlogStatusBadge status={post.status} />
      </div>

      <BlogPostForm
        postId={post.id}
        initialData={post}
        categories={categories}
        onSaved={setPost}
        onDeleted={() => router.replace("/dashboard/admin/blog")}
      />
    </div>
  );
}
