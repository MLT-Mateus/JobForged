"use client";

import { useSyncExternalStore } from "react";
import type { ThemeMode } from "./ThemeSelector";

const KEY = "jobforged-theme";
const EVENT = "jobforged-theme-change";
const valid = (value: unknown): value is ThemeMode => value === "light" || value === "dark";

export function setThemePreference(theme: ThemeMode) {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  try { localStorage.setItem(KEY, theme); } catch { /* Cookie keeps navigation persistent when storage is blocked. */ }
  try { document.cookie = `${KEY}=${theme}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`; } catch { /* In-memory theme still works with cookies disabled. */ }
  window.dispatchEvent(new Event(EVENT));
}

function snapshot(): ThemeMode {
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}
function subscribe(onChange: () => void) {
  const syncStorage = (event: StorageEvent) => {
    if (event.key === KEY && valid(event.newValue)) {
      document.documentElement.dataset.theme = event.newValue;
      document.documentElement.style.colorScheme = event.newValue;
      onChange();
    }
  };
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
  window.addEventListener(EVENT, onChange);
  window.addEventListener("storage", syncStorage);
  window.addEventListener("pageshow", onChange);
  return () => { observer.disconnect(); window.removeEventListener(EVENT, onChange); window.removeEventListener("storage", syncStorage); window.removeEventListener("pageshow", onChange); };
}
export function useThemePreference() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => "light" as ThemeMode);
  return { theme, changeTheme: setThemePreference };
}
