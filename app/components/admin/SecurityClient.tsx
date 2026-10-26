"use client";
/* eslint-disable @next/next/no-img-element */
import {useCallback,useEffect,useState,type FormEvent} from 'react';
import {ActionButton,Panel,PanelHeading,SelectField,TextField,WorkspaceState,InlineNotice} from '@/app/components/ui';
type Status={mfaEnforced:boolean;aal:string;verifiedFactors:number;factors:Array<{id:string;name:string}>};
async function readSecurityStatus(){const response=await fetch('/api/backoffice/security',{cache:'no-store'});if(!response.ok)throw Error('Não foi possível conferir a segurança.');return await response.json() as Status;}
export function SecurityClient({revision=0}:{revision?:number}){
 const [status,setStatus]=useState<Status|null>(null),[factor,setFactor]=useState(''),[qr,setQr]=useState(''),[code,setCode]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const load=useCallback(async()=>{const next=await readSecurityStatus();setStatus(next);setFactor(current=>current||next.factors[0]?.id||'');},[]);
 useEffect(()=>{let active=true;readSecurityStatus().then(next=>{if(active){setStatus(next);setFactor(current=>current||next.factors[0]?.id||'');setMessage('')}}).catch(()=>{if(active)setMessage('Não foi possível conferir a segurança.')});return()=>{active=false}},[revision]);
 async function act(operation:string){setBusy(true);setMessage('');try{const r=await fetch('/api/backoffice/security',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({operation,factorId:factor,code})});const result=await r.json() as {message?:string;factorId?:string;qr?:string};if(!r.ok)throw Error(result.message||'Não foi possível concluir.');if(result.factorId&&result.qr){setFactor(result.factorId);setQr(result.qr)}else{setQr('');setCode('');setMessage(operation==='enable'?'Proteção administrativa ativada.':'Código confirmado.');await load()}}catch(error){setMessage(error instanceof Error?error.message:'Tente novamente.')}finally{setBusy(false)}}
 if(!status&&!message)return <WorkspaceState title="Conferindo segurança..."/>;
 return <Panel><PanelHeading title="Segurança da conta" description="Use um aplicativo autenticador para proteger o acesso administrativo."/><div className="jf-panel-body jf-workspace-stack">
 {message&&<p role="status">{message}</p>}
 <InlineNotice tone="info">{status?.mfaEnforced?'A proteção administrativa está ativa. Confirme um código para operações sensíveis.':'Cadastre e confirme seu fator antes de ativar a proteção administrativa.'}</InlineNotice>
 {!status?.verifiedFactors&&!qr&&<ActionButton disabled={busy} onClick={()=>void act('enroll')}>Cadastrar autenticador</ActionButton>}
 {qr&&<div><img src={qr} alt="Código QR privado para cadastrar seu autenticador" width={200} height={200}/><p>Escaneie no seu autenticador. Guarde a recuperação do aplicativo em local seguro.</p></div>}
 {!!status?.factors.length&&!qr&&<SelectField label="Autenticador" value={factor} onValueChange={setFactor} options={status.factors.map(f=>({value:f.id,label:f.name}))}/>}
 {factor&&<form className="jf-workspace-stack" onSubmit={(e:FormEvent)=>{e.preventDefault();void act('verify')}}><TextField label="Código de verificação" inputMode="numeric" autoComplete="one-time-code" value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,'').slice(0,6))} required minLength={6} maxLength={6}/><ActionButton type="submit" disabled={busy||code.length!==6}>Confirmar código</ActionButton></form>}
 {status?.aal==='aal2'&&!status.mfaEnforced&&<ActionButton disabled={busy} onClick={()=>void act('enable')}>Ativar proteção administrativa</ActionButton>}
 <p>Perdeu o autenticador? Solicite recuperação administrativa pelo canal de suporte. Não compartilhe códigos ou chaves.</p>
 </div></Panel>;
}
