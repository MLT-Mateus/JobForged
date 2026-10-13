import type { MetadataRoute } from "next";
import { SITE_URL } from "./seo";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: `${SITE_URL}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${SITE_URL}/termos-servico`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/politicas-privacidade`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/politicas-exclusao`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
