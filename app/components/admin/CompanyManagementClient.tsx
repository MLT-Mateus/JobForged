"use client";
import {publicError} from '@/app/lib/api-response';
import { planLabel, planStatusLabel, auditLabel } from "./display-labels";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, Plus, UsersRound, Mail, CalendarDays, ShieldCheck } from "lucide-react";
import { ActionButton, AppToast, Panel, PanelHeading, SelectField, StatusBadge, TextField, WorkspacePageHeader, WorkspaceState, WidgetDialog, EmptyState, type ToastKind } from "@/app/components/ui";

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
  const [query,setQuery]=useState("");
  const [roleFilter,setRoleFilter]=useState("all");
  const [statusFilter,setStatusFilter]=useState("all");
  const [inviteOpen,setInviteOpen]=useState(false);
  const [selectedMember,setSelectedMember]=useState<Member|null>(null);
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
    const result=await response?.json().catch(()=>null) as {message?:string}|null;
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(response?.ok ? "Dados da empresa atualizados." : publicError(result?.message,"Não foi possível salvar. Confira nome, CNPJ e telefone com DDD."));
    if (response?.ok) void load();
  }
  async function invite(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/company/members", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email: inviteEmail, role: inviteRole }) }).catch(() => null);
    const result = await response?.json().catch(() => ({})) as { message?: string } | undefined;
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(result?.message ?? (response?.ok ? "Convite enviado." : "Não foi possível enviar o convite."));
    if (response?.ok) { setInviteEmail(""); setInviteOpen(false); void load(); }
  }
  async function changeMember(member: Member, role: Member["role"], status: Member["status"]):Promise<boolean> {
    setBusy(true); setMessage("");
    const response = await fetch("/api/company/members", { method: "PATCH", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: member.id, role, status }) }).catch(() => null);
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(response?.ok ? "Acesso atualizado." : "Você não pode alterar esse acesso.");
    if (response?.ok) { void load(); return true; }
    return false;
  }
  if (!data) return <><WorkspacePageHeader section="Painel / Empresa" title={mode === "settings" ? "Dados da empresa" : "Equipe e acessos"}/><WorkspaceState kind={message ? "error" : "loading"} title={message || "Carregando empresa…"} action={message ? <ActionButton variant="secondary" onClick={() => { setMessage(""); void load(); }}>Tentar novamente</ActionButton> : undefined}/></>;
  const canManage = data.role === "owner" || data.role === "admin";
  const filteredMembers=useMemo(()=>data.members.filter(member=>{
    const text=`${member.full_name} ${member.email}`.toLocaleLowerCase("pt-BR");
    return (!query.trim()||text.includes(query.trim().toLocaleLowerCase("pt-BR")))&&(roleFilter==="all"||member.role===roleFilter)&&(statusFilter==="all"||member.status===statusFilter);
  }),[data.members,query,roleFilter,statusFilter]);
  return <><WorkspacePageHeader section={`Painel / ${mode === "settings" ? "Configurações" : "Administradores"}`}
    title={mode === "settings" ? "Dados da empresa" : "Equipe e acessos"}
    description={mode === "settings" ? "Mantenha os dados da sua organização atualizados." : "Usuários vinculados à sua organização."}/>
    {message && <AppToast notice={{kind:messageKind,title:messageKind === "danger" ? "Ação não concluída" : "Atualização da empresa",text:message}} onClose={() => setMessage("")}/>}
    {mode === "settings" ? <div className="jf-workspace-grid"><Panel as="section" className="admin-card"><PanelHeading title="Identificação da empresa" description="Dados usados para identificar sua organização"/>
      <form onSubmit={save} className="admin-form-stack jf-panel-body"><TextField label="Nome da empresa" value={name} maxLength={160} onChange={event => setName(event.target.value)} required />
        <TextField format="cnpj" required label="CNPJ" value={cnpj} onChange={event => setCnpj(event.target.value.replace(/\D/g, "").slice(0, 14))} />
        <TextField format="phone" required label="Telefone" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} />
        <ActionButton type="submit" disabled={!canManage || busy}>Salvar dados</ActionButton></form></Panel>
      <Panel as="section" className="admin-card"><PanelHeading title="Plano atual" description="Situação da assinatura e histórico da empresa"/><div className="jf-panel-body"><div className="admin-facts"><div><span>Plano</span><strong>{planLabel(data.company.plan_id)}</strong></div><div><span>Situação</span><strong>{planStatusLabel(data.company.plan_status)}</strong></div><div><span>Cadastro</span><strong>{new Date(data.company.created_at).toLocaleDateString("pt-BR")}</strong></div></div><h3 className="admin-subheading">Histórico recente</h3>{data.audit.length ? <ul className="admin-audit-list">{data.audit.map(event => <li key={event.id}><span>{auditLabel(event.action)}</span><time>{new Date(event.created_at).toLocaleString("pt-BR")}</time></li>)}</ul> : <p className="admin-muted">Nenhuma alteração registrada.</p>}</div></Panel></div>
      : <div className="jf-admin-directory"><Panel className="jf-admin-directory__panel"><PanelHeading title="Equipe e administradores" description="Encontre uma pessoa, confira seu acesso e abra os detalhes quando precisar gerenciar a conta." action={<ActionButton disabled={!canManage} icon={<Plus size={17}/>} onClick={()=>{setInviteEmail("");setInviteRole("admin");setInviteOpen(true)}}>Convidar administrador</ActionButton>}/>
        <div className="jf-admin-directory__filters"><label className="jf-admin-directory__search"><Search size={18}/><span className="jf-sr-only">Buscar por nome ou e-mail</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Buscar nome ou e-mail..."/></label><SelectField label="Função" value={roleFilter} onValueChange={setRoleFilter} options={[{value:"all",label:"Todas as funções"},{value:"owner",label:"Titular"},{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/><SelectField label="Acesso" value={statusFilter} onValueChange={setStatusFilter} options={[{value:"all",label:"Todos os estados"},{value:"active",label:"Ativo"},{value:"inactive",label:"Suspenso"}]}/></div>
        <div className="jf-admin-directory__summary"><span><UsersRound size={16}/>{filteredMembers.length} {filteredMembers.length===1?"pessoa encontrada":"pessoas encontradas"}</span><span>{data.members.filter(m=>m.role==="admin"&&m.status==="active").length} administradores ativos</span></div>
        {filteredMembers.length?<div className="jf-admin-directory__list">{filteredMembers.map(member=><button type="button" className="jf-admin-directory__row" key={member.id} onClick={()=>setSelectedMember(member)}><span className="jf-admin-directory__avatar">{member.full_name.trim().charAt(0).toLocaleUpperCase("pt-BR")||"?"}</span><span className="jf-admin-directory__identity"><strong>{member.full_name||"Nome não informado"}</strong><small><Mail size={14}/>{member.email}</small></span><span className="jf-admin-directory__role">{member.role==="owner"?"Titular":member.role==="admin"?"Administrador":"Membro"}</span><StatusBadge tone={member.status==="active"?"positive":"neutral"}>{member.status==="active"?"Ativo":"Suspenso"}</StatusBadge><span className="jf-admin-directory__open">Ver detalhes →</span></button>)}</div>:<EmptyState variant="compact" icon={Search} title={data.members.length?"Nenhum resultado":"Sua equipe começa aqui"} description={data.members.length?"Ajuste os filtros para encontrar alguém.":"Convide um administrador para ajudar a gerenciar esta empresa."} action={!data.members.length&&canManage?<ActionButton onClick={()=>{setInviteRole("admin");setInviteOpen(true)}}>Convidar administrador</ActionButton>:undefined}/>}
      </Panel>
      <WidgetDialog open={inviteOpen} onClose={()=>{if(!busy)setInviteOpen(false)}} title="Convidar administrador" description="Enviaremos um convite por e-mail. O link é válido por 24 horas e precisa ser aceito com o mesmo endereço confirmado."><form className="jf-workspace-stack" onSubmit={invite}><TextField label="E-mail do administrador" type="email" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} placeholder="Digite o e-mail..." required/><SelectField label="Função" value={inviteRole} onValueChange={value=>setInviteRole(value as "admin"|"member")} options={[{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/><p className="jf-admin-directory__hint"><Mail size={16}/> A pessoa receberá instruções para entrar e definir o acesso à empresa.</p><div className="jf-workspace-toolbar"><ActionButton type="submit" disabled={!canManage||busy}>{busy?"Enviando convite…":"Enviar convite"}</ActionButton><ActionButton type="button" variant="secondary" disabled={busy} onClick={()=>setInviteOpen(false)}>Cancelar</ActionButton></div></form></WidgetDialog>
      <WidgetDialog open={!!selectedMember} onClose={()=>setSelectedMember(null)} title={selectedMember?.full_name||"Detalhes do acesso"} description="Informações e ações para este vínculo empresarial." kind="drawer">{selectedMember&&<div className="jf-admin-member-details"><div className="jf-admin-member-details__identity"><span className="jf-admin-directory__avatar">{selectedMember.full_name.trim().charAt(0).toLocaleUpperCase("pt-BR")||"?"}</span><div><strong>{selectedMember.full_name||"Nome não informado"}</strong><span>{selectedMember.email}</span></div></div><div className="jf-admin-member-details__facts"><div><ShieldCheck size={17}/><span>Função</span><strong>{selectedMember.role==="owner"?"Titular":selectedMember.role==="admin"?"Administrador":"Membro"}</strong></div><div><StatusBadge tone={selectedMember.status==="active"?"positive":"neutral"}>{selectedMember.status==="active"?"Acesso ativo":"Acesso suspenso"}</StatusBadge></div><div><CalendarDays size={17}/><span>Vínculo desde</span><strong>{new Date(selectedMember.created_at).toLocaleDateString("pt-BR")}</strong></div></div>{canManage&&selectedMember.role!=="owner"&&<div className="jf-admin-member-details__actions"><SelectField label="Alterar função" value={selectedMember.role} disabled={busy} onValueChange={async role=>{const next={...selectedMember,role:role as Member["role"]};if(await changeMember(next,next.role,next.status))setSelectedMember(next)}} options={[{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/><ActionButton variant={selectedMember.status==="active"?"danger":"secondary"} disabled={busy} onClick={async()=>{const next={...selectedMember,status:(selectedMember.status==="active"?"inactive":"active") as Member["status"]};if(await changeMember(next,next.role,next.status))setSelectedMember(next)}}>{selectedMember.status==="active"?"Suspender acesso":"Reativar acesso"}</ActionButton></div>}</div>}</WidgetDialog></div>}
  </>;
}
