"use client";
import {useRef,useState} from 'react';
import {Sparkles,Send} from 'lucide-react';
import {ActionButton,CheckboxField,TextAreaField,WidgetDialog} from '../ui';
import {assistantFields,type AssistantPatch} from './job-assistant-contract';
import type {Job} from './job-types';
type Message={role:'user'|'assistant';text:string};
export function JobAssistant({job,onApply,onNotice}:{job:Job;onApply:(patch:AssistantPatch)=>void;onNotice:(message:string)=>void}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState(''),[messages,setMessages]=useState<Message[]>([]),[busy,setBusy]=useState(false),[patch,setPatch]=useState<AssistantPatch|null>(null),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState('');
 const base=useRef<Job>(job);
 const [branchNames,setBranchNames]=useState<Record<string,string>>({});
 async function send(){
  if(!message.trim()||busy)return;setBusy(true);setError('');setPatch(null);base.current=structuredClone(job);
  const current=message.trim();
  try{
   const r=await fetch('/api/company/jobs/assistant',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({companyId:job.organizationId,draft:job,message:current,history:messages.slice(-12)}),signal:AbortSignal.timeout(95000)});
   const data=await r.json() as {message?:string;reply:string;patch:AssistantPatch;branches:{id:string;name:string;city:string;state:string}[]};if(!r.ok)throw Error(data.message||'Assistente indisponível.');
   setBranchNames(Object.fromEntries(data.branches.map(b=>[b.id,`${b.name} · ${b.city}/${b.state}`])));
   setMessages(x=>[...x,{role:'user',text:current},{role:'assistant',text:data.reply}]);setMessage('');setPatch(data.patch);setSelected(Object.keys(data.patch));
  }catch(e){setError(e instanceof Error?e.message:'Não foi possível conversar com o assistente.')}
  finally{setBusy(false)}
 }
 function apply(){
  if(!patch)return;
  const keys=selected as (keyof AssistantPatch)[];
  if(keys.some(key=>JSON.stringify(job[key])!==JSON.stringify(base.current[key]))){setError('O formulário mudou após esta sugestão. Envie uma nova mensagem para usar os dados atuais.');return}
  onApply(Object.fromEntries(keys.map(key=>[key,patch[key]])) as AssistantPatch);setPatch(null);setOpen(false);onNotice('Sugestões aplicadas ao formulário. Revise e salve a vaga para confirmar.');
 }
 const display=(value:unknown)=>Array.isArray(value)?value.join('\n'):String(value??'Não informado');
 return <><ActionButton variant="secondary" icon={<Sparkles size={17}/>} onClick={()=>setOpen(true)}>Criar com IA</ActionButton><WidgetDialog kind="drawer" open={open} onClose={()=>setOpen(false)} title="Vamos construir essa oportunidade" description="Conte o que sua equipe precisa. Revise as sugestões antes de aplicá-las à vaga."><div className="job-assistant"><div className="job-assistant-messages" role="log" aria-live="polite">{!messages.length&&<p>Qual cargo você precisa contratar, em quais filiais e como será a rotina? Você pode começar com poucas informações e complementar ao longo da conversa.</p>}{messages.map((m,i)=><div className={`job-assistant-message is-${m.role}`} key={i}><strong>{m.role==='user'?'Você':'Assistente JobForged'}</strong><p>{m.text}</p></div>)}{busy&&<p role="status">Preparando sua sugestão…</p>}</div>{error&&<p role="alert">{error}</p>}{patch&&Object.keys(patch).length>0&&<section className="job-assistant-review"><h3>Sugestões para o formulário</h3><p>Marque o que deseja aplicar. Os valores selecionados substituirão os campos correspondentes.</p>{Object.entries(patch).map(([key,value])=><div key={key}><CheckboxField label={assistantFields[key as keyof AssistantPatch]} checked={selected.includes(key)} onChange={e=>setSelected(x=>e.target.checked?[...x,key]:x.filter(k=>k!==key))}/>{key==='branchIds'?<p>{(value as string[]).map(id=>branchNames[id]||"Filial indisponível").join(" · ")||"Sem vínculo com filiais"}</p>:<><small>Atual</small><p>{display(job[key as keyof Job])||'Não informado'}</p><small>Sugestão</small><p>{display(value)}</p></>}</div>)}<ActionButton onClick={apply} disabled={!selected.length||busy}>Aplicar ao formulário</ActionButton><ActionButton variant="quiet" onClick={()=>setPatch(null)}>Descartar sugestões</ActionButton></section>}<form onSubmit={e=>{e.preventDefault();void send()}}><TextAreaField label="Converse sobre esta vaga" value={message} maxLength={4000} disabled={busy} placeholder="Descreva a oportunidade..." onChange={e=>setMessage(e.target.value)} helpText="Não envie dados pessoais de candidatos. O assistente usa os dados desta vaga e das filiais ativas."/><ActionButton type="submit" icon={<Send size={17}/>} disabled={busy||!message.trim()}>{busy?'Preparando...':'Enviar mensagem'}</ActionButton></form><p>As sugestões podem conter imprecisões. Salvar e publicar continuam sob sua decisão.</p></div></WidgetDialog></>;
}
