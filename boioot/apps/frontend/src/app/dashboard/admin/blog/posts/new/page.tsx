"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useProtectedRoute } from "@/hooks/useProtectedRoute";
import { DashboardBackLink } from "@/components/dashboard/DashboardBackLink";
import { BlogPostForm } from "@/features/admin/blog/BlogPostForm";
import { blogAdminApi } from "@/features/admin/blog-api";
import { normalizeError } from "@/lib/api";
import type { BlogCategoryResponse, BlogPostDetailResponse } from "@/types";

export default function AdminBlogNewPostPage() {
  const { isLoading: authLoading } = useProtectedRoute({ allowedRoles: ["Admin"] });
  const router = useRouter();

  const [categories, setCategories] = useState<BlogCategoryResponse[]>([]);
  const [loadError,  setLoadError]  = useState("");

  useEffect(() => {
    if (authLoading) return;
    blogAdminApi.getCategories()
      .then(setCategories)
      .catch(e => setLoadError(normalizeError(e)));
  }, [authLoading]);

  function handleSaved(post: BlogPostDetailResponse) {
    // After first save redirect to edit page so the user can publish/manage
    router.replace(`/dashboard/admin/blog/posts/${post.id}`);
  }

  if (authLoading) {
    return (
      <div className="dash-container" style={{ paddingTop: "2rem" }}>
        <p style={{ color: "var(--color-text-secondary)" }}>جاري التحميل...</p>
      </div>
    );
  }

  return (
    <div className="dash-container" style={{ paddingTop: "1.5rem", paddingBottom: "3rem" }}>
      <DashboardBackLink href="/dashboard/admin/blog" label="→ قائمة المقالات" marginBottom="0.75rem" />
      <h1 style={{ margin: "0 0 1.5rem", fontSize: "1.4rem", fontWeight: 700 }}>إنشاء مقال جديد</h1>

      {loadError && (
        <div style={{ background: "var(--color-error-bg, #fef2f2)", color: "var(--color-error)", padding: "0.75rem 1rem", borderRadius: 8, marginBottom: "1rem" }}>
          {loadError}
        </div>
      )}

      <BlogPostForm
        categories={categories}
        onSaved={handleSaved}
      />
    </div>
  );
}
