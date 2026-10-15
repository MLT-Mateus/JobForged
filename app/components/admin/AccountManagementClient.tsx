"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, Panel, TextField } from "@/app/components/ui";
import { useCompanyAuthSession, type AuthSessionState } from "@/app/components/auth/auth-service";

export function AccountManagementClient() {
  const session = useCompanyAuthSession();
  if (session.checking) return <p role="status">Carregando perfil…</p>;
  return <AccountEditor session={session} />;
}

function AccountEditor({ session }: { session: AuthSessionState }) {
  const [fullName, setFullName] = useState(session.fullName ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("");
    const response = await fetch("/api/account", { method: "PATCH", credentials: "same-origin",
      headers: { "Content-Type": "application/json" }, body: JSON.stringify({ fullName }) }).catch(() => null);
    const payload = await response?.json().catch(() => ({})) as { fullName?: string; message?: string } | undefined;
    setBusy(false); setMessage(response?.ok ? "Perfil salvo." : payload?.message ?? "Não foi possível salvar.");
    if (payload?.fullName) setFullName(payload.fullName);
  }
  return <><header className="admin-page-head"><div><span>Painel / Minha Conta</span><h1>Minha Conta</h1><p>Dados reais do seu acesso empresarial.</p></div></header>
    <div className="admin-settings-grid"><Panel as="section" className="admin-card admin-form"><h2>Meu perfil</h2>
      <form className="auth-form" onSubmit={save}><TextField label="Nome completo" value={fullName} maxLength={120} onChange={event => setFullName(event.target.value)} required />
        <TextField label="E-mail confirmado" type="email" value={session.email ?? ""} readOnly />
        <ActionButton type="submit" disabled={busy}>Salvar perfil</ActionButton></form>{message && <p role="status">{message}</p>}</Panel>
      <Panel as="section" className="admin-card"><h2>Acesso e segurança</h2><p><strong>Empresa:</strong> {session.company?.name}</p><p><strong>Função:</strong> {session.role}</p>
        <p>Para alterar sua senha, solicite um link de uso único ao seu e-mail.</p><Link href="/recuperar-senha">Solicitar alteração de senha</Link></Panel></div></>;
}
