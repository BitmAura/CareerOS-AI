import type { MetadataRoute } from "next";
import { PUBLIC_NAV } from "@/lib/seo/copy";
import { absoluteUrl, siteConfig } from "@/lib/seo/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const extra = ["/privacy", "/terms", "/login", "/register"];
  return [
    { url: siteConfig.url, lastModified: now, changeFrequency: "weekly", priority: 1 },
    ...PUBLIC_NAV.map((item) => ({
      url: absoluteUrl(item.href),
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.9,
    })),
    ...extra.map((path) => ({
      url: absoluteUrl(path),
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: path === "/register" ? 0.8 : 0.5,
    })),
  ];
}
