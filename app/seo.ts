import type { Metadata } from "next";

export const SITE_URL = "https://jobforged.com";
export const SOCIAL_IMAGE = "/brand/jobforged-social.png";

export function publicPageMetadata(title: string, description: string, path: string): Metadata {
  const canonical = new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    alternates: { canonical },
    robots: { index: true, follow: true },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "JobForged",
      type: "website",
      locale: "pt_BR",
      images: [{ url: SOCIAL_IMAGE, width: 1200, height: 630, alt: "JobForged — recrutamento organizado para empresas" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [{ url: SOCIAL_IMAGE, alt: "JobForged — recrutamento organizado para empresas" }],
    },
  };
}
