"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Building2, KeyRound, Mail, LogOut, Save, ShieldCheck } from "lucide-react";
import { ActionButton, AppToast, DisplayValue, Panel, PanelHeading, StatusBadge, TextField, WorkspacePageHeader, WorkspaceState, type ToastKind } from "@/app/components/ui";
import { signOutCompany, useCompanyAuthSession, type AuthSessionState } from "@/app/components/auth/auth-service";
import { isValidCpf } from "@/app/components/auth/auth-validation";
import {ProfilePhoto} from './ProfilePhoto';
import { memberRoles } from "./member-roles";

type Profile={memberId?:string;photoVersion?:number;fullName:string;cpf:string|null;phone:string|null;createdAt?:string};
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
 const [credential,setCredential]=useState<"password"|"email"|null>(null);
 const [credentialValue,setCredentialValue]=useState("");
 const [credentialConfirmation,setCredentialConfirmation]=useState("");
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
   setSaved(current=>({...current,...value}));setDraft(current=>({...current,...value}));window.dispatchEvent(new Event('jobforged-profile-updated'));
   setNotice({kind:'success',title:'Perfil atualizado',text:'Suas informações foram salvas.'});
  }catch(error){setNotice({kind:'danger',title:'Perfil não salvo',text:error instanceof Error?error.message:'Não foi possível salvar. Tente novamente.'});}
  finally{setBusy(null);}
 }
 function openCredential(value: typeof credential) {
  setCredential(value);
  setCredentialValue("");
  setCredentialConfirmation("");
 }
 async function saveCredential(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();
  if (!credential || busy) return;
  setBusy(credential);
  try {
   const response=await fetch('/api/account/credentials',{
    method:'POST',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({operation:credential,[credential]:credentialValue,confirmation:credentialConfirmation})
   });
   const result=await response.json() as {message?:string};
   if(!response.ok)throw new Error(result.message||'Não foi possível salvar.');
   openCredential(null);
   if(credential==='password'){location.replace('/login');return;}
   setNotice({kind:'success',title:'Confirme a troca de e-mail',text:'Siga as instruções enviadas aos seus endereços de e-mail.'});
  }catch(error){
   setNotice({kind:'danger',title:'Alteração não concluída',text:error instanceof Error?error.message:'Tente novamente.'});
  }finally{setBusy(null);}
 }
 return <>{!embedded&&<WorkspacePageHeader section="Painel / Minha conta" title="Seu perfil" description="Seus dados pessoais, vínculo com a empresa e segurança em um só lugar."/>}
  {notice&&<AppToast notice={notice} onClose={()=>setNotice(null)}/>}
  {!saved?<WorkspaceState kind={loadError?'error':'loading'} title={loadError?'Não foi possível carregar seu perfil':'Carregando seus dados...'} action={loadError?<ActionButton variant="secondary" onClick={()=>{setLoadError(false);void load().then(value=>{setSaved(value);setDraft(value)}).catch(()=>setLoadError(true))}}>Tentar novamente</ActionButton>:undefined}/>:<div className="jf-workspace-stack">
   <div className="jf-profile-layout"><Panel><PanelHeading title="Dados pessoais" description="Mantenha sua identificação e contato atualizados."/>
    {!session.platformAdmin&&<div className="jf-panel-body"><ProfilePhoto name={saved.fullName} memberId={saved.memberId} version={saved.photoVersion} onSaved={photo=>{setSaved(current=>current?{...current,...photo}:current);setDraft(current=>({...current,...photo}));setNotice({kind:"success",title:"Foto atualizada",text:photo.photoVersion?"Sua foto foi salva.":"Sua foto foi removida."})}}/></div>}
    <form className="jf-panel-body jf-workspace-stack" onSubmit={save}>
     <TextField label="Nome completo" autoComplete="name" value={draft.fullName} minLength={3} maxLength={120} required readOnly={session.platformAdmin} disabled={!!busy} error={errors.fullName} onChange={event=>setDraft({...draft,fullName:event.target.value})}/>
     {!session.platformAdmin&&<div className="jf-profile-fields"><TextField label="CPF" format="cpf" value={draft.cpf??''} helpText="11 dígitos. Visível para você e para a gestão da empresa." error={errors.cpf} disabled={!!busy} onChange={event=>setDraft({...draft,cpf:event.target.value})}/><TextField label="Telefone" format="phone" autoComplete="tel-national" value={draft.phone??''} helpText="Inclua o DDD. Campo opcional." error={errors.phone} disabled={!!busy} onChange={event=>setDraft({...draft,phone:event.target.value})}/></div>}
     <div className="jf-profile-readonly"><span>E-mail de acesso</span><strong><DisplayValue value={session.email}/></strong><small>Endereço confirmado utilizado para entrar e recuperar sua conta.</small></div>
     {!session.platformAdmin&&<div className="jf-profile-save"><span className="admin-muted" role="status">{dirty?'Você tem alterações não salvas.':'Seus dados estão atualizados.'}</span><div className="jf-profile-actions jf-workspace-toolbar"><ActionButton type="button" variant="secondary" disabled={!!busy||!dirty} onClick={()=>{setDraft(saved);setErrors({})}}>Descartar</ActionButton><ActionButton type="submit" icon={<Save size={16}/>} disabled={!!busy||!dirty}>{busy==='save'?'Salvando...':'Salvar'}</ActionButton></div></div>}
    </form></Panel>
    <div className="jf-workspace-stack"><Panel><PanelHeading title="Vínculo e permissões"/><div className="jf-panel-body jf-workspace-stack"><div className="jf-profile-readonly"><span><Building2 size={16}/> Organização</span><strong><DisplayValue value={session.platformAdmin?'JobForged':session.company?.name}/></strong></div><div className="jf-profile-readonly"><span><ShieldCheck size={16}/> Sua função</span><StatusBadge tone="info" description={role?.description}>{session.platformAdmin?'Administrador da plataforma':role?.label??'Não informado'}</StatusBadge></div><div className="jf-profile-readonly"><span>Na equipe desde</span><strong><DisplayValue value={saved.createdAt?new Date(saved.createdAt).toLocaleDateString('pt-BR'):null}/></strong></div></div></Panel>
     <Panel><PanelHeading title="Segurança da conta" description="Proteja seu acesso e gerencie sua sessão."/><div className="jf-panel-body jf-workspace-stack"><div className="jf-workspace-toolbar">
      <ActionButton type="button" variant="secondary" icon={<KeyRound size={16}/>} disabled={!!busy} onClick={()=>openCredential('password')}>Alterar senha</ActionButton>
      {!session.platformAdmin&&<ActionButton type="button" variant="secondary" icon={<Mail size={16}/>} disabled={!!busy} onClick={()=>openCredential('email')}>Alterar e-mail</ActionButton>}
     </div>
     {credential&&<form key={credential} className="jf-workspace-stack" onSubmit={saveCredential}>
      <TextField type={credential} label={credential==='password'?'Nova senha':'Novo e-mail'} autoComplete={credential==='password'?'new-password':'email'} value={credentialValue} onChange={event=>setCredentialValue(event.target.value)} required disabled={!!busy} maxLength={credential==='password'?72:254} helpText={credential==='password'?'Use pelo menos 8 caracteres, com maiúscula, minúscula, número e símbolo.':'A troca depende da confirmação por e-mail.'}/>
      <TextField type={credential} label={credential==='password'?'Confirme a nova senha':'Confirme o novo e-mail'} autoComplete={credential==='password'?'new-password':'off'} value={credentialConfirmation} onChange={event=>setCredentialConfirmation(event.target.value)} required disabled={!!busy} maxLength={credential==='password'?72:254}/>
      <div className="jf-profile-actions jf-workspace-toolbar">
       <ActionButton type="button" variant="secondary" disabled={!!busy} onClick={()=>openCredential(null)}>Cancelar</ActionButton>
       <ActionButton type="submit" disabled={!!busy}>{busy?'Salvando...':credential==='password'?'Salvar senha':'Solicitar troca'}</ActionButton>
      </div>
     </form>}
     <ActionButton type="button" variant="danger" icon={<LogOut size={16}/>} disabled={!!busy} onClick={async()=>{setBusy('signout');const result=await signOutCompany();if(result.ok){location.replace('/login');return}setBusy(null);setNotice({kind:'danger',title:'Sessão não encerrada',text:'Tente novamente.'})}}>Sair da conta</ActionButton></div></Panel>
    </div></div></div>}
 </>;
}
