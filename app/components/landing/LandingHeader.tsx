"use client";

import { useState } from "react";
import Link from "next/link";
import { LogIn, Menu, X } from "lucide-react";
import { BrandAsset } from "@/app/components/BrandAsset";
import { ThemeSelector, useThemePreference } from "@/app/components/ui";

const navItems = [
  { label: "Diferenciais", href: "#diferenciais" },
  { label: "Como funciona", href: "#como-funciona" },
  { label: "Planos", href: "#planos" },
  { label: "FAQ", href: "#faq" },
];

export default function LandingHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const { theme, changeTheme } = useThemePreference();
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="site-header">
      <div className="container nav-wrap">
        <a className="brand" href="#inicio" aria-label="JobForged — início">
          <BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184} fetchPriority="high" />
        </a>
        <nav className="desktop-nav" aria-label="Navegação principal">
          {navItems.map((item) => <a key={item.href} href={item.href}>{item.label}</a>)}
        </nav>
        <ThemeSelector theme={theme} onChange={changeTheme} />
        <Link className="header-login jf-action jf-action--secondary" href="/login"><LogIn aria-hidden="true" />Entrar</Link>
        <button
          className="menu-button"
          type="button"
          aria-label={menuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={menuOpen}
          aria-controls={menuOpen ? "mobile-navigation" : undefined}
          onClick={() => setMenuOpen((value) => !value)}
        >
          {menuOpen ? <X /> : <Menu />}
        </button>
      </div>
      {menuOpen && (
        <nav id="mobile-navigation" className="mobile-nav" aria-label="Navegação para dispositivos móveis">
          {navItems.map((item) => <a key={item.href} href={item.href} onClick={closeMenu}>{item.label}</a>)}
          <Link className="button button--ghost jf-action jf-action--secondary" href="/login" onClick={closeMenu}>Entrar</Link>
        </nav>
      )}
    </header>
  );
}
