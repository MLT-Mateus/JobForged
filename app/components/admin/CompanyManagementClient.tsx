"use client";
import { planLabel, planStatusLabel, auditLabel } from "./display-labels";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ActionButton, AppToast, Panel, PanelHeading, SelectField, StatusBadge, TextField, WorkspacePageHeader, WorkspaceState, type ToastKind } from "@/app/components/ui";

type Company = { id: string; name: string; cnpj: string | null; phone: string | null; plan_id: string; plan_status: string; created_at: string };
type Member = { id: string; email: string; full_name: string; role: "owner" | "admin" | "member"; status: "active" | "inactive"; created_at: string };
type Audit = { id: number; action: string; created_at: string };
type Snapshot = { company: Company; members: Member[]; audit: Audit[]; role: string };

export function CompanyManagementClient({ mode }: { mode: "settings" | "members" }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [name, setName] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [phone, setPhone] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<ToastKind>("info");
  const load = useCallback(async () => {
    const response = await fetch("/api/company", { credentials: "same-origin", cache: "no-store" }).catch(() => null);
    if (!response?.ok) { setMessageKind("danger"); setMessage("Não foi possível carregar os dados da empresa."); return; }
    const snapshot = await response.json() as Snapshot;
    setData(snapshot); setName(snapshot.company.name); setCnpj(snapshot.company.cnpj ?? ""); setPhone(snapshot.company.phone ?? "");
  }, []);
  useEffect(() => {
    let active = true;
    void fetch("/api/company", { credentials: "same-origin", cache: "no-store" })
      .then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<Snapshot>; })
      .then(snapshot => { if (active) { setData(snapshot); setName(snapshot.company.name); setCnpj(snapshot.company.cnpj ?? ""); setPhone(snapshot.company.phone ?? ""); } })
      .catch(() => { if (active) { setMessageKind("danger"); setMessage("Não foi possível carregar os dados da empresa."); } });
    return () => { active = false; };
  }, []);
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/company", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name, cnpj, phone }) }).catch(() => null);
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(response?.ok ? "Dados da empresa atualizados." : "Não foi possível salvar. Revise os campos.");
    if (response?.ok) void load();
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/company/members", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { message?: string } | undefined;
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(result?.message ?? (response?.ok ? "Convite enviado." : "Não foi possível enviar o convite."));
    if (response?.ok) { setInviteEmail(""); void load(); }
  }
  async function changeMember(member: Member, role: Member["role"], status: Member["status"]) {
    setBusy(true); setMessage("");
    const response = await fetch("/api/company/members", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, role, status }) }).catch(() => null);
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(response?.ok ? "Acesso atualizado." : "Você não pode alterar esse acesso.");
    if (response?.ok) void load();
  }
  if (!data) return <><WorkspacePageHeader section="Painel / Empresa" title={mode === "settings" ? "Dados da empresa" : "Equipe e acessos"}/><WorkspaceState kind={message ? "error" : "loading"} title={message || "Carregando empresa…"} action={message ? <ActionButton variant="secondary" onClick={() => { setMessage(""); void load(); }}>Tentar novamente</ActionButton> : undefined}/></>;
  const canManage = data.role === "owner" || data.role === "admin";
  return <><WorkspacePageHeader section={`Painel / ${mode === "settings" ? "Configurações" : "Administradores"}`}
    title={mode === "settings" ? "Dados da empresa" : "Equipe e acessos"}
    description={mode === "settings" ? "Mantenha os dados da sua organização atualizados." : "Usuários vinculados à sua organização."}/>
    {message && <AppToast notice={{kind:messageKind,title:messageKind === "danger" ? "Ação não concluída" : "Atualização da empresa",text:message}} onClose={() => setMessage("")}/>}
    {mode === "settings" ? <div className="jf-workspace-grid"><Panel as="section" className="admin-card"><PanelHeading title="Identificação da empresa" description="Dados usados para identificar sua organização"/>
      <form onSubmit={save} className="admin-form-stack jf-panel-body"><TextField label="Nome da empresa" value={name} maxLength={160} onChange={event => setName(event.target.value)} required />
        <TextField label="CNPJ" value={cnpj} onChange={event => setCnpj(event.target.value.replace(/\D/g, "").slice(0, 14))} />
        <TextField label="Telefone" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, "").slice(0, 13))} />
        <ActionButton type="submit" disabled={!canManage || busy}>Salvar dados</ActionButton></form></Panel>
      <Panel as="section" className="admin-card"><PanelHeading title="Plano atual" description="Situação da assinatura e histórico da empresa"/><div className="jf-panel-body"><div className="admin-facts"><div><span>Plano</span><strong>{planLabel(data.company.plan_id)}</strong></div><div><span>Situação</span><strong>{planStatusLabel(data.company.plan_status)}</strong></div><div><span>Cadastro</span><strong>{new Date(data.company.created_at).toLocaleDateString("pt-BR")}</strong></div></div><h3 className="admin-subheading">Histórico recente</h3>{data.audit.length ? <ul className="admin-audit-list">{data.audit.map(event => <li key={event.id}><span>{auditLabel(event.action)}</span><time>{new Date(event.created_at).toLocaleString("pt-BR")}</time></li>)}</ul> : <p className="admin-muted">Nenhuma alteração registrada.</p>}</div></Panel></div>
      : <div className="admin-management-stack"><Panel as="section" className="admin-card"><PanelHeading title="Convidar pessoa" description="O convite expira em 24 horas e exige o mesmo e-mail confirmado. Cada conta mantém um vínculo empresarial ativo nesta versão."/>
          <form className="admin-form-stack jf-panel-body" onSubmit={invite}><TextField label="E-mail" type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} required />
            <SelectField label="Função" value={inviteRole} onValueChange={value => setInviteRole(value as "admin" | "member")} options={[{value:"member",label:"Membro"},{value:"admin",label:"Administrador"}]}/>
            <ActionButton type="submit" disabled={!canManage || busy}>Enviar convite</ActionButton></form></Panel>
          <Panel as="section" className="admin-card"><PanelHeading title="Equipe vinculada" description="Funções e estado de cada acesso"/><div className="admin-team-list">{data.members.map(member => <article key={member.id}>
            <strong>{member.full_name}</strong><small>{member.email}</small><StatusBadge tone={member.status === "active" ? "positive" : "neutral"}>{member.status === "active" ? "Ativo" : "Suspenso"}</StatusBadge>
            <SelectField label={`Função de ${member.email}`} value={member.role} disabled={!canManage || busy || (member.role === "owner" && data.role !== "owner")}
              onValueChange={role => void changeMember(member, role as Member["role"], member.status)} options={[...(data.role === "owner" || member.role === "owner" ? [{value:"owner",label:"Titular"}] : []),{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/>
            <ActionButton type="button" variant="secondary" disabled={!canManage || busy || member.role === "owner"} onClick={() => void changeMember(member, member.role, member.status === "active" ? "inactive" : "active")}>{member.status === "active" ? "Suspender" : "Reativar"}</ActionButton>
          </article>)}</div></Panel></div>}
  </>;
}
