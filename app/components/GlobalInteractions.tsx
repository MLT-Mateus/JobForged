"use client";

import { useEffect, useState } from "react";
import { InlineBrandLoader } from "./InlineBrandLoader";
import { EVENT, THEME_TRANSITION_MS } from "./ui/useThemePreference";

// Every route shares the approved landing-page transition and link behavior.
export default function GlobalInteractions() {
  const [themeLoading, setThemeLoading] = useState<"light" | "dark" | null>(null);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const transition = () => {
      clearTimeout(timer);
      setThemeLoading(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
      timer = setTimeout(() => setThemeLoading(null), THEME_TRANSITION_MS);
    };
    const preventLinkDrag = (event: DragEvent) => {
      if (event.target instanceof Element && event.target.closest('a[href], button, [role="button"]')) event.preventDefault();
    };
    window.addEventListener(EVENT, transition);
    document.addEventListener("dragstart", preventLinkDrag, true);
    return () => {
      clearTimeout(timer);
      window.removeEventListener(EVENT, transition);
      document.removeEventListener("dragstart", preventLinkDrag, true);
    };
  }, []);
  return themeLoading ? <div className="app-loader app-loader--theme" data-surface-theme={themeLoading} role="status" aria-live="polite" aria-label="Atualizando tema da JobForged"><InlineBrandLoader /></div> : null;
}
