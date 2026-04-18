import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Allow images from any HTTPS host (Cloudflare R2, custom domains, etc.)
    // Wildcard hostname matches *.r2.dev, *.r2.cloudflarestorage.com, images.boioot.net …
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http",  hostname: "localhost", port: "*" },
    ],
    // Formats served by Vercel Image Optimization
    formats: ["image/avif", "image/webp"],
  },
  allowedDevOrigins: [
    "*.janeway.replit.dev",
    "*.replit.dev",
    "*.repl.co",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/api/:path*`,
      },
      {
        source: "/videos/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/videos/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:8080"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
