import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {communicationJson} from '@/app/lib/communications-server';
import {validCompanyHostname} from '@/app/lib/company-domain';
import {diagnoseCompanyDomain} from '@/app/lib/company-domain-diagnostics';
export const runtime='nodejs';
async function handle(request:NextRequest,write=false){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(!session?.company||session.platformAdmin||write&&!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{const b=write?await communicationJson(request):{operation:'read'};
 if(!b||!['read','register','disconnect','check'].includes(String(b.operation))||write&&b.operation!=='check'&&(!Number.isSafeInteger(b.version)||Number(b.version)<0||b.operation==='read')||b.operation==='register'&&!validCompanyHostname(b.hostname))return Response.json({message:'Informe somente um domínio válido, sem https:// ou caminhos.'},{status:400,headers});
 const operation=b.operation==='check'?'read':b.operation;
 const response=await requestDatabase('rpc/company_domain',session.accessToken,{operation,requested_hostname:b.hostname??null,expected_version:b.version??null});if(!response?.ok){const e=await response?.json().catch(()=>null) as {code?:string}|null;return Response.json({message:e?.code==='23505'?'Este domínio já possui vínculo.':e?.code==='PT409'?'Outra sessão alterou o domínio. Atualize o status.':'Não foi possível salvar o domínio.'},{status:['23505','PT409'].includes(e?.code||'')?409:400,headers})}
 const domain=await response.json() as Record<string,unknown>;
 if(b.operation==='check'){
  if(typeof domain.hostname!=='string'||typeof domain.proof!=='string')return Response.json({message:'Vincule um domínio antes de testar o DNS.'},{status:409,headers});
  const diagnosis=await diagnoseCompanyDomain(domain.hostname,domain.proof);
  return Response.json({domain,diagnosis,targetHost:new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com').hostname},{headers});
 }
 return Response.json({...domain,targetHost:new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com').hostname},{headers});
 }catch(error){return Response.json({message:error instanceof Error&&error.message==='DNS_LOOKUP_UNAVAILABLE'?'A consulta ao DNS público não respondeu. Tente novamente em instantes; nada foi alterado.':'Não foi possível consultar o domínio agora. Tente novamente em instantes.'},{status:503,headers})}
}
export const GET=(r:NextRequest)=>handle(r);
export const POST=(r:NextRequest)=>handle(r,true);
