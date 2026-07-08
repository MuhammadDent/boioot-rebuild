import type { MetadataRoute } from "next";

const BASE_URL = "https://boioot.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/dashboard", "/admin", "/api", "/login", "/register"],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}
