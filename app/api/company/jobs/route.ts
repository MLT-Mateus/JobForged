import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
export const runtime='nodejs';
async function handle(request:NextRequest,mutate=false){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(mutate&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||mutate&&!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 let body:Record<string,unknown>={operation:'list'};
 if(mutate){
  const reader=request.body?.getReader();let size=0,text='';const decoder=new TextDecoder();
  if(reader)while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>70000){await reader.cancel();return Response.json({message:'Conteúdo muito grande.'},{status:413,headers})}text+=decoder.decode(chunk.value,{stream:true})}
  try{body=JSON.parse(text+decoder.decode())}catch{return Response.json({message:'Dados inválidos.'},{status:400,headers})}
  if(!body||!['save','status','delete'].includes(String(body.operation))||body.companyId!==session.company.id)return Response.json({message:'A empresa ativa mudou ou a operação é inválida. Recarregue a página.'},{status:409,headers});
 }else{const id=new URL(request.url).searchParams.get('id');if(id)body={operation:'get',id}}
 if(body.id!=null&&(typeof body.id!=='string'||! /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)))return Response.json({message:'Vaga inválida.'},{status:400,headers});
 const result=await requestDatabase('rpc/company_jobs_v1',session.accessToken,{operation:body.operation,job_id:body.id??null,document:body.document??null,requested_status:body.status??null,expected_version:body.version??null}).catch(()=>null);
 if(!result)return Response.json({message:'Serviço indisponível. Tente novamente.'},{status:503,headers});
 if(!result.ok){const error=await result.json().catch(()=>({})) as {code?:string};const code=error.code;return Response.json({message:code==='40001'?'Outra sessão alterou esta vaga. Reabra a página antes de salvar.':code==='PT422'?'Publique a página da empresa em Personalização antes de publicar a vaga.':code==='42501'?'Você não tem permissão para alterar vagas.':code==='P0002'?'Vaga não encontrada.':code==='PT429'?'Limite de operações ou vagas atingido. Tente novamente mais tarde.':'Confira os campos obrigatórios da vaga.'},{status:code==='40001'?409:code==='42501'?403:code==='P0002'?404:code==='PT422'?422:code==='PT429'?429:400,headers})}
 return Response.json(await result.json(),{headers});
}
export const GET=(request:NextRequest)=>handle(request);
export const POST=(request:NextRequest)=>handle(request,true);
