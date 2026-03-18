import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: [
    "*.janeway.replit.dev",
    "*.replit.dev",
    "*.repl.co",
  ],
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:5233"}/api/:path*`,
      },
      {
        source: "/videos/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:5233"}/videos/:path*`,
      },
      {
        source: "/uploads/:path*",
        destination: `${process.env.BACKEND_URL ?? "http://localhost:5233"}/uploads/:path*`,
      },
    ];
  },
};

export default nextConfig;
