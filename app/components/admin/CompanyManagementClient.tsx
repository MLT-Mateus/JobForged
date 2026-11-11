"use client";
import {publicError} from '@/app/lib/api-response';
import { planLabel, planStatusLabel } from "./display-labels";

import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { Search, Plus, UsersRound, Mail, CalendarDays, ShieldCheck, Contact, Phone, Check, Pause } from "lucide-react";
import { ActionButton, UserAvatar, DisplayValue, AppToast, Panel, PanelHeading, SelectField, StatusBadge, TextField, WorkspacePageHeader, WorkspaceState, WidgetDialog, EmptyState, WorkspaceTabs, WorkspacePagination, type ToastKind } from "@/app/components/ui";

import {CompanyActivity} from './CompanyActivity';
import {MemberIdentityForm} from './MemberIdentityForm';
import { memberRoles as roles } from './member-roles';
import { maskCpf, maskPhone } from '../ui/input-format';

type Company = { id: string; name: string; cnpj: string | null; phone: string | null; plan_id: string; plan_status: string; created_at: string };
type Member = { id: string; photo_version?:number; email?: string; cpf?:string|null; phone?:string|null; full_name: string; role: "owner" | "admin" | "member"; status?: "active" | "inactive"; created_at: string };
const normalizeSearch = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("pt-BR");

type Audit = { id: number; action: string; created_at: string };
type Snapshot = { company: Company; members: Member[]; audit: Audit[]; role: string };

