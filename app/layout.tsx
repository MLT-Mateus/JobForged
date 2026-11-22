import {TrackingPixels} from './components/TrackingPixels';
import type { Metadata } from "next";
import "@fontsource-variable/montserrat";
import "@fontsource-variable/open-sans";
import "@fontsource/poppins/400.css";
import "@fontsource/poppins/600.css";
import "@fontsource/poppins/700.css";
import "@fontsource-variable/inter";
import "@fontsource-variable/manrope";
import "@fontsource-variable/lora";
import "./globals.css";
import "./components/ui/ui.css";
import "./components/ui/widgets.css";
import GlobalInteractions from "./components/GlobalInteractions";
import NavigationLoader from "./components/NavigationLoader";
import { AppToastHost } from './components/ui/AppToast';

import {searchEnvironment} from "./lib/seo";


export function generateMetadata():Metadata {const canonicalOrigin=searchEnvironment().origin;return {
  metadataBase: new URL(canonicalOrigin),
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
  robots: {index:false,follow:true},
  openGraph: {
    title: "JobForged",
    description: "Recrutamento organizado para PMEs, com vagas, currículos, Kanban, histórico de candidatos e triagem assistida por IA.",
    type: "website",
    url: canonicalOrigin,
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
    icon: [
      { url: "/favicon.ico", type: "image/x-icon", sizes: "16x16 32x32 48x48" },
      { url: "/favicon-96x96.png", type: "image/png", sizes: "96x96" },
    ],
    shortcut: "/favicon.ico",
    apple: [{url:"/apple-touch-icon.png",type:"image/png",sizes:"180x180"}],
  },
}}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {

  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link data-jf-browser-icon="true" rel="icon" href="/favicon.svg" type="image/svg+xml" sizes="any" />
        <style>{`.app-loader{position:fixed;inset:0;z-index:9999;display:grid;place-items:center;background:var(--jf-loader-surface,var(--jf-ui-surface-soft,#f8fcfb))}.app-loader__inline{display:block;width:112px;height:112px}.app-loader__inline>svg{display:block;width:100%;height:100%}`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var root=document.documentElement;var lightIcon="/favicon.svg";var darkIcon="/brand/jobforged-symbol-dark.svg";function syncFavicon(){var custom=root.dataset.companyIcon;var href=custom&&custom.indexOf('/api/')===0?custom:root.dataset.theme==="dark"?darkIcon:lightIcon;document.querySelectorAll('link[data-jf-browser-icon]').forEach(function(link){if(link.getAttribute("href")!==href)link.setAttribute("href",href);var customIcon=Boolean(custom&&href===custom);if(customIcon)link.removeAttribute("type");else link.setAttribute("type","image/svg+xml");link.setAttribute("sizes","any");});}try{var key="jobforged-theme";var saved;try{saved=localStorage.getItem(key)}catch(_){}if(saved!=="light"&&saved!=="dark"){var cookie=document.cookie.match(/(?:^|; )jobforged-theme=(light|dark)(?:;|$)/);saved=cookie?cookie[1]:null}var theme=saved==="dark"||saved==="light"?saved:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");root.dataset.theme=theme;root.style.colorScheme=theme;}catch(error){root.dataset.theme="light";}try{var stored=JSON.parse(sessionStorage.getItem('jobforged-loader-colors')||'null');var path=location.pathname+'/';if(stored&&path.indexOf(stored.scope)===0){root.dataset.loaderSeed='true';var colors=stored.palettes[stored.allowSwitch?root.dataset.theme:stored.theme]||stored.palettes[stored.theme];['primary','secondary','surface'].forEach(function(key){if(/^#[0-9a-f]{6}$/i.test(colors[key]))root.style.setProperty('--jf-loader-'+key,colors[key]);});}else sessionStorage.removeItem('jobforged-loader-colors');}catch(_){}syncFavicon();new MutationObserver(syncFavicon).observe(root,{attributes:true,attributeFilter:["data-theme","data-company-icon"]});new MutationObserver(syncFavicon).observe(document.head,{childList:true,subtree:true,attributes:true,attributeFilter:["href","rel"]});})();`,
          }}
        />
      </head>
      <body>
        <NavigationLoader />
        <GlobalInteractions />
        <AppToastHost /><TrackingPixels/>
        <script dangerouslySetInnerHTML={{__html:'performance.mark("jobforged-loader-first-paint");'}}/>
        {children}
      </body>
    </html>
  );
}
