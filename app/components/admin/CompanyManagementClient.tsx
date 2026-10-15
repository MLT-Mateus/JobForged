"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ActionButton, Panel, StatusBadge, TextField, type ToastKind } from "@/app/components/ui";
import { useStatusSoundForMessage } from "@/app/components/ui/status-sound";

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
  useStatusSoundForMessage(message, messageKind);
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
  if (!data) return <p role="status">{message || "Carregando empresa…"}</p>;
  const canManage = data.role === "owner" || data.role === "admin";
  return <><header className="admin-page-head"><div><span>Painel / {mode === "settings" ? "Configurações" : "Administradores"}</span>
    <h1>{mode === "settings" ? "Dados da empresa" : "Equipe e acessos"}</h1>
    <p>{mode === "settings" ? "Informações persistidas da sua organização." : "Usuários vinculados à sua organização."}</p></div></header>
    {message && <p role="status">{message}</p>}
    {mode === "settings" ? <div className="admin-settings-grid"><Panel as="section" className="admin-card admin-form"><h2>Identificação da empresa</h2>
      <form onSubmit={save} className="auth-form"><TextField label="Nome da empresa" value={name} maxLength={160} onChange={event => setName(event.target.value)} required />
        <TextField label="CNPJ" value={cnpj} onChange={event => setCnpj(event.target.value.replace(/\D/g, "").slice(0, 14))} />
        <TextField label="Telefone" value={phone} onChange={event => setPhone(event.target.value.replace(/\D/g, "").slice(0, 13))} />
        <ActionButton type="submit" disabled={!canManage || busy}>Salvar dados</ActionButton></form></Panel>
      <Panel as="section" className="admin-card"><h2>Plano atual</h2><p>{data.company.plan_id} · {data.company.plan_status}</p><p>Cadastro criado em {new Date(data.company.created_at).toLocaleDateString("pt-BR")}.</p>
        <h3>Histórico recente</h3><ul>{data.audit.map(event => <li key={event.id}>{event.action} · {new Date(event.created_at).toLocaleString("pt-BR")}</li>)}</ul></Panel></div>
      : <><Panel as="section" className="admin-card"><h2>Convidar pessoa</h2><p>O convite expira em 24 horas e exige o mesmo e-mail confirmado. Cada conta mantém um vínculo empresarial ativo nesta versão.</p>
          <form className="auth-form" onSubmit={invite}><TextField label="E-mail" type="email" value={inviteEmail} onChange={event => setInviteEmail(event.target.value)} required />
            <label>Função <select value={inviteRole} onChange={event => setInviteRole(event.target.value as "admin" | "member") }><option value="member">Membro</option><option value="admin">Administrador</option></select></label>
            <ActionButton type="submit" disabled={!canManage || busy}>Enviar convite</ActionButton></form></Panel>
          <Panel as="section" className="admin-card"><h2>Equipe vinculada</h2><div className="admin-team-list">{data.members.map(member => <article key={member.id}>
            <strong>{member.full_name}</strong><small>{member.email}</small><StatusBadge tone={member.status === "active" ? "positive" : "neutral"}>{member.status === "active" ? "Ativo" : "Suspenso"}</StatusBadge>
            <select aria-label={`Função de ${member.email}`} value={member.role} disabled={!canManage || busy || (member.role === "owner" && data.role !== "owner")}
              onChange={event => void changeMember(member, event.target.value as Member["role"], member.status)}><option value="owner" disabled={data.role !== "owner"}>Titular</option><option value="admin">Administrador</option><option value="member">Membro</option></select>
            <ActionButton type="button" variant="secondary" disabled={!canManage || busy || member.role === "owner"} onClick={() => void changeMember(member, member.role, member.status === "active" ? "inactive" : "active")}>{member.status === "active" ? "Suspender" : "Reativar"}</ActionButton>
          </article>)}</div></Panel></>}
  </>;
}
