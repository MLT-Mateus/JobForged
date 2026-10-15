"use client";
import { useEffect, useState } from "react";
import { WorkspaceShell } from "@/app/components/ui/WorkspaceShell";
import { Panel, StatusBadge } from "@/app/components/ui";
import { ShieldCheck } from "lucide-react";
import { signOutCompany } from "@/app/components/auth/auth-service";

type Overview = { companies: number; members: number; recentCompanies: Array<{ id: string; name: string; plan_id: string; plan_status: string; created_at: string }> };
export function BackofficeClient({ email }: { email: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [error, setError] = useState("");
  useEffect(() => { void fetch("/api/backoffice", { credentials: "same-origin", cache: "no-store" })
    .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ overview: Overview }>; })
    .then(data => setOverview(data.overview)).catch(() => setError("Não foi possível carregar dados autorizados.")); }, []);
  return <WorkspaceShell items={[{ label: "Backoffice", href: "/backoffice", icon: ShieldCheck, active: true }]} logo="/brand/jobforged-symbol.svg" brand="JobForged" title="JobForged" subtitle="Administração interna" footer={<button type="button" className="jf-action jf-action--quiet" onClick={async () => { await signOutCompany(); location.replace("/login"); }}>Sair</button>}><div className="admin-main">
    <header className="admin-page-head"><div><span>JobForged / Backoffice</span><h1>Visão administrativa</h1><p>Dados operacionais permitidos para {email}.</p></div></header>
    {error && <p role="alert">{error}</p>}
    {!overview && !error && <p role="status">Carregando dados…</p>}
    {overview && <><div className="admin-metrics"><Panel><h2>Empresas</h2><strong>{overview.companies}</strong></Panel><Panel><h2>Usuários vinculados</h2><strong>{overview.members}</strong></Panel></div>
      <Panel as="section" className="admin-card"><h2>Empresas recentes</h2><ul>{overview.recentCompanies.map(company => <li key={company.id}><strong>{company.name}</strong> · <StatusBadge>{company.plan_status}</StatusBadge> · {new Date(company.created_at).toLocaleDateString("pt-BR")}</li>)}</ul></Panel></>}
  </div></WorkspaceShell>;
}
