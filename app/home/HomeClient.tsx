"use client";
import { CompanyHomeBrand } from "@/app/components/personalization/CompanyBranding";
import { PlatformHomeBanners } from "@/app/components/admin/PlatformHomeBanners";
import { MetricGrid } from "@/app/components/ui/MetricGrid";
import { AccountSetup } from "./AccountSetup";
import { Panel } from "@/app/components/ui";



import { useState } from "react";
import { BriefcaseBusiness, CalendarDays, ClipboardCheck, FileUser, Settings2, UserPlus, UsersRound } from "lucide-react";
import { ActionButton, MetricCard, WorkspacePageHeader, PanelHeading, WorkspaceState } from "@/app/components/ui";
import type { ActivityKind, HomePermission, HomeViewState } from "./types";
import type { HomeContext } from "./service";
import { AdminShell } from "@/app/components/admin/AdminModuleClient";
import "@/app/components/admin/admin.css";

const activityIcons: Record<ActivityKind, typeof BriefcaseBusiness> = {
  "vacancy-created": BriefcaseBusiness, "vacancy-published": ClipboardCheck, application: FileUser,
  "candidate-moved": UsersRound, interview: CalendarDays, admin: UserPlus, settings: Settings2,
};

export default function HomeClient({ initialContext }: { initialContext: HomeContext }) {
  const [viewState] = useState<HomeViewState>(initialContext.data ? "ready" : "empty");
  const { organization, user, data } = initialContext;
  const can = (permission: HomePermission) => user.permissions.includes(permission);





  if (viewState === "loading") return <main className="jf-session-state"><WorkspaceState title="Carregando sua organização…"/></main>;
  if (viewState === "error") return <main className="jf-session-state"><WorkspaceState kind="error" title="Não foi possível carregar a Home." action={<ActionButton variant="secondary" onClick={()=>location.reload()}>Tentar novamente</ActionButton>}/></main>;
  if (viewState === "forbidden") return <main className="jf-session-state"><WorkspaceState kind="forbidden" title="Você não tem permissão para visualizar esta página."/></main>;
  if (!data) return <main className="jf-session-state"><WorkspaceState kind="empty" title="Nenhuma informação disponível para esta organização." description="Selecione outra organização ou conclua a configuração inicial."/></main>;

  return (
    <AdminShell module="home" context={{ organization, user: {name:user.name, role:user.role, initials:user.avatarInitials} }}>
        <div className="home-content">
          <WorkspacePageHeader section="Painel / Home" title="Bem-vindo à sua Home" description="Acompanhe as principais informações da sua empresa e continue de onde parou." action={<CompanyHomeBrand/>}/>

          <PlatformHomeBanners/>

          {can("home.metrics.view") && <section className="home-section"><header><div><span className="home-eyebrow">Resumo geral · mock</span><h2>O que está acontecendo agora</h2></div><p>{data.summary}</p></header><MetricGrid>{data.metrics.slice(0,4).map((metric) => <MetricCard key={metric.id} label={metric.label} value={metric.value.toLocaleString("pt-BR")} detail={metric.detail}/>)}</MetricGrid></section>}

          <div className="home-lower-grid">
            <AccountSetup/>

            {can("home.activities.view") && <Panel as="section" className="home-panel home-activities"><PanelHeading title="Atividades recentes" description="Movimentações demonstrativas · mock" action={<ActionButton variant="quiet" disabled title="Histórico completo em breve">Ver todas · Em breve</ActionButton>}/><div className="jf-panel-body">{data.activities.length ? <ul>{data.activities.map((activity) => { const Icon = activityIcons[activity.kind]; return <li key={activity.id}><span><Icon /></span><div><p>{activity.description}</p><small><b>{activity.actor}</b> · {activity.occurredAt}</small></div></li>; })}</ul> : <WorkspaceState kind="empty" icon={ClipboardCheck} variant="compact" title="Nenhuma atividade recente" description="As movimentações da sua equipe aparecerão aqui."/>}</div></Panel>}
          </div>
        </div>
    </AdminShell>
  );
}
