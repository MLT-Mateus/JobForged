"use client";
import { roleLabel } from "./display-labels";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, AppToast, Panel, PanelHeading, TextField, WorkspacePageHeader, WorkspaceState } from "@/app/components/ui";
import { signOutCompany, useCompanyAuthSession, type AuthSessionState } from "@/app/components/auth/auth-service";
import type { ToastKind } from "@/app/components/ui";

export function AccountManagementClient({embedded=false}:{embedded?:boolean}) {
  const session = useCompanyAuthSession();
  if (session.checking) return <WorkspaceState title="Carregando perfil…"/>;
  return <AccountEditor session={session} embedded={embedded} />;
}

function AccountEditor({ session,embedded }: { session: AuthSessionState;embedded:boolean }) {
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
  return <>{!embedded&&<WorkspacePageHeader section="Painel / Minha Conta" title="Minha Conta" description="Gerencie suas informações pessoais e opções de acesso."/>}
    <div className="jf-workspace-grid"><Panel as="section" className="admin-card"><PanelHeading title="Meu perfil" description="Informações da conta confirmada"/>
      <form className="admin-form-stack jf-panel-body" onSubmit={event=>session.platformAdmin?event.preventDefault():void save(event)}><TextField readOnly={session.platformAdmin} label="Nome completo" placeholder="Seu nome completo" value={fullName} maxLength={120} onChange={event => setFullName(event.target.value)} required />
        <TextField label="E-mail confirmado" placeholder="nome@empresa.com.br" type="email" value={session.email ?? ""} readOnly />
        {!session.platformAdmin&&<ActionButton type="submit" disabled={busy}>Salvar perfil</ActionButton>}</form>{message && <AppToast notice={{kind:messageKind,title:messageKind === "danger" ? "Não foi possível concluir a ação" : "Perfil atualizado",text:message}} onClose={() => setMessage("")}/>}</Panel>
      <Panel as="section" className="admin-card"><PanelHeading title="Acesso e segurança" description="Vínculo empresarial e recuperação da conta"/><div className="jf-panel-body"><div className="admin-facts"><div><span>Empresa</span><strong>{session.platformAdmin?"JobForged":session.company?.name}</strong></div><div><span>Função</span><strong>{session.platformAdmin?"Administrador da plataforma":roleLabel(session.role)}</strong></div></div><p className="admin-muted">Para alterar sua senha, solicite um link de uso único ao seu e-mail.</p><Link className="jf-action jf-action--secondary" href="/recuperar-senha">Solicitar alteração de senha</Link><div className="jf-workspace-toolbar"><ActionButton type="button" variant="secondary" disabled={busy} onClick={async()=>{setBusy(true);const result=await signOutCompany();if(result.ok){location.replace("/login");return}setBusy(false);setMessageKind("danger");setMessage("Não foi possível encerrar a sessão. Tente novamente.")}}>Sair da conta</ActionButton></div></div></Panel></div></>;
}
