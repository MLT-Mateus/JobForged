"use client";

import {AuthShell} from './AuthShell';
import Link from "next/link";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { ActionButton, WorkspaceState, FormActions, AppToast, TextField, createToastNotice, type ToastNotice } from "@/app/components/ui";
import {usePendingChanges} from "../ui/PendingChanges";
import { isEmail, passwordRules } from "./auth-validation";
import { focusFirstInvalid } from "./focus-first-invalid";
import "./auth.css";

export function CompanyInvitationClient({ token }: { token: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [notice,setNotice]=useState<ToastNotice|null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [mode,setMode]=useState<'login'|'signup'>('login'),[sessionEmail,setSessionEmail]=useState(''),[checking,setChecking]=useState(true),[confirmation,setConfirmation]=useState('');
  const guard=usePendingChanges(mode==='signup'&&!!(email||password||confirmation));
  useEffect(()=>{const c=new AbortController();fetch('/api/auth/session',{cache:'no-store',signal:c.signal}).then(async r=>r.ok?await r.json() as {email?:string}:null).then(s=>{if(!c.signal.aborted)setSessionEmail(s?.email||'')}).catch(()=>{}).finally(()=>{if(!c.signal.aborted)setChecking(false)});return()=>c.abort()},[]);
  const [invitation,setInvitation]=useState<{company:string;role:string;expiresAt:string;status:string}|null>(null),[invitationError,setInvitationError]=useState(''),[contextLoading,setContextLoading]=useState(false),[contextRetry,setContextRetry]=useState(0);
  useEffect(()=>{if(!sessionEmail||!/^[0-9a-f]{64}$/.test(token))return;const c=new AbortController();const timer=setTimeout(()=>setContextLoading(true),0);fetch('/api/company/invitations/context',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),signal:c.signal}).then(async r=>{const b=await r.json() as {message?:string;invitation:typeof invitation};if(!r.ok)throw Error(b.message||'Não foi possível verificar o convite.');return b.invitation as typeof invitation}).then(value=>{if(!c.signal.aborted){setInvitation(value);setInvitationError(value?'':'Este convite não está disponível para a conta conectada. Entre com o e-mail convidado.')}}).catch(e=>{if(!c.signal.aborted)setInvitationError(e.message)}).finally(()=>{if(!c.signal.aborted)setContextLoading(false)});return()=>{clearTimeout(timer);c.abort()}},[sessionEmail,token,contextRetry]);
  const credentialsForm = useRef<HTMLFormElement>(null);
  function credentialsReady(form: HTMLFormElement | null) {
    const invalid = [!isEmail(email) && "email", !password && "password"].filter(Boolean) as string[];
    if (!invalid.length) return true;
    setNotice(createToastNotice({kind:"danger",title:"Confira os dados",text:"Informe um e-mail válido e a senha antes de continuar."}));
    if (form) focusFirstInvalid(form, invalid);
    return false;
  }
  async function act(path: string, body: unknown) {
    setBusy(true); setNotice(null);
    const response = await fetch(path, { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }).catch(() => null);
    const payload = await response?.json().catch(() => ({})) as { message?: string } | undefined;
    setBusy(false); setNotice(createToastNotice({kind:response?.ok?"success":"danger",title:response?.ok?"Convite empresarial":"Convite não concluído",text:payload?.message??(response?.ok?"Concluído.":"Não foi possível concluir.")}));
    return Boolean(response?.ok);
  }
  async function register(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!credentialsReady(credentialsForm.current)) return; if(!Object.values(passwordRules(password)).every(Boolean)||password!==confirmation){setNotice(createToastNotice({kind:'danger',title:'Confira a senha',text:'Use 8 caracteres ou mais, maiúscula, minúscula, número e símbolo; repita a mesma senha.'}));return}if(await act("/api/auth/invitee-sign-up", { token, email, password })){setMode('login');setPassword('');setConfirmation('')} }
  async function login(event: FormEvent<HTMLFormElement>) { event.preventDefault(); if (!credentialsReady(event.currentTarget)) return; const okay = await act("/api/auth/sign-in", { email, password }); if (okay) {setSessionEmail(email);setPassword('');setNotice(createToastNotice({kind:"success",title:"Acesso confirmado",text:"Sessão iniciada. Confira o e-mail antes de aceitar."}));} }
  async function accept() { const okay = await act("/api/company/invitations/accept", { token }); if (okay) { window.history.replaceState(null, "", "/convite"); setDone(true); } }
  return <AuthShell compact>{guard.dialog}<div className="auth-heading"><h1>Convite empresarial</h1><p>Entre com o e-mail convidado e confirmado para participar da empresa.</p></div>
    {!/^[0-9a-f]{64}$/.test(token) && !done ? <WorkspaceState kind="error" title="Convite inválido" description="Solicite um novo convite à gestão da empresa." action={<Link href="/login">Ir para o acesso</Link>}/> : done ? <><p>Convite aceito. Complete seus dados pessoais para que a equipe reconheça seu perfil.</p><Link className="jf-action jf-action--primary" href="/app/minha-conta">Completar perfil</Link><Link href="/app/home">Abrir Home</Link></> : <>
      {checking?<WorkspaceState title="Conferindo seu acesso..."/>:sessionEmail?<div className="jf-workspace-stack"><p>Conectado como <strong>{sessionEmail}</strong></p>{contextLoading?<WorkspaceState title="Verificando convite..."/>:invitationError?<WorkspaceState kind="error" title="Convite indisponível" description={invitationError} action={<ActionButton onClick={()=>setContextRetry(n=>n+1)}>Tentar novamente</ActionButton>}/>:invitation?<><dl><dt>Empresa</dt><dd>{invitation.company}</dd><dt>Acesso</dt><dd>{invitation.role==='admin'?'Administrador':invitation.role==='owner'?'Titular':'Membro'}</dd><dt>Validade</dt><dd>{new Date(invitation.expiresAt).toLocaleString('pt-BR')}</dd></dl>{invitation.status==='pending'?<FormActions busy={busy} onSave={()=>void accept()} saveLabel="Aceitar convite"/>:<WorkspaceState title={invitation.status==='expired'?'Convite expirado':invitation.status==='revoked'?'Convite revogado':'Convite já aceito'} description="Solicite um novo convite à gestão da empresa, se necessário."/>}</>:null}<ActionButton variant="quiet" disabled={busy} onClick={async()=>{if(await act('/api/auth/sign-out',{}))setSessionEmail('')}}>Usar outra conta</ActionButton></div>:<form ref={credentialsForm} className="auth-form" onSubmit={mode==='login'?login:register}><h2>{mode==='login'?'Entre para continuar':'Crie sua conta'}</h2><TextField name="email" label="E-mail convidado" type="email" autoComplete="email" value={email} onChange={event=>setEmail(event.target.value)} required disabled={busy}/><TextField name="password" label="Senha" type="password" autoComplete={mode==='signup'?'new-password':'current-password'} value={password} onChange={event=>setPassword(event.target.value)} required disabled={busy} helpText={mode==='signup'?'8 caracteres ou mais, maiúscula, minúscula, número e símbolo.':undefined}/>{mode==='signup'&&<><TextField label="Confirme a senha" type="password" autoComplete="new-password" required value={confirmation} onChange={e=>setConfirmation(e.target.value)} disabled={busy}/><p>Confirme seu endereço no e-mail recebido e volte ao convite.</p></>}<FormActions busy={busy} saveLabel={mode==='login'?'Entrar':'Criar conta'}/><ActionButton variant="quiet" type="button" disabled={busy} onClick={()=>guard.confirm(()=>{setMode(mode==='login'?'signup':'login');setPassword('');setConfirmation('')})}>{mode==='login'?'Criar conta':'Já tenho conta'}</ActionButton></form>}</>}
    {notice&&<AppToast notice={notice} onClose={()=>setNotice(null)}/>}<p><Link href="/recuperar-senha">Esqueci minha senha</Link></p></AuthShell>;
}
