"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, TextField } from "@/app/components/ui";
import "./auth.css";

export function CompanyInvitationClient({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  async function act(path: string, body: unknown) {
    setBusy(true); setMessage("");
    const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const payload = await response?.json().catch(() => ({})) as { message?: string } | undefined;
    setBusy(false); setMessage(payload?.message ?? (response?.ok ? "Concluído." : "Não foi possível concluir."));
    return Boolean(response?.ok);
  }
  async function register(event: FormEvent<HTMLFormElement>) { event.preventDefault(); await act("/api/auth/invitee-sign-up", { token, email, password }); }
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); const okay = await act("/api/auth/sign-in", { email, password }); if (okay) setMessage("Sessão iniciada. Aceite o convite abaixo."); }
  async function accept() { const okay = await act("/api/company/invitations/accept", { token }); if (okay) { window.history.replaceState(null, "", "/convite"); setDone(true); } }
  return <main className="auth-page auth-page--compact"><div className="auth-layout"><section className="auth-card"><div className="auth-heading"><h1>Convite empresarial</h1><p>Entre com o e-mail convidado e confirmado para participar da empresa.</p></div>
    {!/^[0-9a-f]{64}$/.test(token) && !done ? <p>Convite inválido. Solicite um novo convite à empresa.</p> : done ? <><p>Convite aceito.</p><Link href="/app/home">Abrir aplicativo</Link></> : <>
      <ActionButton type="button" disabled={busy} onClick={accept}>Já entrei: aceitar convite</ActionButton>
      <form className="auth-form" onSubmit={login}><h2>Entrar em uma conta existente</h2><TextField label="E-mail convidado" type="email" value={email} onChange={event => setEmail(event.target.value)} required />
        <TextField label="Senha" type="password" value={password} onChange={event => setPassword(event.target.value)} required /><ActionButton type="submit" disabled={busy}>Entrar</ActionButton></form>
      <form className="auth-form" onSubmit={register}><h2>Criar conta para o convite</h2><p>Use o mesmo e-mail do convite. Depois confirme seu endereço na mensagem recebida.</p>
        <ActionButton type="submit" disabled={busy}>Criar conta com estes dados</ActionButton></form></>}
    {message && <p role="status">{message}</p>}<p><Link href="/recuperar-senha">Esqueci minha senha</Link></p></section></div></main>;
}
