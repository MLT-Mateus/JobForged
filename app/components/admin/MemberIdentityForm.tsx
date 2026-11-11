"use client";
import {useState,type FormEvent} from 'react';
import {ActionButton,InlineNotice,TextField} from '../ui';
import {isValidCpf} from '../auth/auth-validation';
export type MemberIdentity={id:string;full_name:string;cpf?:string|null;phone?:string|null};
export function MemberIdentityForm({member,onSaved,onCancel}:{member:MemberIdentity;onSaved:(value:MemberIdentity)=>void;onCancel:()=>void}){
 const [name,setName]=useState(member.full_name),[cpf,setCpf]=useState(member.cpf??''),[phone,setPhone]=useState(member.phone??'');
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({});
 async function save(event:FormEvent){
  event.preventDefault();const invalid:Record<string,string>={};
  if(name.trim().length<3)invalid.fullName='Informe o nome completo.';
  if(cpf&&!isValidCpf(cpf))invalid.cpf='Informe um CPF válido.';
  if(phone&&!/^\d{10,11}$/.test(phone.replace(/\D/g,'')))invalid.phone='Informe DDD e telefone.';
  setFields(invalid);if(Object.keys(invalid).length)return;setBusy(true);setError('');
  try{const response=await fetch('/api/company/members/identity',{method:'PATCH',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:member.id,fullName:name,cpf,phone})});const value=await response.json() as MemberIdentity & {field?:string;message?:string};if(!response.ok){if(value.field)setFields({[value.field]:value.message??"Confira este campo."});throw Error(value.message||'Não foi possível salvar.')}onSaved(value)}catch(cause){setError(cause instanceof Error?cause.message:'Não foi possível salvar.')}finally{setBusy(false)}
 }
 return <form className="jf-workspace-stack" onSubmit={save}><h3>Identificação e contato</h3><TextField label="Nome completo" value={name} required maxLength={120} disabled={busy} error={fields.fullName} onChange={event=>setName(event.target.value)}/><TextField label="CPF" format="cpf" value={cpf} disabled={busy} error={fields.cpf} helpText="Visível somente para a pessoa e para a gestão da empresa." onChange={event=>setCpf(event.target.value)}/><TextField label="Telefone" format="phone" value={phone} disabled={busy} error={fields.phone} onChange={event=>setPhone(event.target.value)}/>{error&&<InlineNotice tone="danger">{error}</InlineNotice>}<div className="jf-workspace-toolbar"><ActionButton type="submit" disabled={busy}>{busy?'Salvando...':'Salvar identificação'}</ActionButton><ActionButton type="button" variant="secondary" disabled={busy} onClick={onCancel}>Cancelar</ActionButton></div></form>;
}
