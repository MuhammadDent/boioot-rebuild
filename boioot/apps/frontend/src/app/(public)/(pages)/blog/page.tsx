import { Suspense } from "react";
import type { Metadata } from "next";
import { serverGetBlogCategories, serverGetBlogSeoSettings } from "@/lib/server-blog-api";
import BlogPageClient from "./BlogPageClient";

interface Props {
  searchParams: Promise<{ category?: string }>;
}

export async function generateMetadata(): Promise<Metadata> {
  const seo = await serverGetBlogSeoSettings();
  const title = seo.defaultBlogListSeoTitle || "المدونة | بيوت";
  const description = seo.defaultBlogListSeoDescription || "تصفح أحدث المقالات والأخبار العقارية";
  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: "/blog",
    },
    twitter: {
      card: "summary",
      title,
      description,
    },
  };
}

function BlogSkeleton() {
  return (
    <div style={{ maxWidth: "var(--max-width, 1200px)", margin: "0 auto", padding: "2rem 1.25rem 4rem" }}>
      <div style={{ marginBottom: "2rem" }}>
        <div style={{ height: 32, width: 120, background: "#f0f0f0", borderRadius: 8, marginBottom: "0.5rem" }} />
        <div style={{ height: 16, width: 80, background: "#f0f0f0", borderRadius: 6 }} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.25rem" }}>
        {[1, 2, 3, 4, 5, 6].map(i => (
          <div key={i} style={{ borderRadius: 12, overflow: "hidden", border: "1px solid #e5e7eb" }}>
            <div style={{ height: 200, background: "#f0f0f0" }} />
            <div style={{ padding: "1rem" }}>
              <div style={{ height: 16, background: "#f0f0f0", borderRadius: 6, marginBottom: "0.5rem" }} />
              <div style={{ height: 12, background: "#f0f0f0", borderRadius: 6, width: "70%" }} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default async function BlogPage({ searchParams }: Props) {
  const { category } = await searchParams;
  const categories = await serverGetBlogCategories();

  return (
    <Suspense fallback={<BlogSkeleton />}>
      <BlogPageClient
        initialCategory={category ?? null}
        categories={categories}
      />
    </Suspense>
  );
}
