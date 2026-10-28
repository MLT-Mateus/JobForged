"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, AppToast, TextField } from "@/app/components/ui";
import { BrandAsset } from "@/app/components/BrandAsset";
import { isEmail } from "./auth-validation";
import { focusFirstInvalid } from "./focus-first-invalid";
import { playStatusSound } from "@/app/components/ui/status-sound";
import type { ToastKind } from "@/app/components/ui";
import "./auth.css";

export function ConfirmEmailClient({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "invalid">(type === "signup" && tokenHash ? "pending" : "invalid");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [messageKind, setMessageKind] = useState<ToastKind>("info");
  async function confirm() {
    setStatus("loading");
    const response = await fetch("/api/auth/confirmation/session", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenHash, type }) }).catch(() => null);
    if (response?.ok) {
      window.history.replaceState(null, "", "/confirmar-email");
      setStatus("success");
      playStatusSound("success");
    } else { window.history.replaceState(null, "", "/confirmar-email"); setStatus("invalid"); }
  }
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!isEmail(email)) {
      setMessageKind("danger"); setMessage("Informe um e-mail válido para solicitar outro link.");
      focusFirstInvalid(event.currentTarget, ["email"]);
      return;
    }
    const response = await fetch("/api/auth/confirmation/resend", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setMessageKind(response?.ok ? "info" : "danger"); setMessage(response?.ok ? "Se houver um cadastro pendente, enviaremos um novo link." : "Confira o e-mail e tente novamente.");
  }
  return <main className="auth-page auth-page--compact"><div className="auth-layout"><section className="auth-card">
    <Link href="/" className="brand"><BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={190} height={55} /></Link>
    <div className="auth-heading"><h1>Confirme seu e-mail</h1><p>O link será usado somente quando você clicar em confirmar.</p></div>
    {status === "pending" && <ActionButton type="button" onClick={confirm}>Confirmar meu e-mail</ActionButton>}
    {status === "loading" && <p role="status">Validando link…</p>}
    {status === "success" && <><p>E-mail confirmado. Entre na sua conta ou volte ao convite recebido para concluir a associação à empresa.</p><Link href="/login">Ir para o login</Link></>}
    {status === "invalid" && <><p>Este link expirou, já foi usado ou é inválido. Peça outro e-mail de confirmação.</p>
      <form className="auth-form" noValidate onSubmit={resend}><TextField name="email" label="E-mail do cadastro" type="email" value={email} onChange={event => setEmail(event.target.value)} />
      <ActionButton type="submit">Solicitar novo e-mail</ActionButton></form>{message && <AppToast notice={{kind:messageKind,title:messageKind === "danger" ? "Confira a solicitação" : "Confirmação de e-mail",text:message}} onClose={() => setMessage("")}/>}</>}
    <p><Link href="/login">Voltar ao login</Link></p>
  </section></div></main>;
}
