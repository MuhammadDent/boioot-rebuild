import type { PublicBlogPostDetail } from "@/types";

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
