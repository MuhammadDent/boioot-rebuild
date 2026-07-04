import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost", port: "*" },
    ],
    formats: ["image/avif", "image/webp"],
    minimumCacheTTL: 86400,
    deviceSizes: [360, 414, 640, 768, 1024, 1280, 1536],
    imageSizes: [72, 96, 160, 220, 320, 400],
  },
  allowedDevOrigins: [
    "*.janeway.replit.dev",
    "*.replit.dev",
    "*.repl.co",
  ],
  async rewrites() {
    const backend = process.env.BACKEND_URL ?? "http://localhost:8080";
    return [
      {
        source: "/api/:path*",
        destination: `${backend}/api/:path*`,
      },
      {
        source: "/videos/:path*",
        destination: `${backend}/videos/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${backend}/uploads/:path*`,
      },
      // SignalR: proxied identically to /api/* so the hub runs on the same
      // origin as the frontend (https://www.boioot.net/hubs/notifications).
      {
        source: "/hubs/:path*",
        destination: `${backend}/hubs/:path*`,
      },
    ];
  },
  async headers() {
    // ── Security headers (VA/PT: Missing Security Headers) ────────────────────
    // Applied to EVERY browser-facing response. The single Replit deployment
    // serves the public site with `next start` and rewrite-proxies /api,
    // /uploads, /videos and /hubs to the internal .NET API. Next.js does NOT
    // forward the API's own response headers through those rewrites, so without
    // a catch-all the browser would receive proxied responses with no security
    // headers at all. nosniff in particular matters for /api JSON and for
    // user-uploaded files served from /uploads.
    const isProd = process.env.NODE_ENV === "production";

    // CSP kept deliberately compatible with the app's existing behaviour:
    // Next.js needs inline + eval for hydration; third-party analytics pixels
    // (GA/GTM/Meta/TikTok/Snapchat), map CDNs and embeds load over https, so a
    // scheme source (https:) is used for script/style/frame instead of an
    // enumerated allowlist that would break when an admin enables a pixel.
    const contentSecurityPolicy = [
      "default-src 'self'",
      "base-uri 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data:",
      "style-src 'self' 'unsafe-inline' https:",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval' https:",
      "connect-src 'self' https: wss:",
      "frame-src 'self' https:",
    ].join("; ");

    const securityHeaders = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // geolocation=(self) preserves the "use my location" feature on the
      // onboarding and profile pages; camera/microphone are unused → denied.
      {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(self)",
      },
      // X-Frame-Options / CSP are applied in production only. In dev the Replit
      // preview embeds the app in an iframe (frame-ancestors 'none' / DENY would
      // blank it) and CSP would interfere with HMR's eval/websocket usage.
      ...(isProd
        ? [
            { key: "X-Frame-Options", value: "DENY" },
            { key: "Content-Security-Policy", value: contentSecurityPolicy },
          ]
        : []),
    ];

    return [
      {
        source: "/uploads/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=2592000",
          },
        ],
      },
      {
        // Every route, including the rewrite-proxied backend paths — their
        // upstream headers are dropped by the proxy, so these are the only
        // security headers the browser sees on those responses. CSP/X-Frame-
        // Options are inert on JSON/media responses and harmless there.
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
