"use client";
import Link from 'next/link';
import type {ReactNode} from 'react';
import {Building2,ShieldCheck,UserRound,LockKeyhole} from 'lucide-react';
import {BrandAsset} from '../BrandAsset';
import {ThemeSelector,useThemePreference} from '../ui';
import './auth.css';
export function AuthShell({ children, compact = false, centered = false }: { children: ReactNode; compact?: boolean; centered?: boolean }) {
  const { theme, changeTheme } = useThemePreference();

  return (
    <main className={`auth-page ${compact ? "auth-page--compact" : ""} ${centered ? "auth-page--centered" : ""}`}>
      <div className="auth-grid" aria-hidden="true" />
      <header className="site-header auth-official-header">
        <div className="container nav-wrap">
          <Link href="/" className="brand" aria-label="JobForged — página inicial">
            <BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={636} height={184} />
          </Link>
          <ThemeSelector theme={theme} onChange={changeTheme} />
        </div>
      </header>
      <div className="auth-layout">
        {!centered && <aside className="auth-context">
          <span className="auth-context__icon"><Building2 /></span>
          <p className="auth-eyebrow">Conta empresarial JobForged</p>
          <h2>Recrutamento estruturado desde o primeiro acesso.</h2>
          <p>Ambiente exclusivo para empresas e administradores responsáveis.</p>
          <ul>
            <li><ShieldCheck />Plano Freemium sem cobrança</li>
            <li><UserRound />Conta vinculada à organização</li>
            <li><LockKeyhole />Autenticação segura pelo Supabase</li>
          </ul>
        </aside>}
        <section className="auth-card">{children}</section>
      </div>
    </main>
  );
}

