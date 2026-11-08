"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { ActionButton, AppToast, TextField, createToastNotice, type ToastNotice } from "@/app/components/ui";
import { BrandAsset } from "@/app/components/BrandAsset";
import { isEmail } from "./auth-validation";
import { focusFirstInvalid } from "./focus-first-invalid";
import "./auth.css";

export function ConfirmEmailClient({ tokenHash, type }: { tokenHash: string; type: string }) {
  const [status, setStatus] = useState<"pending" | "loading" | "success" | "invalid">(type === "signup" && tokenHash ? "pending" : "invalid");
  const [destination,setDestination]=useState("/login");
  const [email, setEmail] = useState("");
  const [notice,setNotice]=useState<ToastNotice|null>(null);
  const [resending,setResending]=useState(false);
  async function confirm() {
    setNotice(null);
    setStatus("loading");
    const response = await fetch("/api/auth/confirmation/session", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tokenHash, type }) }).catch(() => null);
    if (response?.ok) {
      window.history.replaceState(null, "", "/confirmar-email");
      const session=await fetch("/api/auth/session",{credentials:"same-origin",cache:"no-store"}).then(r=>r.ok?r.json():null).catch(()=>null) as {role?:string;originSlug?:string}|null;if(session?.role==="candidate"&&session.originSlug)setDestination("/"+session.originSlug);
      setStatus("success");
      setNotice(createToastNotice({kind:"success",title:"E-mail confirmado",text:"Seu e-mail foi validado. Você já pode continuar o acesso."}));
    } else { window.history.replaceState(null, "", "/confirmar-email"); setStatus("invalid"); setNotice(createToastNotice({kind:"danger",title:"Não foi possível confirmar",text:"O link pode ter expirado ou já ter sido usado. Solicite um novo e-mail de confirmação."})); }
  }
  async function resend(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);
    if (!isEmail(email)) {
      setNotice(createToastNotice({kind:"danger",title:"Confira o e-mail",text:"Informe um e-mail válido para solicitar outro link."}));
      focusFirstInvalid(event.currentTarget, ["email"]);
      return;
    }
    setResending(true);
    const response = await fetch("/api/auth/confirmation/resend", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email }) }).catch(() => null);
    setResending(false);
    setNotice(createToastNotice({kind:response?.ok?"info":"danger",title:response?.ok?"Solicitação recebida":"Não foi possível solicitar",text:response?.ok?"Se houver um cadastro pendente, enviaremos um novo link.":"Confira o e-mail e tente novamente."}));
  }
  return <main className="auth-page auth-page--compact"><div className="auth-layout"><section className="auth-card">
    <Link href="/" className="brand"><BrandAsset src="/brand/jobforged-logo-primary.svg" alt="JobForged" width={190} height={55} /></Link>
    <div className="auth-heading"><h1>Confirme seu e-mail</h1><p>O link será usado somente quando você clicar em confirmar.</p></div>
    {status === "pending" && <ActionButton type="button" onClick={confirm}>Confirmar meu e-mail</ActionButton>}
    {status === "loading" && <p role="status">Validando link…</p>}
    {status === "success" && <><p>E-mail confirmado. Entre na sua conta ou volte ao convite recebido para concluir a associação à empresa.</p><Link className="jf-action jf-action--primary" href={destination}>{destination==="/login"?"Ir para o login":"Voltar à página da empresa"}</Link></>}
    {status === "invalid" && <><p>Este link expirou, já foi usado ou é inválido. Peça outro e-mail de confirmação.</p>
      <form className="auth-form" noValidate onSubmit={resend}><TextField name="email" label="E-mail do cadastro" type="email" value={email} onChange={event => setEmail(event.target.value)} />
      <ActionButton type="submit" disabled={resending}>{resending?"Solicitando...":"Solicitar novo e-mail"}</ActionButton></form></>}
    <p><Link href="/login">Voltar ao login</Link></p>
    {notice&&<AppToast notice={notice} onClose={()=>setNotice(null)}/>}
  </section></div></main>;
}
