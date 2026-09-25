"use client";

/* eslint-disable react-hooks/set-state-in-effect */

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  Bell, BriefcaseBusiness, CalendarDays, Check, ChevronLeft, ChevronRight, CircleAlert,
  ClipboardCheck, FileUser, House, LayoutDashboard, Menu, Palette, PanelLeftClose, PanelLeftOpen,
  Settings2, ShieldCheck, Sparkles, UserPlus, UsersRound, WalletCards, X,
} from "lucide-react";
import { CheckboxField, ThemeSelector } from "@/app/components/ui";
import type { ActivityKind, HomePermission, HomeViewState, NavItem, OrganizationTheme } from "./types";
import type { HomeContext } from "./service";

const navigation: NavItem[] = [
  { label: "Home", href: "/app/home", icon: House }, { label: "Dashboards", href: "/app/dashboards", icon: LayoutDashboard },
  { label: "Vagas", href: "/app/vagas", icon: BriefcaseBusiness }, { label: "Candidaturas", href: "/app/candidaturas", icon: UsersRound },
  { label: "Agenda", href: "/app/agenda", icon: CalendarDays }, { label: "Personalização", href: "/app/personalizacao", icon: Palette },
  { label: "Administradores", href: "/app/administradores", icon: ShieldCheck }, { label: "Financeiro", href: "/app/financeiro", icon: WalletCards },
  { label: "Configurações", href: "/app/configuracoes", icon: Settings2 },
];

const activityIcons: Record<ActivityKind, typeof BriefcaseBusiness> = {
  "vacancy-created": BriefcaseBusiness, "vacancy-published": ClipboardCheck, application: FileUser,
  "candidate-moved": UsersRound, interview: CalendarDays, admin: UserPlus, settings: Settings2,
};

function themeVariables(theme: OrganizationTheme): CSSProperties {
  return {
    "--home-primary": theme.primary, "--home-primary-strong": theme.primaryStrong, "--home-primary-soft": theme.primarySoft,
    "--home-secondary": theme.secondary, "--home-bg": theme.background, "--home-surface": theme.surface,
    "--home-surface-soft": theme.surfaceSoft, "--home-text": theme.text, "--home-muted": theme.textMuted, "--home-border": theme.border,
    "--jf-ui-brand": theme.primary, "--jf-ui-brand-strong": theme.primaryStrong, "--jf-ui-brand-soft": theme.primarySoft,
    "--jf-ui-focus": theme.primary, "--jf-ui-focus-ring": `color-mix(in srgb, ${theme.primary} 15%, transparent)`,
    "--jf-ui-accent": theme.secondary, "--jf-ui-surface": theme.surface, "--jf-ui-surface-soft": theme.surfaceSoft,
    "--jf-ui-text": theme.text, "--jf-ui-text-muted": theme.textMuted, "--jf-ui-border": theme.border, "--jf-ui-border-strong": theme.border,
  } as CSSProperties;
}

