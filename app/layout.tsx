import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/open-sans";
import "./globals.css";
import "./components/ui/ui.css";
import "./phone-layout-overrides.css";
import NavigationLoader from "./components/NavigationLoader";

export const metadata: Metadata = {
  title: "JobForged",
  description:
    "Centralize vagas, currículos, triagem automática, Kanban e histórico de candidatos em uma plataforma feita para PMEs.",
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
    description: "Recrutamento organizado para PMEs, com vagas, currículos, Kanban, histórico de candidatos e triagem assistida por IA.",
    type: "website",
    locale: "pt_BR",
    images: [{ url: "/brand/jobforged-logo.png", width: 636, height: 184, alt: "JobForged" }],
  },
  twitter: {
    card: "summary_large_image",
    title: "JobForged",
    description: "Recrute com a sua marca. Contrate com inteligência.",
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
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var key="jobforged-theme";var saved=localStorage.getItem(key);var theme=saved==="dark"||saved==="light"?saved:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.dataset.theme=theme;document.documentElement.style.colorScheme=theme;}catch(error){document.documentElement.dataset.theme="light";}})();`,
          }}
        />
      </head>
      <body>
        <NavigationLoader />
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
