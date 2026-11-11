"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, Check, KeyRound, LogOut, Save, ShieldCheck, UserRound } from "lucide-react";
import { ActionButton, AppToast, DisplayValue, Panel, PanelHeading, StatusBadge, TextField, WorkspacePageHeader, WorkspaceState, type ToastKind } from "@/app/components/ui";
import { requestPasswordRecovery, signOutCompany, useCompanyAuthSession, type AuthSessionState } from "@/app/components/auth/auth-service";
import { isValidCpf } from "@/app/components/auth/auth-validation";
import { memberRoles } from "./member-roles";

type Profile={fullName:string;cpf:string|null;phone:string|null;createdAt?:string};
const digits=(value:string)=>value.replace(/\D/g,"");

export function AccountManagementClient({embedded=false}:{embedded?:boolean}) {
 const session=useCompanyAuthSession();
 if(session.checking)return <WorkspaceState title="Carregando perfil..."/>;
 if(!session.authenticated)return <WorkspaceState kind="forbidden" title="Sua sessão terminou" description="Entre novamente para acessar seu perfil."/>;
 return <AccountEditor key={session.email} session={session} embedded={embedded}/>;
}

function AccountEditor({session,embedded}:{session:AuthSessionState;embedded:boolean}) {
 const [saved,setSaved]=useState<Profile|null>(session.platformAdmin?{fullName:session.fullName??"",cpf:null,phone:null}:null),[draft,setDraft]=useState<Profile>({fullName:session.fullName??"",cpf:null,phone:null});
 const [loadError,setLoadError]=useState(false),[busy,setBusy]=useState<string|null>(null),[errors,setErrors]=useState<Record<string,string>>({});
 const [notice,setNotice]=useState<{kind:ToastKind;title:string;text:string}|null>(null);
 const load=useCallback(async()=>{
  const response=await fetch('/api/account',{credentials:'same-origin',cache:'no-store'});
  if(!response.ok)throw new Error();return await response.json() as Profile;
 },[]);
 useEffect(()=>{if(session.platformAdmin)return;let active=true;void load().then(value=>{if(active){setSaved(value);setDraft(value)}}).catch(()=>{if(active)setLoadError(true)});return()=>{active=false}},[load,session.platformAdmin]);
 const dirty=!!saved&&(draft.fullName!==saved.fullName||digits(draft.cpf??'')!==(saved.cpf??'')||digits(draft.phone??'')!==(saved.phone??''));
 useEffect(()=>{if(!dirty)return;const warn=(event:BeforeUnloadEvent)=>event.preventDefault();window.addEventListener('beforeunload',warn);return()=>window.removeEventListener('beforeunload',warn)},[dirty]);
 const role=memberRoles[session.role as keyof typeof memberRoles];
 async function save(event:FormEvent<HTMLFormElement>){
  event.preventDefault();const next:Record<string,string>={};
  if(draft.fullName.trim().length<3)next.fullName='Informe seu nome completo, com pelo menos 3 caracteres.';
  if(draft.cpf&&!isValidCpf(draft.cpf))next.cpf='Confira os 11 dígitos do CPF.';
  if(draft.phone&&!/^\d{10,11}$/.test(digits(draft.phone)))next.phone='Informe DDD e telefone com 10 ou 11 dígitos.';
  setErrors(next);if(Object.keys(next).length)return;setBusy('save');
  try{
   const response=await fetch('/api/account',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({...draft,cpf:digits(draft.cpf??''),phone:digits(draft.phone??'')})});
   const value=await response.json() as Profile & {field?:string;message?:string};
   if(!response.ok){if(value.field)setErrors({[value.field]:value.message??"Confira este campo."});throw new Error(value.message||'Não foi possível salvar seu perfil.');}
   setSaved(value);setDraft(value);window.dispatchEvent(new Event('jobforged-profile-updated'));
   setNotice({kind:'success',title:'Perfil atualizado',text:'Suas informações foram salvas.'});
  }catch(error){setNotice({kind:'danger',title:'Perfil não salvo',text:error instanceof Error?error.message:'Não foi possível salvar. Tente novamente.'});}
  finally{setBusy(null);}
 }
 async function recover(){
  if(!session.email)return;setBusy('password');const result=await requestPasswordRecovery(session.email);setBusy(null);
  setNotice({kind:result.ok?'success':'danger',title:result.ok?'Confira seu e-mail':'Solicitação não concluída',text:result.ok?'Enviamos as instruções para você criar uma nova senha.':result.message??'Tente novamente.'});
 }
 return <>{!embedded&&<WorkspacePageHeader section="Painel / Minha conta" title="Seu perfil" description="Seus dados pessoais, vínculo com a empresa e segurança em um só lugar."/>}
  {notice&&<AppToast notice={notice} onClose={()=>setNotice(null)}/>}
  {!saved?<WorkspaceState kind={loadError?'error':'loading'} title={loadError?'Não foi possível carregar seu perfil':'Carregando seus dados...'} action={loadError?<ActionButton variant="secondary" onClick={()=>{setLoadError(false);void load().then(value=>{setSaved(value);setDraft(value)}).catch(()=>setLoadError(true))}}>Tentar novamente</ActionButton>:undefined}/>:<div className="jf-workspace-stack">
   <Panel className="jf-profile-summary"><span className="jf-profile-summary__avatar" aria-hidden="true"><UserRound size={28}/></span><div className="jf-profile-summary__identity"><h2><DisplayValue value={saved.fullName} emptyText={session.platformAdmin?'Administrador da plataforma':'Nome não informado'}/></h2><p><DisplayValue value={session.email}/></p><div className="jf-workspace-toolbar"><StatusBadge tone="info" description={role?.description}>{session.platformAdmin?'Administrador da plataforma':role?.label??'Não informado'}</StatusBadge><StatusBadge tone="positive"><Check size={14}/> Conta ativa</StatusBadge></div></div></Panel>
   <div className="jf-profile-layout"><Panel><PanelHeading title="Dados pessoais" description="Mantenha sua identificação e contato atualizados."/>
    <form className="jf-panel-body jf-workspace-stack" onSubmit={save}>
     <TextField label="Nome completo" autoComplete="name" value={draft.fullName} minLength={3} maxLength={120} required readOnly={session.platformAdmin} disabled={!!busy} error={errors.fullName} onChange={event=>setDraft({...draft,fullName:event.target.value})}/>
     {!session.platformAdmin&&<div className="jf-profile-fields"><TextField label="CPF" format="cpf" value={draft.cpf??''} helpText="11 dígitos. Visível para você e para a gestão da empresa." error={errors.cpf} disabled={!!busy} onChange={event=>setDraft({...draft,cpf:event.target.value})}/><TextField label="Telefone" format="phone" autoComplete="tel-national" value={draft.phone??''} helpText="Inclua o DDD. Campo opcional." error={errors.phone} disabled={!!busy} onChange={event=>setDraft({...draft,phone:event.target.value})}/></div>}
     <div className="jf-profile-readonly"><span>E-mail de acesso</span><strong><DisplayValue value={session.email}/></strong><small>Endereço confirmado utilizado para entrar e recuperar sua conta.</small></div>
     {!session.platformAdmin&&<div className="jf-profile-save"><span className="admin-muted" role="status">{dirty?'Você tem alterações não salvas.':'Seus dados estão atualizados.'}</span><div className="jf-workspace-toolbar"><ActionButton type="button" variant="secondary" disabled={!!busy||!dirty} onClick={()=>{setDraft(saved);setErrors({})}}>Descartar alterações</ActionButton><ActionButton type="submit" icon={<Save size={16}/>} disabled={!!busy||!dirty}>{busy==='save'?'Salvando...':'Salvar alterações'}</ActionButton></div></div>}
    </form></Panel>
    <div className="jf-workspace-stack"><Panel><PanelHeading title="Vínculo e permissões"/><div className="jf-panel-body jf-workspace-stack"><div className="jf-profile-readonly"><span><Building2 size={16}/> Organização</span><strong><DisplayValue value={session.platformAdmin?'JobForged':session.company?.name}/></strong></div><div className="jf-profile-readonly"><span><ShieldCheck size={16}/> Sua função</span><StatusBadge tone="info" description={role?.description}>{session.platformAdmin?'Administrador da plataforma':role?.label??'Não informado'}</StatusBadge></div><div className="jf-profile-readonly"><span>Na equipe desde</span><strong><DisplayValue value={saved.createdAt?new Date(saved.createdAt).toLocaleDateString('pt-BR'):null}/></strong></div></div></Panel>
     <Panel><PanelHeading title="Segurança da conta" description="Proteja seu acesso e gerencie sua sessão."/><div className="jf-panel-body jf-workspace-stack"><p className="admin-muted">Receba no seu e-mail um link de uso único para definir uma nova senha.</p><ActionButton type="button" variant="secondary" icon={<KeyRound size={16}/>} disabled={!!busy||!session.email} onClick={()=>void recover()}>{busy==='password'?'Enviando...':'Enviar link para alterar senha'}</ActionButton><ActionButton type="button" variant="quiet" icon={<LogOut size={16}/>} disabled={!!busy} onClick={async()=>{setBusy('signout');const result=await signOutCompany();if(result.ok){location.replace('/login');return}setBusy(null);setNotice({kind:'danger',title:'Sessão não encerrada',text:'Tente novamente.'})}}>Sair da conta</ActionButton></div></Panel>
    </div></div></div>}
 </>;
}
