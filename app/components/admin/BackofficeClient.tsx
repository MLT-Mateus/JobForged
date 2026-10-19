"use client";
import { planStatusLabel } from "./display-labels";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/app/components/ui/WorkspaceShell";
import { EmptyState, MetricCard, Panel, PanelHeading, StatusBadge, WorkspacePageHeader, WorkspaceState } from "@/app/components/ui";
import { LogOut, ShieldCheck } from "lucide-react";
import { signOutCompany } from "@/app/components/auth/auth-service";

type Overview = { companies: number; members: number; recentCompanies: Array<{ id: string; name: string; plan_id: string; plan_status: string; created_at: string }> };
export function BackofficeClient({ email }: { email: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/backoffice", { credentials: "same-origin", cache: "no-store" })
    .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ overview: Overview }>; })
    .then(data => setOverview(data.overview)).catch(() => setError("Não foi possível carregar dados autorizados.")); }, []);
  return <WorkspaceShell items={[{ label: "Backoffice", href: "/backoffice", icon: ShieldCheck, active: true }]} logo="/brand/jobforged-symbol.svg" brand="JobForged" title="JobForged" subtitle="Administração interna" actions={<button type="button" className="jf-action jf-action--quiet admin-notice" aria-label="Sair da conta" title="Sair da conta" onClick={async () => { await signOutCompany(); location.replace("/login"); }}><LogOut/></button>}><div className="admin-main jf-workspace-stack">
    <WorkspacePageHeader section="JobForged / Backoffice" title="Visão administrativa" description={`Acompanhe os cadastros da plataforma. Conta: ${email}.`}/>
    {error && <WorkspaceState kind="error" title="Não foi possível carregar o backoffice" description={error} action={<button className="jf-action jf-action--secondary" onClick={()=>location.reload()}>Tentar novamente</button>}/>}
    {!overview && !error && <WorkspaceState title="Carregando visão administrativa…"/>}
    {overview && <><div className="admin-metrics"><MetricCard label="Empresas" value={overview.companies}/><MetricCard label="Usuários vinculados" value={overview.members}/></div>
      <Panel as="section" className="admin-card"><PanelHeading title="Empresas recentes" description="Organizações cadastradas mais recentemente"/>{overview.recentCompanies.length ? <ul className="admin-record-list">{overview.recentCompanies.map(company => <li key={company.id}><div><strong>{company.name}</strong><small>Criada em {new Date(company.created_at).toLocaleDateString("pt-BR")}</small></div><StatusBadge tone="neutral">{planStatusLabel(company.plan_status)}</StatusBadge></li>)}</ul> : <EmptyState title="Nenhuma empresa recente" description="Os novos cadastros aparecerão aqui."/>}</Panel></>}
  </div></WorkspaceShell>;
}
