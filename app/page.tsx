import type { Metadata } from "next";
import LandingPageClient from "./LandingPageClient";
import { publicPageMetadata, SITE_URL, SOCIAL_IMAGE } from "./seo";

export const metadata: Metadata = publicPageMetadata(
  "JobForged | Recrutamento e seleção com a sua marca",
  "Organize vagas, currículos e etapas de recrutamento em um só fluxo. A JobForged combina identidade própria, WhatsApp e triagem assistida para empresas.",
  "/",
);

const structuredData = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "JobForged",
  url: SITE_URL,
  image: new URL(SOCIAL_IMAGE, SITE_URL).toString(),
  applicationCategory: "BusinessApplication",
  operatingSystem: "Web",
  description: "Plataforma de recrutamento e seleção com vagas, candidatos, etapas, página de carreiras e triagem assistida.",
};

export default function HomePage() {
  return (
    <>
      <LandingPageClient />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
    </>
  );
}
