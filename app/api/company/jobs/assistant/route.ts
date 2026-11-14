import {createHash,randomBytes} from 'node:crypto';
import {Buffer} from 'node:buffer';
import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {assistantDraft,validateAssistantPatch} from '@/app/components/jobs/job-assistant-contract';
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
  if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>70000){await reader.cancel();return fail('Conversa muito longa.',413)}text+=decoder.decode(part.value,{stream:true})}
  const body=JSON.parse(text+decoder.decode());
  if(body.companyId!==session.company.id||typeof body.message!=='string'||!body.message.trim()||body.message.length>4000||!body.draft||typeof body.draft!=='object')return fail('Confira a mensagem e a empresa ativa.',400);
  const response=await requestDatabase('rpc/company_branches_v1',session.accessToken,{operation:'list'});
  if(!response?.ok)return fail('Não foi possível consultar as filiais.',503);
  const branches=(await response.json() as {id:string;name:string;city:string;state:string;status:string}[]).filter(b=>b.status==='Ativo').map(({id,name,city,state})=>({id,name,city,state}));
  const draft=validateAssistantPatch(assistantDraft(body.draft),branches.map(b=>b.id));
  const history=Array.isArray(body.history)?body.history.slice(-12).map((m:{role?:string;text?:string})=>({role:m?.role==='assistant'?'assistant':'user',text:typeof m?.text==='string'?m.text.slice(0,4000):''})):[];
  const token=Buffer.from(randomBytes(32)).toString('base64url');
  const issued=await requestDatabase('rpc/job_assistant_issue',session.accessToken,{token_hash:createHash('sha256').update(token).digest('hex'),payload:{draft,branches,history,message:body.message,today:new Date().toISOString().slice(0,10)}});
  if(!issued?.ok)return fail(issued?.status===429?'Limite do assistente atingido. Tente novamente mais tarde.':'Não foi possível iniciar o assistente.',issued?.status===429?429:503);
  const result=await fetch('https://n8n.jobforged.com/webhook/jbfd-test-job-authoring',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token}),redirect:'error',signal:AbortSignal.timeout(22000)});
  if(!result.ok)return fail('O assistente está indisponível. Seu formulário permanece preservado.',503);
  const data=await result.json() as {reply?:unknown;patch?:unknown};
  if(typeof data.reply!=='string'||!data.reply.trim()||data.reply.length>4000)return fail('O assistente não retornou uma sugestão válida. Tente novamente.',502);
  const patch=validateAssistantPatch(data.patch,branches.map(b=>b.id));
  return Response.json({reply:data.reply,patch,branches},{headers});
 }catch{return fail('Não foi possível concluir a sugestão. Seus dados não foram alterados.',503)}
}
