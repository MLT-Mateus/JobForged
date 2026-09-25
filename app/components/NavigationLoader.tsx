"use client";

import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { JobForgedLoadingAnimation } from "./JobForgedLoadingAnimation";

type LoaderTheme = "light" | "dark";
type LoaderPhase = "initial" | "navigation";

const LOADER_CYCLE_MS = 1500;
const LOADER_FAILSAFE_MS = 30000;
const EXIT_DELAY_MS = 140;

function routeKey(url: URL) {
  return url.pathname;
}

export default function NavigationLoader() {
  const pathname = usePathname();
  const [active, setActive] = useState(true);
  const [phase, setPhase] = useState<LoaderPhase>("initial");
  const [theme, setTheme] = useState<LoaderTheme>("light");
  const pendingRouteRef = useRef<string | null>(null);
  const startedAtRef = useRef(0);
  const failsafeRef = useRef(0);
  const finishTimerRef = useRef(0);

  const hideLoader = useCallback(() => {
    window.clearTimeout(failsafeRef.current);
    window.clearTimeout(finishTimerRef.current);
    pendingRouteRef.current = null;
    setActive(false);
  }, []);

  const hideAfterPaint = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        window.setTimeout(hideLoader, EXIT_DELAY_MS);
      });
    });
  }, [hideLoader]);

  const finishAfterCompleteCycle = useCallback(() => {
    window.clearTimeout(finishTimerRef.current);
    const elapsed = performance.now() - startedAtRef.current;
    const remainingCycle = Math.max(0, LOADER_CYCLE_MS - elapsed);
    finishTimerRef.current = window.setTimeout(hideAfterPaint, remainingCycle);
  }, [hideAfterPaint]);

  const startLoading = useCallback((target: URL) => {
    const current = new URL(window.location.href);
    const targetRoute = routeKey(target);
    if (target.origin !== current.origin || targetRoute === routeKey(current)) return;

    pendingRouteRef.current = targetRoute;
    window.clearTimeout(failsafeRef.current);
    window.clearTimeout(finishTimerRef.current);
    startedAtRef.current = performance.now();
    failsafeRef.current = window.setTimeout(hideLoader, LOADER_FAILSAFE_MS);
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    setPhase("navigation");
    setActive(true);
  }, [hideLoader]);

  useEffect(() => {
    startedAtRef.current = performance.now();
    const pageIsReady = () => finishAfterCompleteCycle();
    failsafeRef.current = window.setTimeout(hideLoader, LOADER_FAILSAFE_MS);

    if (document.readyState === "complete") {
      pageIsReady();
    } else {
      window.addEventListener("load", pageIsReady, { once: true });
    }

    return () => {
      window.removeEventListener("load", pageIsReady);
      window.clearTimeout(failsafeRef.current);
      window.clearTimeout(finishTimerRef.current);
    };
  }, [finishAfterCompleteCycle, hideLoader]);

  useEffect(() => {
    const handleNavigationClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      if (!(event.target instanceof Element)) return;

      const anchor = event.target.closest<HTMLAnchorElement>("a[href]");
      if (anchor) {
        if (anchor.target === "_blank" || anchor.hasAttribute("download")) return;
        startLoading(new URL(anchor.href, window.location.href));
        return;
      }

      const navigationButton = event.target.closest<HTMLButtonElement>("button[data-navigation-href]");
      const href = navigationButton?.dataset.navigationHref;
      if (href) startLoading(new URL(href, window.location.href));
    };

    document.addEventListener("click", handleNavigationClick, true);
    return () => document.removeEventListener("click", handleNavigationClick, true);
  }, [startLoading]);

  useEffect(() => {
    if (!active || phase !== "navigation" || !pendingRouteRef.current) return;
    const currentRoute = window.location.pathname;
    if (currentRoute !== pendingRouteRef.current) return;

    finishAfterCompleteCycle();
  }, [active, finishAfterCompleteCycle, pathname, phase]);

  if (!active) return null;

  return (
    <div className="app-loader app-loader--navigation" data-surface-theme={theme} role="status" aria-live="polite" aria-label={phase === "initial" ? "Carregando JobForged" : "Carregando próxima página"}>
      <JobForgedLoadingAnimation className="app-loader__logo" size={112} />
    </div>
  );
}
