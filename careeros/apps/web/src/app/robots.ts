import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/seo/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/dashboard",
          "/admin",
          "/queue",
          "/resume",
          "/applications",
          "/settings",
          "/profile",
          "/jobs",
          "/interviews",
          "/billing",
          "/analytics",
          "/notifications",
          "/ai-tools",
        ],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