export default function HomeClient({ initialContext }: { initialContext: HomeContext }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [viewState] = useState<HomeViewState>(initialContext.data ? "ready" : "empty");
  const { organization, user, data } = initialContext;
  const [mode, setMode] = useState<"light" | "dark">(organization.theme.light.mode);
  const can = (permission: HomePermission) => user.permissions.includes(permission);

  useEffect(() => {
    const saved = document.documentElement.dataset.theme;
    if (saved === "dark" || saved === "light") setMode(saved);
  }, []);

  const theme = organization.theme[mode];
  const banners = data?.banners ?? [];
  const currentBanner = banners[bannerIndex];
  const pendingSteps = useMemo(() => data?.onboarding.steps.filter((step) => !step.complete) ?? [], [data]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setBannerIndex((current) => (current + 1) % banners.length), 7000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  const changeTheme = (next: "light" | "dark") => {
    setMode(next); document.documentElement.dataset.theme = next; document.documentElement.style.colorScheme = next;
    localStorage.setItem("jobforged-theme", next);
  };

  if (viewState === "loading") return <main className="home-state"><span className="home-spinner" /><strong>Carregando sua organização…</strong></main>;
  if (viewState === "error") return <main className="home-state"><CircleAlert /><strong>Não foi possível carregar a Home.</strong><button>Carregar novamente</button></main>;
  if (viewState === "forbidden") return <main className="home-state"><ShieldCheck /><strong>Você não tem permissão para visualizar esta página.</strong></main>;
  if (!data) return <main className="home-state"><Sparkles /><strong>Nenhuma informação disponível para esta organização.</strong><span>Selecione outra organização ou conclua a configuração inicial.</span></main>;

  return (
    <main className={`home-shell ${collapsed ? "is-collapsed" : ""}`} data-theme={mode} style={themeVariables(theme)}>
      <aside className={`home-sidebar ${mobileMenu ? "is-open" : ""}`}>
        <div className="home-brand"><span><img src={organization.logo} alt="" /><strong>{organization.shortName}</strong></span><button onClick={() => setCollapsed((value) => !value)} aria-label={collapsed ? "Expandir menu lateral" : "Recolher menu lateral"}>{collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}</button><button className="home-sidebar-close" onClick={() => setMobileMenu(false)} aria-label="Fechar menu"><X /></button></div>
        <nav aria-label="Navegação principal">{navigation.map(({ label, href, icon: Icon }) => <a key={label} href={href} className={label === "Home" ? "is-active" : ""} aria-current={label === "Home" ? "page" : undefined} title={collapsed ? label : undefined}><Icon /><span>{label}</span></a>)}</nav>
        <a className="home-profile" href="/app/minha-conta"><span>{user.avatarInitials}</span><span><strong>{user.name}</strong><small>{user.role}</small></span></a>
      </aside>
      {mobileMenu && <button className="home-scrim" aria-label="Fechar menu" onClick={() => setMobileMenu(false)} />}

      <section className="home-workspace">
        <header className="home-topbar">
          <button className="home-mobile-menu" onClick={() => setMobileMenu(true)} aria-label="Abrir menu"><Menu /></button>
          <div className="home-org"><img src={organization.logo} alt="" /><span><small>Organização ativa</small><strong>{organization.name}</strong></span></div>
          <div className="home-top-actions"><ThemeSelector theme={mode} onChange={changeTheme} /><button className="home-notice" aria-label="Notificações"><Bell /><i /></button></div>
        </header>

        <div className="home-content">
          <section className="home-welcome"><div><span>Home</span><h1>Olá, {user.name}!</h1><p>Acompanhe as principais informações da sua empresa e continue de onde parou.</p></div><div className="home-company-mark"><img src={organization.logo} alt={`Logo de ${organization.name}`} /><span><small>Visão geral de</small><strong>{organization.name}</strong></span></div></section>

          <section className="home-banner" aria-label="Destaques da organização">
            {currentBanner ? <>
              <div className="home-banner-copy"><span>{currentBanner.eyebrow}</span><h2>{currentBanner.title}</h2><p>{currentBanner.description}</p>{currentBanner.link && <a href={currentBanner.link.href}>{currentBanner.link.label}<ChevronRight /></a>}</div>
              <div className="home-banner-art" aria-hidden="true"><i /><i /><i /><img src={organization.logo} alt="" /></div>
              {banners.length > 1 && <div className="home-banner-controls"><button aria-label="Banner anterior" onClick={() => setBannerIndex((bannerIndex - 1 + banners.length) % banners.length)}><ChevronLeft /></button><span>{banners.map((banner, index) => <button key={banner.id} className={index === bannerIndex ? "is-active" : ""} aria-label={`Exibir banner ${index + 1}`} onClick={() => setBannerIndex(index)} />)}</span><button aria-label="Próximo banner" onClick={() => setBannerIndex((bannerIndex + 1) % banners.length)}><ChevronRight /></button></div>}
            </> : <div className="home-banner-empty"><Sparkles /><strong>Espaço para comunicados da sua empresa</strong><span>Os banners configurados em Personalização aparecerão aqui.</span></div>}
          </section>

          {can("home.metrics.view") && <section className="home-section"><header><div><span className="home-eyebrow">Resumo geral</span><h2>O que está acontecendo agora</h2></div><p>{data.summary}</p></header><div className="home-metrics">{data.metrics.map((metric) => <article key={metric.id} data-tone={metric.tone}><span>{metric.label}</span><strong>{metric.value.toLocaleString("pt-BR")}</strong><small>{metric.detail}</small></article>)}</div></section>}

          <div className="home-lower-grid">
            {can("home.onboarding.view") && <section className="home-panel home-onboarding"><header><div><span className="home-eyebrow">Pendências</span><h2>Conclua sua configuração</h2></div><strong>{data.onboarding.progress}%</strong></header><div className="home-progress"><i style={{ width: `${data.onboarding.progress}%` }} /></div>{pendingSteps.length ? <><p>Faltam {pendingSteps.length} etapas para deixar sua operação pronta.</p><ul>{data.onboarding.steps.map((step) => <li key={step.id} className={step.complete ? "is-complete" : ""}><CheckboxField label={step.label} checked={step.complete} readOnly tabIndex={-1} /></li>)}</ul>{can("home.onboarding.continue") && <a href="/app/configuracoes">Continuar configuração<ChevronRight /></a>}</> : <div className="home-complete"><Check /><div><strong>Configuração completa</strong><span>Sua organização está pronta para recrutar.</span></div></div>}</section>}

            {can("home.activities.view") && <section className="home-panel home-activities"><header><div><span className="home-eyebrow">Movimentações</span><h2>Atividades recentes</h2></div><button>Ver todas</button></header>{data.activities.length ? <ul>{data.activities.map((activity) => { const Icon = activityIcons[activity.kind]; return <li key={activity.id}><span><Icon /></span><div><p>{activity.description}</p><small><b>{activity.actor}</b> · {activity.occurredAt}</small></div></li>; })}</ul> : <div className="home-empty"><ClipboardCheck /><strong>Nenhuma atividade recente</strong><span>As movimentações da sua equipe aparecerão aqui.</span></div>}</section>}
          </div>
        </div>
      </section>
    </main>
  );
}
