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
    ];
  },
};

export default nextConfig;