export function CompanyManagementClient({ mode }: { mode: "settings" | "members" }) {
  const [settingsTab,setSettingsTab]=useState<"details"|"activity">("details");
  const [memberPage,setMemberPage]=useState(1);
  const [editingIdentity,setEditingIdentity]=useState(false);
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
  const filteredMembers=useMemo(()=> (data?.members??[]).filter(member=>{
    const text=normalizeSearch(`${member.full_name} ${member.email??""} ${member.cpf??""} ${member.cpf?maskCpf(member.cpf):""}`);
    return (!query.trim()||text.includes(normalizeSearch(query.trim())))&&(roleFilter==="all"||member.role===roleFilter)&&(statusFilter==="all"||member.status===statusFilter);
  }),[data?.members,query,roleFilter,statusFilter]);
  if (!data) return <><WorkspacePageHeader section="Painel / Empresa" title={mode === "settings" ? "Dados da empresa" : "Equipe e acessos"}/><WorkspaceState kind={message ? "error" : "loading"} title={message || "Carregando empresa…"} action={message ? <ActionButton variant="secondary" onClick={() => { setMessage(""); void load(); }}>Tentar novamente</ActionButton> : undefined}/></>;
  const canManage = data.role === "owner" || data.role === "admin";
  return <><WorkspacePageHeader section={mode === "settings" ? "" : "Painel / Administradores"}
    title={mode === "settings" ? settingsTab==="activity"?"Atividades da empresa":"Dados da empresa" : "Equipe e acessos"}
    description={mode === "settings" ? settingsTab==="activity"?"Consulte as alterações e quem realizou cada ação.":"Mantenha os dados da sua organização atualizados." : "Usuários vinculados à sua organização."}/>
    {message && <AppToast notice={{kind:messageKind,title:messageKind === "danger" ? "Ação não concluída" : "Atualização da empresa",text:message}} onClose={() => setMessage("")}/>}
    {mode === "settings"&&canManage&&<WorkspaceTabs label="Configurações da empresa" value={settingsTab} onValueChange={setSettingsTab} items={[{id:"details",label:"Dados da empresa"},{id:"activity",label:"Histórico de atividades"}]}/>}
    {mode === "settings" ? settingsTab==="activity"&&canManage?<CompanyActivity/>:<div className="jf-workspace-grid"><Panel as="section" className="admin-card"><PanelHeading title="Identificação da empresa" description="Dados usados para identificar sua organização"/>
      <form onSubmit={save} className="admin-form-stack jf-panel-body"><TextField label="Nome da empresa" value={name} maxLength={160} onChange={event => setName(event.target.value)} required />
        <TextField format="cnpj" required label="CNPJ" value={cnpj} onChange={event => setCnpj(event.target.value.replace(/\D/g, "").slice(0, 14))} />
        <TextField format="phone" required label="Telefone" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, "").slice(0, 11))} />
        <ActionButton type="submit" disabled={!canManage || busy}>Salvar dados</ActionButton></form></Panel>
      <Panel as="section" className="admin-card"><PanelHeading title="Plano atual" description="Informações da assinatura e do cadastro"/><div className="jf-panel-body"><div className="admin-facts"><div><span>Plano</span><strong>{planLabel(data.company.plan_id)}</strong></div><div><span>Situação</span><strong>{planStatusLabel(data.company.plan_status)}</strong></div><div><span>Cadastro</span><strong>{new Date(data.company.created_at).toLocaleDateString("pt-BR")}</strong></div></div></div></Panel></div>
      : <div className="jf-admin-directory"><Panel className="jf-admin-directory__panel"><PanelHeading title="Equipe e administradores" description="Encontre uma pessoa, confira seu acesso e abra os detalhes quando precisar gerenciar a conta." action={<ActionButton disabled={!canManage} icon={<Plus size={17}/>} onClick={()=>{setInviteEmail("");setInviteRole("admin");setInviteOpen(true)}}>Convidar</ActionButton>}/>
        <div className="jf-admin-directory__filters"><TextField className="jf-admin-directory__search" label="Buscar por nome, e-mail ou CPF" placeholder="Busque uma pessoa..." icon={Search} type="search" value={query} onChange={event => {setQuery(event.target.value);setMemberPage(1)}}/><SelectField label="Função" value={roleFilter} onValueChange={value=>{setRoleFilter(value);setMemberPage(1)}} options={[{value:"all",label:"Todas as funções"},{value:"owner",label:"Titular"},{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/><SelectField label="Acesso" value={statusFilter} onValueChange={value=>{setStatusFilter(value);setMemberPage(1)}} options={[{value:"all",label:"Todos os estados"},{value:"active",label:"Ativo"},{value:"inactive",label:"Suspenso"}]}/></div>
        <div className="jf-admin-directory__summary"><span><UsersRound size={16}/>{filteredMembers.length} {filteredMembers.length===1?"pessoa encontrada":"pessoas encontradas"}</span><span>{data.members.filter(m=>["owner","admin"].includes(m.role)&&m.status==="active").length} pessoas com gestão ativa</span></div>
        {filteredMembers.length?<div className="jf-admin-directory__list">{filteredMembers.slice((Math.min(memberPage,Math.max(1,Math.ceil(filteredMembers.length/10)))-1)*10,Math.min(memberPage,Math.max(1,Math.ceil(filteredMembers.length/10)))*10).map(member=><article className="jf-admin-directory__row" key={member.id}><UserAvatar name={member.full_name} memberId={member.id} version={member.photo_version}/><span className="jf-admin-directory__identity"><strong>{member.full_name||"Nome não informado"}</strong><small><Mail size={14}/><DisplayValue value={member.email} state={canManage?"ready":"unavailable"}/></small>{canManage&&<small><Contact size={14}/> CPF: <DisplayValue value={member.cpf?maskCpf(member.cpf):null}/></small>}{canManage&&<small><Phone size={14}/> Telefone: <DisplayValue value={member.phone?maskPhone(member.phone):null}/></small>}<small><CalendarDays size={14}/> Na equipe desde {new Date(member.created_at).toLocaleDateString("pt-BR")}</small></span><StatusBadge tone={roles[member.role].tone} description={roles[member.role].description}>{roles[member.role].label}</StatusBadge><StatusBadge tone={member.status==="inactive"?"neutral":"positive"}>{member.status==="inactive"?<Pause size={13}/>:<Check size={13}/>} {member.status==="inactive"?"Suspenso":"Ativo"}</StatusBadge><ActionButton type="button" variant="secondary" aria-label={`Ver detalhes de ${member.full_name || member.email}`} onClick={()=>{setEditingIdentity(false);setSelectedMember(member)}}>Detalhes</ActionButton></article>)}</div>:<EmptyState variant="compact" icon={Search} title={data.members.length?"Nenhum resultado":"Sua equipe começa aqui"} description={data.members.length?"Ajuste os filtros para encontrar alguém.":"Convide um administrador para ajudar a gerenciar esta empresa."} action={!data.members.length&&canManage?<ActionButton onClick={()=>{setInviteRole("admin");setInviteOpen(true)}}>Convidar administrador</ActionButton>:undefined}/>}
      <WorkspacePagination page={Math.min(memberPage,Math.max(1,Math.ceil(filteredMembers.length/10)))} pageSize={10} total={filteredMembers.length} onPage={setMemberPage} label="Paginação da equipe"/></Panel>
      <WidgetDialog open={inviteOpen} onClose={()=>{if(!busy)setInviteOpen(false)}} title="Convidar administrador" description="Enviaremos um convite por e-mail. O link é válido por 24 horas e precisa ser aceito com o mesmo endereço confirmado."><form className="jf-workspace-stack" onSubmit={invite}><TextField label="E-mail do administrador" type="email" value={inviteEmail} onChange={event=>setInviteEmail(event.target.value)} placeholder="Digite o e-mail..." required/><SelectField label="Função" value={inviteRole} onValueChange={value=>setInviteRole(value as "admin"|"member")} options={[{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/><p className="jf-admin-directory__hint"><Mail size={16}/> A pessoa receberá instruções para entrar e definir o acesso à empresa.</p><div className="jf-workspace-toolbar"><ActionButton type="submit" disabled={!canManage||busy}>{busy?"Enviando convite…":"Enviar convite"}</ActionButton><ActionButton type="button" variant="secondary" disabled={busy} onClick={()=>setInviteOpen(false)}>Cancelar</ActionButton></div></form></WidgetDialog>
      <WidgetDialog open={!!selectedMember} onClose={()=>setSelectedMember(null)} title={selectedMember?.full_name||"Detalhes do acesso"} description="Informações e ações para este vínculo empresarial." kind="drawer">{selectedMember&&<div className="jf-admin-member-details"><div className="jf-admin-member-details__identity"><UserAvatar name={selectedMember.full_name} memberId={selectedMember.id} version={selectedMember.photo_version} large/><div><strong>{selectedMember.full_name||"Nome não informado"}</strong><span><DisplayValue value={selectedMember.email} state={canManage?"ready":"unavailable"}/></span></div></div>{editingIdentity?<MemberIdentityForm key={selectedMember.id} member={selectedMember} onCancel={()=>setEditingIdentity(false)} onSaved={value=>{setSelectedMember({...selectedMember,...value});setEditingIdentity(false);setMessageKind("success");setMessage("Identificação atualizada.");void load();window.dispatchEvent(new Event("jobforged-profile-updated"))}}/>:<><div className="jf-admin-member-details__facts">{canManage&&<><div><Contact size={17}/><span>CPF</span><strong><DisplayValue value={selectedMember.cpf?maskCpf(selectedMember.cpf):null}/></strong></div><div><Phone size={17}/><span>Telefone</span><strong><DisplayValue value={selectedMember.phone?maskPhone(selectedMember.phone):null}/></strong></div></>}<div><ShieldCheck size={17}/><span>Função</span><StatusBadge tone={roles[selectedMember.role].tone} description={roles[selectedMember.role].description}>{roles[selectedMember.role].label}</StatusBadge></div><div><StatusBadge tone={selectedMember.status==="active"?"positive":"neutral"}>{selectedMember.status==="active"?"Acesso ativo":"Acesso suspenso"}</StatusBadge></div><div><CalendarDays size={17}/><span>Vínculo desde</span><strong>{new Date(selectedMember.created_at).toLocaleDateString("pt-BR")}</strong></div></div>{canManage&&(selectedMember.role!=="owner"||data.role==="owner")&&<ActionButton variant="secondary" onClick={()=>setEditingIdentity(true)}>Editar dados</ActionButton>}</>}{canManage&&!editingIdentity&&selectedMember.role!=="owner"&&<div className="jf-admin-member-details__actions"><SelectField label="Alterar função" value={selectedMember.role} disabled={busy} onValueChange={async role=>{const next={...selectedMember,role:role as Member["role"]};if(await changeMember(next,next.role,next.status))setSelectedMember(next)}} options={[{value:"admin",label:"Administrador"},{value:"member",label:"Membro"}]}/><ActionButton variant={selectedMember.status==="active"?"danger":"secondary"} disabled={busy} onClick={async()=>{const next={...selectedMember,status:(selectedMember.status==="active"?"inactive":"active") as Member["status"]};if(await changeMember(next,next.role,next.status))setSelectedMember(next)}}>{selectedMember.status==="active"?"Suspender acesso":"Reativar acesso"}</ActionButton></div>}</div>}</WidgetDialog></div>}
  </>;
}
