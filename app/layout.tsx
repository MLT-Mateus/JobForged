import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/open-sans";
import "./globals.css";
import "./components/ui/ui.css";
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
        <style>{`.app-loader{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:#f8fcfb}.app-loader__inline{display:block;width:112px;height:112px}.app-loader__inline>svg{display:block;width:100%;height:100%}html[data-theme=dark] .app-loader{background:#071412}html[data-theme=dark] .app-loader__inline [stroke="#20B2AA"]{stroke:#43D0C6}html[data-theme=dark] .app-loader__inline [stroke="#4169E1"]{stroke:#7E9CFF}html[data-theme=dark] .app-loader__inline [fill="#4169E1"]{fill:#7E9CFF}`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var root=document.documentElement;var lightIcon="/favicon.svg";var darkIcon="/brand/jobforged-symbol-dark.svg";function syncFavicon(){var href=root.dataset.theme==="dark"?darkIcon:lightIcon;document.querySelectorAll('link[rel~="icon"]').forEach(function(link){if(link.getAttribute("href")!==href)link.setAttribute("href",href);});}try{var key="jobforged-theme";var saved;try{saved=localStorage.getItem(key)}catch(_){}if(saved!=="light"&&saved!=="dark"){var cookie=document.cookie.match(/(?:^|; )jobforged-theme=(light|dark)(?:;|$)/);saved=cookie?cookie[1]:null}var theme=saved==="dark"||saved==="light"?saved:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");root.dataset.theme=theme;root.style.colorScheme=theme;}catch(error){root.dataset.theme="light";}syncFavicon();new MutationObserver(syncFavicon).observe(root,{attributes:true,attributeFilter:["data-theme"]});new MutationObserver(syncFavicon).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:["href","rel"]});})();`,
          }}
        />
      </head>
      <body>
        <NavigationLoader />
        <script dangerouslySetInnerHTML={{__html:'performance.mark("jobforged-loader-first-paint");'}}/>
        {children}
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
      </body>
    </html>
  );
}
