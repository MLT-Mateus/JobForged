import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
export const runtime='nodejs';
async function run(request:NextRequest,write:boolean){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
  const raw=write?await request.text():'';if(raw.length>24000)return Response.json({message:'Conteúdo muito grande.'},{status:413,headers});
  const params=request.nextUrl.searchParams;
  let input:unknown;
  if(write){try{input=JSON.parse(raw)}catch{return Response.json({message:'Conteúdo inválido.'},{status:400,headers})}}
  if(write&&(!input||typeof input!=='object'||Array.isArray(input)))return Response.json({message:'Conteúdo inválido.'},{status:400,headers});
  const body=write?input as Record<string,unknown>:{operation:params.get('operation')||'list',id:params.get('id'),document:Object.fromEntries(['query','jobId','stageKey','outcome','page','pageSize'].map(k=>[k,params.get(k)||undefined]))};
  if(write&&body.companyId!==session.company.id)return Response.json({message:'A empresa ativa mudou. Atualize a página.'},{status:409,headers});
  if(typeof body.operation!=='string'||!(write?['move','note']:['list','board','detail','history']).includes(body.operation)||body.id&&(typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)))return Response.json({message:'Operação inválida.'},{status:400,headers});
  const r=await requestDatabase('rpc/company_applications_v2',session.accessToken,{operation:body.operation,record_id:body.id||null,document:body.document||{},expected_version:body.version??null});
  if(!r||r.status>=500)return Response.json({message:'Serviço indisponível. Tente novamente.'},{status:503,headers});
  if(!r?.ok){const e=await r?.json().catch(()=>null) as {code?:string}|null;return Response.json({message:e?.code==='40001'?'Esta candidatura mudou. Atualize antes de tentar novamente.':e?.code==='42501'?'Você não possui permissão para esta ação.':e?.code==='P0002'?'Candidatura não encontrada.':e?.code==='PT422'?'Esta candidatura foi retirada pelo candidato.':'Confira o destino e informe um motivo para decisões ou retornos.'},{status:e?.code==='40001'?409:e?.code==='42501'?403:e?.code==='P0002'?404:422,headers})}
  return Response.json(await r.json(),{headers});
 }catch{return Response.json({message:'Não foi possível concluir. Seus dados foram preservados.'},{status:503,headers})}
}
export const GET=(request:NextRequest)=>run(request,false);
export const POST=(request:NextRequest)=>run(request,true);
