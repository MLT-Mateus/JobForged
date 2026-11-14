import {Buffer} from 'node:buffer';
import {createHash,randomBytes} from 'node:crypto';
import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {assistantDraft,validateAssistantPatch} from '@/app/components/jobs/job-assistant-contract';
import {emptyJob} from '@/app/components/jobs/job-types';
import {editorChecks} from '@/app/components/jobs/job-editor-model';
import {jsonFrames,partialReply} from '@/app/components/jobs/chat-stream';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 const fail=(message:string,status:number)=>Response.json({message},{status,headers});
 if(process.env.APP_ENV!=='test')return fail('Assistente disponível no ambiente Test.',404);
 if(!requireSameOrigin(request))return fail('Origem inválida.',403);
 const session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return fail('Acesso negado.',403);
 try{
  const reader=request.body?.getReader();let text='',size=0;const decoder=new TextDecoder();
  if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>100000){await reader.cancel();return fail('Conversa muito longa.',413)}text+=decoder.decode(part.value,{stream:true})}
  const body=JSON.parse(text+decoder.decode());
  if(body.companyId!==session.company.id||typeof body.message!=='string'||!body.message.trim()||body.message.length>4000||!body.draft||typeof body.draft!=='object')return fail('Confira a mensagem e a empresa ativa.',400);
  const attachments=body.attachments??[];
  if(!Array.isArray(attachments)||attachments.length>2||attachments.some(a=>!a||typeof a.name!=='string'||a.name.length>180||typeof a.text!=='string'||!a.text.trim())||attachments.reduce((n,a)=>n+a.text.length,0)>16000)return fail('Anexe até dois documentos, com no máximo 16 mil caracteres no total.',400);
  const response=await requestDatabase('rpc/company_branches_v1',session.accessToken,{operation:'list'});
  if(!response?.ok)return fail('Não foi possível consultar as filiais.',503);
  const branches=(await response.json() as {id:string;name:string;city:string;state:string;status:string}[]).filter(b=>b.status==='Ativo').map(({id,name,city,state})=>({id,name,city,state}));
  const draft=validateAssistantPatch(assistantDraft(body.draft),branches.map(b=>b.id));
  const missing=editorChecks({...emptyJob(),...draft}).filter(c=>!c.done).map(c=>c.label);
  const history=Array.isArray(body.history)?body.history.slice(-12).map((m:{role?:string;text?:string})=>({role:m?.role==='assistant'?'assistant':'user',text:typeof m?.text==='string'?m.text.slice(0,3000):''})):[];
  const payload={draft,branches,history,attachments:attachments.map(a=>({name:a.name,text:a.text})),company:{name:session.company.name},missing,message:body.message,today:new Date().toISOString().slice(0,10)};
  if(new TextEncoder().encode(JSON.stringify(payload)).length>95000)return fail('Reduza o tamanho dos anexos para continuar.',413);
  const token=Buffer.from(randomBytes(32)).toString('base64url');
  const issued=await requestDatabase('rpc/job_assistant_issue',session.accessToken,{token_hash:createHash('sha256').update(token).digest('hex'),payload});
  if(!issued?.ok)return fail(issued?.status===429?'Limite do assistente atingido. Tente novamente mais tarde.':'Não foi possível iniciar o assistente.',issued?.status===429?429:503);
  const wantsStream=request.headers.get('accept')?.includes('application/x-ndjson');
  const abort=new AbortController(),signal=AbortSignal.any([request.signal,abort.signal,AbortSignal.timeout(24000)]);
  const result=await fetch('https://n8n.jobforged.com/webhook/'+(wantsStream?'jbfd-test-job-authoring-stream':'jbfd-test-job-authoring'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),redirect:'error',signal});
  if(!result.ok)return fail('O assistente está indisponível. Seu formulário permanece preservado.',503);
  function validate(data:{reply?:unknown;patch?:unknown}){
   if(typeof data.reply!=='string'||!data.reply.trim()||data.reply.length>4000)throw Error('Resposta inválida.');
   const patch=validateAssistantPatch(data.patch,branches.map(b=>b.id));
   return {reply:data.reply,patch,branches};
  }
  if(!wantsStream)return Response.json(validate(await result.json()),{headers});
  headers.set('Content-Type','application/x-ndjson; charset=utf-8');headers.set('X-Accel-Buffering','no');
  const encoder=new TextEncoder();let closed=false;
  return new Response(new ReadableStream({
   async start(controller){const emit=(data:unknown)=>{if(!closed)controller.enqueue(encoder.encode(JSON.stringify(data)+'\n'))};
    try{
     emit({type:'status',text:'Organizando as informações da vaga'});
     const frames=jsonFrames(),upstream=result.body?.getReader(),decode=new TextDecoder();let raw='',reply='',total=0;
     if(!upstream)throw Error('Resposta vazia.');
     while(true){const chunk=await upstream.read();if(chunk.done)break;total+=chunk.value.length;if(total>250000)throw Error('Resposta muito longa.');for(const event of frames(decode.decode(chunk.value,{stream:true}))){if(event.type==='error')throw Error('Falha no assistente.');if(event.type==='item'&&typeof event.content==='string'&&(!event.metadata|| (event.metadata as {nodeName?:string}).nodeName==='Assistente de vagas')){raw+=event.content;if(raw.length>50000)throw Error('Resposta muito longa.');const next=partialReply(raw);if(next!==reply){reply=next;emit({type:'reply',text:reply})}}}}
     const data=validate(JSON.parse(raw.replace(/^```(?:json)?\s*/,'').replace(/\s*```$/,'')));
     emit({type:'done',...data});
    }catch{emit({type:'error',message:'A resposta não foi concluída. Tente novamente; o formulário não foi alterado.'})}
    finally{closed=true;try{controller.close()}catch{/* Client disconnected. */}}
   },cancel(){closed=true;abort.abort()}
  }),{headers});
 }catch{return fail('Não foi possível concluir a sugestão. Seus dados não foram alterados.',503)}
}
