"use client";
import { BrandAsset } from "@/app/components/BrandAsset";
import { Panel } from "@/app/components/ui";



import { useEffect, useMemo, useState } from "react";
import { BriefcaseBusiness, CalendarDays, Check, ChevronLeft, ChevronRight, ClipboardCheck, FileUser, Settings2, Sparkles, UserPlus, UsersRound } from "lucide-react";
import { CheckboxField, ActionButton, MetricCard, WorkspacePageHeader, PanelHeading, StatusBadge, WorkspaceState } from "@/app/components/ui";
import type { ActivityKind, HomePermission, HomeViewState } from "./types";
import type { HomeContext } from "./service";
import { AdminShell } from "@/app/components/admin/AdminModuleClient";
import "@/app/components/admin/admin.css";

const activityIcons: Record<ActivityKind, typeof BriefcaseBusiness> = {
  "vacancy-created": BriefcaseBusiness, "vacancy-published": ClipboardCheck, application: FileUser,
  "candidate-moved": UsersRound, interview: CalendarDays, admin: UserPlus, settings: Settings2,
};

export default function HomeClient({ initialContext }: { initialContext: HomeContext }) {
  const [bannerIndex, setBannerIndex] = useState(0);
  const [viewState] = useState<HomeViewState>(initialContext.data ? "ready" : "empty");
  const { organization, user, data } = initialContext;
  const can = (permission: HomePermission) => user.permissions.includes(permission);

  const banners = data?.banners ?? [];
  const currentBanner = banners[bannerIndex];
  const pendingSteps = useMemo(() => data?.onboarding.steps.filter((step) => !step.complete) ?? [], [data]);

  useEffect(() => {
    if (banners.length < 2) return;
    const timer = window.setInterval(() => setBannerIndex((current) => (current + 1) % banners.length), 7000);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  if (viewState === "loading") return <main className="jf-session-state"><WorkspaceState title="Carregando sua organização…"/></main>;
  if (viewState === "error") return <main className="jf-session-state"><WorkspaceState kind="error" title="Não foi possível carregar a Home." action={<ActionButton variant="secondary" onClick={()=>location.reload()}>Tentar novamente</ActionButton>}/></main>;
  if (viewState === "forbidden") return <main className="jf-session-state"><WorkspaceState kind="forbidden" title="Você não tem permissão para visualizar esta página."/></main>;
  if (!data) return <main className="jf-session-state"><WorkspaceState kind="empty" title="Nenhuma informação disponível para esta organização." description="Selecione outra organização ou conclua a configuração inicial."/></main>;

  return (
    <AdminShell module="home" context={{ organization, user: {name:user.name, role:user.role, initials:user.avatarInitials} }}>
        <div className="home-content">
          <WorkspacePageHeader section="Painel / Home" title={`Olá, ${user.name}!`} description="Acompanhe as principais informações da sua empresa e continue de onde parou." action={<div className="home-company-mark"><BrandAsset src={organization.logo} alt={`Logo de ${organization.name}`} /><span><small>Visão geral de</small><strong>{organization.name}</strong></span></div>}/>

          <section className="home-banner" aria-label="Destaques da organização">
            {currentBanner ? <>
              <div className="home-banner-copy"><span>{currentBanner.eyebrow}</span><h2>{currentBanner.title}</h2><p>{currentBanner.description}</p>{currentBanner.link && <a href={currentBanner.link.href}>{currentBanner.link.label}<ChevronRight /></a>}</div>
              <div className="home-banner-art" aria-hidden="true"><i /><i /><i /><BrandAsset src={organization.logo} alt="" /></div>
              {banners.length > 1 && <div className="home-banner-controls"><button aria-label="Banner anterior" onClick={() => setBannerIndex((bannerIndex - 1 + banners.length) % banners.length)}><ChevronLeft /></button><span>{banners.map((banner, index) => <button key={banner.id} className={index === bannerIndex ? "is-active" : ""} aria-label={`Exibir banner ${index + 1}`} onClick={() => setBannerIndex(index)} />)}</span><button aria-label="Próximo banner" onClick={() => setBannerIndex((bannerIndex + 1) % banners.length)}><ChevronRight /></button></div>}
            </> : <div className="home-banner-empty"><Sparkles /><strong>Espaço para comunicados da sua empresa</strong><span>Os banners configurados em Personalização aparecerão aqui.</span></div>}
          </section>

          {can("home.metrics.view") && <section className="home-section"><header><div><span className="home-eyebrow">Resumo geral</span><h2>O que está acontecendo agora</h2></div><p>{data.summary}</p></header><div className="home-metrics">{data.metrics.map((metric) => <MetricCard key={metric.id} label={metric.label} value={metric.value.toLocaleString("pt-BR")} detail={metric.detail}/>)}</div></section>}

          <div className="home-lower-grid">
            {can("home.onboarding.view") && <Panel as="section" className="home-panel home-onboarding"><PanelHeading title="Conclua sua configuração" description="Pendências" action={<StatusBadge tone="info">{data.onboarding.progress}%</StatusBadge>}/><div className="jf-panel-body"><div className="home-progress"><i style={{ width: `${data.onboarding.progress}%` }} /></div>{pendingSteps.length ? <><p>Faltam {pendingSteps.length} etapas para deixar sua operação pronta.</p><ul>{data.onboarding.steps.map((step) => <li key={step.id} className={step.complete ? "is-complete" : ""}><CheckboxField label={step.label} checked={step.complete} readOnly tabIndex={-1} /></li>)}</ul>{can("home.onboarding.continue") && <a className="jf-action jf-action--primary" href="/app/configuracoes">Continuar configuração<ChevronRight /></a>}</> : <div className="home-complete"><Check /><div><strong>Configuração completa</strong><span>Sua organização está pronta para recrutar.</span></div></div>}</div></Panel>}

            {can("home.activities.view") && <Panel as="section" className="home-panel home-activities"><PanelHeading title="Atividades recentes" description="Movimentações" action={<ActionButton variant="quiet" disabled title="Histórico completo em breve">Ver todas · Em breve</ActionButton>}/><div className="jf-panel-body">{data.activities.length ? <ul>{data.activities.map((activity) => { const Icon = activityIcons[activity.kind]; return <li key={activity.id}><span><Icon /></span><div><p>{activity.description}</p><small><b>{activity.actor}</b> · {activity.occurredAt}</small></div></li>; })}</ul> : <div className="home-empty"><ClipboardCheck /><strong>Nenhuma atividade recente</strong><span>As movimentações da sua equipe aparecerão aqui.</span></div>}</div></Panel>}
          </div>
        </div>
    </AdminShell>
  );
}
