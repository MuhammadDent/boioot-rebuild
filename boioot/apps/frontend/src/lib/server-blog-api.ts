import type { PublicBlogPostDetail, BlogSeoSettingsDto } from "@/types";

const BACKEND = process.env.BACKEND_URL ?? "http://localhost:5233";

export async function serverGetBlogPost(
  slug: string
): Promise<PublicBlogPostDetail | null> {
  try {
    const url = new URL(`/api/blog/posts/${slug}`, BACKEND);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return null;
    return (await res.json()) as PublicBlogPostDetail;
  } catch {
    return null;
  }
}

export async function serverGetBlogSeoSettings(): Promise<BlogSeoSettingsDto> {
  const fallback: BlogSeoSettingsDto = {
    siteName: "بيوت",
    defaultPostSeoTitleTemplate: "{PostTitle} | {SiteName}",
    defaultPostSeoDescriptionTemplate: "{Excerpt}",
    defaultBlogListSeoTitle: "المدونة | بيوت",
    defaultBlogListSeoDescription: "تصفح أحدث المقالات والأخبار العقارية من بيوت سوريا",
    defaultOgTitleTemplate: "{PostTitle} | {SiteName}",
    defaultOgDescriptionTemplate: "{Excerpt}",
  };
  try {
    const url = new URL("/api/blog/seo-settings", BACKEND);
    const res = await fetch(url.toString(), { cache: "no-store" });
    if (!res.ok) return fallback;
    return (await res.json()) as BlogSeoSettingsDto;
  } catch {
    return fallback;
  }
}
