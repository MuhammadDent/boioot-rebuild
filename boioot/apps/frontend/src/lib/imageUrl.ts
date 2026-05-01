const BROKEN_PREFIX  = "https://assets.boioot.net/";
const WORKING_PREFIX = "https://pub-4b43b8a4b24b4a4fb244f2148c5c6495.r2.dev/";

/**
 * Rewrites image URLs that use the broken custom domain (assets.boioot.net,
 * which has no DNS record) to the always-working Cloudflare r2.dev URL.
 *
 * This mirrors the backend ImageUrlHelper.Normalize — required in the frontend
 * until the production backend is redeployed with the server-side fix.
 */
export function normalizeImageUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith(BROKEN_PREFIX)) {
    return WORKING_PREFIX + url.slice(BROKEN_PREFIX.length);
  }
  return url;
}
