import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "./globals.css";

export const metadata: Metadata = {
  title: "JobForged",
  description:
    "Simplifique o recrutamento com um ATS white label, triagem por IA, entrevistas pelo WhatsApp e critérios para contratar com mais qualidade.",
  keywords: [
    "ATS white label",
    "software de recrutamento e seleção",
    "triagem de currículos",
    "entrevista pelo WhatsApp",
    "página de carreiras",
    "gestão de candidatos",
  ],
  openGraph: {
    title: "JobForged",
    description: "ATS white label para transformar recrutamento em um processo conectado, automatizado e inteligente.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/brand/jobforged-logo.png", width: 636, height: 184, alt: "JobForged" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobForged",
    description: "Recrute com a sua marca. Contrate com mais inteligência.",
    images: ["/brand/jobforged-logo.png"],
  },
  other: { "codex-preview": "development" },
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "JobForged",
    applicationCategory: "BusinessApplication",
    operatingSystem: "Web",
    description: "ATS white label para recrutamento e seleção, com triagem por IA, entrevistas pelo WhatsApp e personalização de marca e domínio.",
  };

  return (
    <html lang="pt-BR">
      <body>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
