import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { serverGetBlogPost } from "@/lib/server-blog-api";
import RelatedArticles from "./RelatedArticles";

interface Props {
  params: Promise<{ slug: string }>;
}

// ── Server-side metadata ───────────────────────────────────────────────────────

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await serverGetBlogPost(slug);

  if (!post) {
    return {
      title: "مقال غير موجود | بيوت",
      description: "لم يتم العثور على هذا المقال.",
    };
  }

  const title = post.seoTitle || `${post.title} | بيوت`;
  const description = post.seoDescription || post.excerpt || "اقرأ المزيد في مدونة بيوت العقارية";

  return {
    title,
    description,
    openGraph: {
      title: post.seoTitle || post.title,
      description: post.seoDescription || post.excerpt || "",
      ...(post.coverImageUrl
        ? { images: [{ url: post.coverImageUrl, alt: post.coverImageAlt ?? post.title }] }
        : {}),
    },
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────────

function formatDateAr(iso: string | null | undefined): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("ar-SY", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ── Page (Server Component) ────────────────────────────────────────────────────

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await serverGetBlogPost(slug);

  if (!post) notFound();

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
          {post.publishedAt && <span>{formatDateAr(post.publishedAt)}</span>}
          {post.readTimeMinutes && <span>· {post.readTimeMinutes} دقائق قراءة</span>}
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

      {/* ── Related articles (Client Component) ── */}
      <RelatedArticles slug={slug} />
    </div>
  );
}
