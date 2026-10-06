"use client";

import { Moon, Sun } from "lucide-react";

export type ThemeMode = "light" | "dark";

export function ThemeSelector({ theme, onChange, className = "" }: { theme: ThemeMode; onChange: (theme: ThemeMode) => void; className?: string }) {
  return (
    <div className={`jf-theme-selector ${className}`.trim()} role="group" aria-label="Escolha o tema visual">
      <button type="button" className={`jf-theme-selector__option ${theme === "light" ? "is-active" : ""}`} aria-pressed={theme === "light"} onClick={() => onChange("light")}>
        <Sun size={15} aria-hidden="true" /><span>Claro</span>
      </button>
      <button type="button" className={`jf-theme-selector__option ${theme === "dark" ? "is-active" : ""}`} aria-pressed={theme === "dark"} onClick={() => onChange("dark")}>
        <Moon size={15} aria-hidden="true" /><span>Escuro</span>
      </button>
      <button className="jf-theme-selector__mobile" type="button" onClick={() => onChange(theme === "dark" ? "light" : "dark")} aria-label={theme === "dark" ? "Tema escuro ativo. Usar tema claro" : "Tema claro ativo. Usar tema escuro"} title={theme === "dark" ? "Usar tema claro" : "Usar tema escuro"}>
        {theme === "dark" ? <Moon size={20} aria-hidden="true"/> : <Sun size={20} aria-hidden="true"/>}
      </button>
    </div>
  );
}
