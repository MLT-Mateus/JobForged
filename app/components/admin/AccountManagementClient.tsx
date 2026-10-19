"use client";
import { roleLabel } from "./display-labels";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, AppToast, InlineNotice, Panel, PanelHeading, TextField, WorkspacePageHeader, WorkspaceState } from "@/app/components/ui";
import { useCompanyAuthSession, type AuthSessionState } from "@/app/components/auth/auth-service";
import type { ToastKind } from "@/app/components/ui";

export function AccountManagementClient() {
  const session = useCompanyAuthSession();
  if (session.checking) return <WorkspaceState title="Carregando perfil…"/>;
  return <AccountEditor session={session} />;
}

function AccountEditor({ session }: { session: AuthSessionState }) {
  const [fullName, setFullName] = useState(session.fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<ToastKind>("info");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/account", { method: "PATCH", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName }) }).catch(() => null);
    const payload = await response?.json().catch(() => ({})) as { fullName?: string; message?: string } | undefined;
    setBusy(false); setMessageKind(response?.ok ? "success" : "danger"); setMessage(response?.ok ? "Perfil salvo." : payload?.message ?? "Não foi possível salvar.");
    if (payload?.fullName) setFullName(payload.fullName);
  }
  return <><WorkspacePageHeader section="Painel / Minha Conta" title="Minha Conta" description="Gerencie suas informações pessoais e opções de acesso."/>
    <div className="jf-workspace-grid"><Panel as="section" className="admin-card"><PanelHeading title="Meu perfil" description="Informações da conta confirmada"/>
      <form className="admin-form-stack jf-panel-body" onSubmit={save}><TextField label="Nome completo" value={fullName} maxLength={120} onChange={event => setFullName(event.target.value)} required />
        <TextField label="E-mail confirmado" type="email" value={session.email ?? ""} readOnly />
        <ActionButton type="submit" disabled={busy}>Salvar perfil</ActionButton></form>{message && <><div className="admin-panel-feedback"><InlineNotice tone={messageKind === "danger" ? "danger" : messageKind === "success" ? "success" : "info"}>{message}</InlineNotice></div><AppToast notice={{kind:messageKind,title:messageKind === "danger" ? "Perfil não salvo" : "Perfil atualizado",text:message}} onClose={() => setMessage("")}/></>}</Panel>
      <Panel as="section" className="admin-card"><PanelHeading title="Acesso e segurança" description="Vínculo empresarial e recuperação da conta"/><div className="jf-panel-body"><div className="admin-facts"><div><span>Empresa</span><strong>{session.company?.name}</strong></div><div><span>Função</span><strong>{roleLabel(session.role)}</strong></div></div><p className="admin-muted">Para alterar sua senha, solicite um link de uso único ao seu e-mail.</p><Link className="jf-action jf-action--secondary" href="/recuperar-senha">Solicitar alteração de senha</Link></div></Panel></div></>;
}
