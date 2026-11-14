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
  const reader=request.body?.getReader();let text='',size=0;const decoder=new TextDecoder();
  if(reader)while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.length;if(size>40000){await reader.cancel();return Response.json({message:'Conteúdo muito grande.'},{status:413,headers})}text+=decoder.decode(chunk.value,{stream:true})}
  try{body=JSON.parse(text+decoder.decode())}catch{return Response.json({message:'Dados inválidos.'},{status:400,headers})}
  if(!body||!['save','delete'].includes(String(body.operation))||body.companyId!==session.company.id)return Response.json({message:'A empresa ativa mudou. Recarregue a página.'},{status:409,headers});
 }
 if(body.id!=null&&(typeof body.id!=='string'||!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(body.id)))return Response.json({message:'Filial inválida.'},{status:400,headers});
 const result=await requestDatabase('rpc/company_branches_v1',session.accessToken,{operation:body.operation,branch_id:body.id??null,document:body.document??null,expected_version:body.version??null}).catch(()=>null);
 if(!result)return Response.json({message:'Serviço indisponível.'},{status:503,headers});
 if(!result.ok){const error=await result.json().catch(()=>({})) as {code?:string};return Response.json({message:error.code==='PT422'?'Desvincule ou transfira as vagas antes de excluir a filial.':error.code==='PT409'?'Uma das vagas já pertence a outra filial. Remova o vínculo anterior primeiro.':error.code==='40001'?'Outra pessoa alterou esta filial. Feche e recarregue antes de editar.':error.code==='42501'?'Você não tem permissão para esta operação.':'Confira os campos obrigatórios e tente novamente.'},{status:error.code==='40001'?409:error.code==='42501'?403:400,headers})}
 return Response.json(await result.json(),{headers});
}
export const GET=(request:NextRequest)=>handle(request);
export const POST=(request:NextRequest)=>handle(request,true);
