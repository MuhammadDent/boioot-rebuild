// Explicit route handler for GET /sitemap.xml (replaces app/sitemap.ts).
// Returns hand-built XML with Content-Type: application/xml; charset=utf-8.

// Canonical production origin — sitemap URLs must always be the HTTPS
// canonical domain regardless of which host serves the request.
const BASE_URL = "https://boioot.com";

// Server-side only: this route runs on the Next server, which reaches the
// .NET API directly (same pattern as layout.tsx / IntegrationHead.tsx).
const BACKEND_URL = process.env.BACKEND_URL ?? "http://localhost:8080";

// Bound the crawl: 50 per page (backend clamp) × 20 pages = up to 1000 URLs
// per section, well under the 50k-URL sitemap limit.
const PAGE_SIZE = 50;
const MAX_PAGES = 20;
const FETCH_TIMEOUT_MS = 10_000;

// Re-generate at most once per hour.
export const revalidate = 3600;

type Entry = {
  url: string;
  lastModified?: Date;
  changeFrequency?: string;
  priority?: number;
};

// Public, auth-free pages only. Deliberately excludes /login, /register,
// /dashboard, /admin, /api, /onboarding, /forgot-password and /post-ad.
const STATIC_PATHS: Array<{ path: string; changeFrequency: string; priority: number }> = [
  { path: "",                changeFrequency: "daily",   priority: 1.0 },
  { path: "/properties",     changeFrequency: "daily",   priority: 0.9 },
  { path: "/daily-rentals",  changeFrequency: "daily",   priority: 0.8 },
  { path: "/projects",       changeFrequency: "weekly",  priority: 0.7 },
  { path: "/agencies",       changeFrequency: "weekly",  priority: 0.7 },
  { path: "/requests",       changeFrequency: "daily",   priority: 0.6 },
  { path: "/blog",           changeFrequency: "weekly",  priority: 0.7 },
  { path: "/pricing",        changeFrequency: "monthly", priority: 0.5 },
  { path: "/faq",            changeFrequency: "monthly", priority: 0.5 },
  { path: "/about",          changeFrequency: "monthly", priority: 0.5 },
  { path: "/contact",        changeFrequency: "monthly", priority: 0.5 },
  { path: "/privacy-policy", changeFrequency: "yearly",  priority: 0.3 },
  { path: "/terms",          changeFrequency: "yearly",  priority: 0.3 },
  { path: "/usage-policy",   changeFrequency: "yearly",  priority: 0.3 },
];

function staticEntries(): Entry[] {
  return STATIC_PATHS.map(({ path, changeFrequency, priority }) => ({
    url: `${BASE_URL}${path}`,
    changeFrequency,
    priority,
  }));
}

function parseDate(value: unknown): Date | undefined {
  if (typeof value !== "string" || !value) return undefined;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/**
 * Fetches every page of a paginated backend endpoint ({ items, hasNext }).
 * Never throws: any network/HTTP/JSON failure returns what was collected so
 * far (possibly []), so the sitemap always degrades to static URLs.
 */
async function fetchAllPages(buildUrl: (page: number) => string): Promise<unknown[]> {
  const collected: unknown[] = [];
  try {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await fetch(buildUrl(page), {
        next: { revalidate },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
      if (!res.ok) break;
      const data: unknown = await res.json();
      const items =
        data && typeof data === "object" && Array.isArray((data as { items?: unknown }).items)
          ? ((data as { items: unknown[] }).items)
          : [];
      collected.push(...items);
      const hasNext =
        data && typeof data === "object" && (data as { hasNext?: unknown }).hasNext === true;
      if (!hasNext || items.length === 0) break;
    }
  } catch {
    // Swallow: sitemap must never surface errors/stack traces.
  }
  return collected;
}

/** Active + approved properties only (backend enforces Status=Available && ModerationStatus=Active). */
async function propertyEntries(): Promise<Entry[]> {
  const items = await fetchAllPages(
    (page) => `${BACKEND_URL}/api/properties?page=${page}&pageSize=${PAGE_SIZE}`,
  );
  const entries: Entry[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const p = item as { id?: unknown; updatedAt?: unknown; createdAt?: unknown };
    if (typeof p.id !== "string" || !p.id) continue;
    entries.push({
      url: `${BASE_URL}/properties/${encodeURIComponent(p.id)}`,
      lastModified: parseDate(p.updatedAt) ?? parseDate(p.createdAt),
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }
  return entries;
}

/** Published blog posts only (backend enforces Status=Published). */
async function blogEntries(): Promise<Entry[]> {
  const items = await fetchAllPages(
    (page) => `${BACKEND_URL}/api/blog/posts?page=${page}&pageSize=${PAGE_SIZE}`,
  );
  const entries: Entry[] = [];
  for (const item of items) {
    if (!item || typeof item !== "object") continue;
    const p = item as { slug?: unknown; updatedAt?: unknown; publishedAt?: unknown };
    if (typeof p.slug !== "string" || !p.slug) continue;
    entries.push({
      url: `${BASE_URL}/blog/${encodeURIComponent(p.slug)}`,
      lastModified: parseDate(p.updatedAt) ?? parseDate(p.publishedAt),
      changeFrequency: "monthly",
      priority: 0.6,
    });
  }
  return entries;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function buildXml(entries: Entry[]): string {
  const urls = entries
    .map((e) => {
      const parts = [`<loc>${escapeXml(e.url)}</loc>`];
      if (e.lastModified) parts.push(`<lastmod>${e.lastModified.toISOString()}</lastmod>`);
      if (e.changeFrequency) parts.push(`<changefreq>${e.changeFrequency}</changefreq>`);
      if (e.priority !== undefined) parts.push(`<priority>${e.priority}</priority>`);
      return `<url>${parts.join("")}</url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`;
}

export async function GET(): Promise<Response> {
  let entries: Entry[];
  try {
    const [properties, posts] = await Promise.all([propertyEntries(), blogEntries()]);
    entries = [...staticEntries(), ...properties, ...posts];
  } catch {
    // Absolute fallback: static public URLs at minimum, never a stack trace.
    entries = staticEntries();
  }
  return new Response(buildXml(entries), {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
