"use client";
import {useEffect,useRef,useState} from 'react';
import {Sparkles,Send,Paperclip,Mic,Pause,Play,X,RotateCcw,Check} from 'lucide-react';
import {ActionButton,CheckboxField,ChatBubble,ChatComposer,ChatProcessing,WidgetDialog} from '../ui';
import {assistantFields,type AssistantPatch} from './job-assistant-contract';
import {jsonFrames} from './chat-stream';
import {useVoiceCapture} from './use-voice-capture';
import {applicationFeedback} from './job-editor-model';
import type {Job} from './job-types';
import './job-chat.css';
const greetings=[
 'Olá! Vamos construir sua próxima oportunidade? Conte o nome do cargo, o salário ou a faixa salarial, a empresa e a filial onde a pessoa vai trabalhar. Escreva abaixo ou use o microfone. Ao concluir a gravação, revise o texto e envie.',
 'Vamos preparar uma vaga clara e atrativa. Para começar, me diga quatro coisas: cargo, remuneração prevista, empresa e filial — pode ser mais de uma unidade. Escreva abaixo, anexe um documento ou grave um áudio; o texto transcrito fica pronto para você revisar e enviar.',
 'Oi! Sou o assistente da JobForged. Qual cargo você quer abrir, qual é o salário previsto, para qual empresa e em qual filial? Escreva abaixo ou grave um áudio para revisar e enviar. Vou perguntar o que faltar, uma informação por vez.',
];
type Attachment={name:string;text:string};type Message={id:string;role:'user'|'assistant';text:string;files?:string[];failed?:boolean};
export function JobAssistant({job,onApply,onNotice}:{job:Job;onApply:(patch:AssistantPatch)=>void;onNotice:(message:string)=>void}){
 const [open,setOpen]=useState(false),[message,setMessage]=useState(''),[messages,setMessages]=useState<Message[]>([]),[greeting,setGreeting]=useState(greetings[0]),[busy,setBusy]=useState(false),[reading,setReading]=useState(false),[patch,setPatch]=useState<AssistantPatch|null>(null),[selected,setSelected]=useState<string[]>([]),[error,setError]=useState(''),[attachments,setAttachments]=useState<Attachment[]>([]),[partial,setPartial]=useState(''),[status,setStatus]=useState('Preparando sua resposta'),[voiceFile,setVoiceFile]=useState<File|null>(null);
 const base=useRef<Job>(job),input=useRef<HTMLTextAreaElement>(null),files=useRef<HTMLInputElement>(null),log=useRef<HTMLDivElement>(null),controller=useRef<AbortController|null>(null),readController=useRef<AbortController|null>(null),lock=useRef(false),readLock=useRef(false),intro=useRef(false);
 const [branchNames,setBranchNames]=useState<Record<string,string>>({});
 const voice=useVoiceCapture(file=>{setVoiceFile(file);void attach(file,true)},setError);
 useEffect(()=>()=>{controller.current?.abort();readController.current?.abort()},[]);
 useEffect(()=>{if(log.current)log.current.scrollTop=log.current.scrollHeight},[messages,partial,busy]);
 const close=()=>{voice.cancel();controller.current?.abort();readController.current?.abort();setOpen(false)};
 async function extract(file:File){
  if(file.size>2*1024*1024)throw Error('Use arquivos de até 2 MB.');
  if(/\.(txt|md)$/i.test(file.name)){const text=await file.text();if(!text.trim()||text.length>16000||text.includes('\0'))throw Error('Use um documento de texto com até 16 mil caracteres.');return text}
  const type=({pdf:'application/pdf',mp3:'audio/mpeg',m4a:'audio/mp4',wav:'audio/wav',ogg:'audio/ogg',webm:'audio/webm'} as Record<string,string>)[file.name.split('.').pop()?.toLowerCase()||'']||file.type.split(';')[0];
  if(!['application/pdf','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav'].includes(type))throw Error('Use PDF, TXT, MD ou áudio MP3, M4A, WAV, OGG ou WebM.');
  const abort=new AbortController();readController.current=abort;
  const r=await fetch('/api/company/jobs/assistant/media',{method:'POST',headers:{'Content-Type':type,'x-company-id':job.organizationId},body:file,signal:AbortSignal.any([abort.signal,AbortSignal.timeout(28000)])});
  const data=await r.json() as {message?:string;text?:string};if(!r.ok)throw Error(data.message||'Não foi possível ler o arquivo.');if(typeof data.text!=='string'||!data.text.trim())throw Error('Não foi possível reconhecer a fala. Tente novamente.');return data.text;
 }
 async function attach(file:File,isVoice=false){if(readLock.current||lock.current)return;readLock.current=true;setReading(true);setError('');
  try{if(!isVoice&&attachments.length>=2)throw Error('Você pode anexar até dois documentos por mensagem.');const text=await extract(file);
   if(isVoice){if((message+'\n'+text).length>4000)throw Error('A transcrição ficou longa. Grave uma mensagem menor ou use um anexo.');setMessage(x=>(x?x+'\n':'')+text);setVoiceFile(null);setStatus('Transcrição pronta. Revise o texto e envie quando quiser.');requestAnimationFrame(()=>input.current?.focus())}
   else{if(attachments.reduce((n,a)=>n+a.text.length,0)+text.length>16000)throw Error('Os anexos juntos devem ter até 16 mil caracteres.');setAttachments(x=>[...x,{name:file.name.slice(0,180),text}])}
  }catch(e){setError(e instanceof Error&&e.name==='AbortError'?'Leitura cancelada.':e instanceof Error?e.message:'Não foi possível ler o arquivo.')}
  finally{readLock.current=false;setReading(false)}
 }
 async function send(){
  if((!message.trim()&&!attachments.length)||lock.current||readLock.current||voice.recording||voice.requesting||voiceFile)return;
  lock.current=true;setBusy(true);setError('');setPartial('');setStatus('Consultando o contexto da vaga');
  const retained=Object.fromEntries(Object.entries(patch||{}).filter(([key])=>JSON.stringify(job[key as keyof Job])===JSON.stringify(base.current[key as keyof Job]))) as AssistantPatch;
  base.current=structuredClone(job);const current=message.trim()||'Use as informações dos documentos para preparar esta vaga.',sentAttachments=attachments,userId=crypto.randomUUID();
  setMessages(x=>[...x,{id:userId,role:'user',text:current,files:sentAttachments.map(a=>a.name)}]);setMessage('');setAttachments([]);
  const abort=new AbortController();controller.current=abort;
  try{
   const r=await fetch('/api/company/jobs/assistant',{method:'POST',headers:{'Content-Type':'application/json',Accept:'application/x-ndjson'},body:JSON.stringify({companyId:job.organizationId,draft:{...job,...retained},message:current,attachments:sentAttachments,history:messages.filter(m=>!m.failed).slice(-12).map(({role,text})=>({role,text}))}),signal:AbortSignal.any([abort.signal,AbortSignal.timeout(29000)])});
   if(!r.ok){const data=await r.json() as {message?:string;text?:string};throw Error(data.message||'Assistente indisponível.')}
   const reader=r.body?.getReader(),decode=new TextDecoder(),frames=jsonFrames();let done=false;if(!reader)throw Error('Resposta vazia.');
   while(true){const item=await reader.read();if(item.done)break;for(const event of frames(decode.decode(item.value,{stream:true}))){
    if(event.type==='status')setStatus(String(event.text));
    if(event.type==='reply')setPartial(String(event.text));
    if(event.type==='error')throw Error(String(event.message));
    if(event.type==='done'){
     done=true;const data=event as unknown as {reply:string;patch:AssistantPatch;branches:{id:string;name:string;city:string;state:string}[]};
     setBranchNames(Object.fromEntries(data.branches.map(b=>[b.id,`${b.name} · ${b.city}/${b.state}`])));
     setMessages(x=>[...x,{id:crypto.randomUUID(),role:'assistant',text:data.reply}]);const next={...retained,...data.patch};setPatch(next);setSelected(Object.keys(next));setPartial('');
    }
   }}if(!done)throw Error('A resposta foi interrompida. Tente novamente.');
  }catch(e){setMessages(x=>x.map(m=>m.id===userId?{...m,failed:true}:m));setMessage(current);setAttachments(sentAttachments);setPartial('');setError(e instanceof Error&&e.name==='AbortError'?'Conversa interrompida. Sua mensagem está pronta para reenviar.':e instanceof Error?e.message:'Não foi possível conversar com o assistente.')}
  finally{lock.current=false;setBusy(false)}
 }
 function apply(){if(!patch)return;const keys=selected as (keyof AssistantPatch)[];if(keys.some(key=>JSON.stringify(job[key])!==JSON.stringify(base.current[key]))){setError('O formulário mudou após esta sugestão. Envie uma nova mensagem para usar os dados atuais.');return}const applied=Object.fromEntries(keys.map(key=>[key,patch[key]])) as AssistantPatch;onApply(applied);setPatch(null);onNotice('Sugestões aplicadas ao formulário. Revise e salve a vaga para confirmar.');setMessages(x=>[...x,{id:crypto.randomUUID(),role:'assistant',text:applicationFeedback({...job,...applied})}])}
 const display=(value:unknown)=>Array.isArray(value)?value.join('\n'):String(value??'Não informado');
 return <><ActionButton variant="secondary" icon={<Sparkles size={17}/>} onClick={()=>{if(!intro.current){setGreeting(greetings[Math.floor(Math.random()*greetings.length)]);intro.current=true}setOpen(true)}}>Criar com IA</ActionButton><WidgetDialog kind="drawer" open={open} onClose={close} title="Criar vaga com IA"  footer={<div className="job-chat-footer">
 {attachments.map((a,i)=><div className="job-chat-attachment" key={i}><details><summary><Paperclip size={14}/>{a.name}</summary><p>{a.text}</p></details><ActionButton variant="quiet" aria-label={`Remover ${a.name}`} disabled={busy||reading} onClick={()=>setAttachments(x=>x.filter((_,n)=>n!==i))}><X size={16}/></ActionButton></div>)}
 {voiceFile&&!reading&&<div className="job-chat-retry"><ActionButton variant="quiet" onClick={()=>void attach(voiceFile,true)}>Tentar novamente</ActionButton><ActionButton variant="quiet" onClick={()=>setVoiceFile(null)}>Descartar gravação</ActionButton></div>}
 {reading&&<ChatProcessing label={voiceFile?'Transcrevendo áudio':'Lendo documento'}/>}{error&&<p role="alert" className="job-chat-error">{error}</p>}
 <form onSubmit={e=>{e.preventDefault();if(voice.recording)voice.stop();else void send()}}><ChatComposer>
 {voice.recording?<div className="job-chat-recording" role="status"><Mic size={20}/><span>{voice.paused?'Gravação pausada':'Gravando'} <strong>{voice.seconds}s</strong></span></div>:<textarea ref={input} id="job-chat-input" aria-label="Mensagem para a JobForged" value={message} maxLength={4000} disabled={busy||reading||voice.requesting} placeholder="Escreva sua mensagem..." onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'&&!e.shiftKey&&!e.nativeEvent.isComposing){e.preventDefault();void send()}}}/>}
 <footer><div>{voice.recording?<><ActionButton type="button" variant="quiet" aria-label="Cancelar gravação" onClick={voice.cancel}><X size={19}/></ActionButton><ActionButton type="button" variant="quiet" aria-label={voice.paused?'Continuar gravação':'Pausar gravação'} onClick={voice.togglePause}>{voice.paused?<Play size={19}/>:<Pause size={19}/>}</ActionButton></>:<><ActionButton type="button" variant="quiet" aria-label="Anexar arquivo" title="PDF, TXT, MD ou áudio · Até 2 MB" disabled={busy||reading||voice.requesting||!!voiceFile} onClick={()=>files.current?.click()}><Paperclip size={19}/></ActionButton><ActionButton type="button" variant="quiet" aria-label="Gravar áudio" title="Gravar áudio" disabled={busy||reading||voice.requesting||!!voiceFile} onClick={()=>void voice.start()}><Mic size={19}/></ActionButton></>}</div><ActionButton type="submit" aria-label={voice.recording?'Concluir gravação e revisar texto':'Enviar mensagem'} title={voice.recording?'Concluir e transcrever automaticamente':'Enviar mensagem'} icon={voice.recording?<Check size={18}/>:<Send size={17}/>} disabled={busy||reading||voice.requesting||!!voiceFile||(!voice.recording&&!message.trim()&&!attachments.length)}>{voice.recording?'Concluir':'Enviar'}</ActionButton></footer></ChatComposer></form>
 <input hidden ref={files} type="file" accept=".pdf,.txt,.md,.mp3,.m4a,.wav,.ogg,.webm" onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)void attach(f)}}/>{voice.requesting&&<small role="status">Aguardando permissão do microfone…</small>}</div>}><div className="job-chat"><div className="job-chat-log" ref={log} role="log" aria-label="Conversa sobre a vaga" aria-live="polite"><ChatBubble role="assistant"><p>{greeting}</p></ChatBubble>{messages.map(m=><ChatBubble role={m.role} key={m.id}><p>{m.text}</p>{m.files?.map(f=><small key={f}><Paperclip size={12}/>{f}</small>)}{m.failed&&<small>Não concluída — reenvie a mensagem abaixo.</small>}</ChatBubble>)}{busy&&(partial?<ChatBubble role="assistant"><p>{partial}<span className="jf-chat-dots" aria-hidden="true"> ▍</span></p></ChatBubble>:<ChatProcessing label={status}/>)}</div>
 {patch&&Object.keys(patch).length>0&&<details className="job-chat-review"><summary><Check size={17}/> Revisar dados sugeridos ({Object.keys(patch).length})</summary><p>Selecione os dados que deseja aplicar. Nada é publicado automaticamente.</p>{Object.entries(patch).map(([key,value])=><section key={key}><CheckboxField label={assistantFields[key as keyof AssistantPatch]} checked={selected.includes(key)} onChange={e=>setSelected(x=>e.target.checked?[...x,key]:x.filter(k=>k!==key))}/><p>{key==='branchIds'?(value as string[]).map(id=>branchNames[id]||'Filial indisponível').join(' · '):display(value)}</p></section>)}<ActionButton onClick={apply} disabled={!selected.length||busy}>Aplicar ao formulário</ActionButton><ActionButton variant="quiet" icon={<RotateCcw size={15}/>} disabled={busy} onClick={()=>setPatch(null)}>Descartar sugestões</ActionButton></details>}</div></WidgetDialog></>;
}
