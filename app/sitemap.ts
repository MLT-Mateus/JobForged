import type { MetadataRoute } from "next";

const siteUrl = process.env.APP_PUBLIC_URL || "https://jobforged.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const routes = [
    "/",
    "/design-system",
    "/termos-servico",
    "/politicas-privacidade",
    "/politicas-exclusao",
  ];

  return routes.map((route) => ({
    url: new URL(route, siteUrl).toString(),
    lastModified: new Date(),
    changeFrequency: route === "/" ? "weekly" : "monthly",
    priority: route === "/" ? 1 : 0.5,
  }));
}
