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
 if(!b||!['read','register','disconnect','check','check-replacement'].includes(String(b.operation))||write&&!['check','check-replacement'].includes(String(b.operation))&&(!Number.isSafeInteger(b.version)||Number(b.version)<0||b.operation==='read')||b.operation==='register'&&(!validCompanyHostname(b.hostname)||!validCompanyHostname(b.zone)||!(b.kind==='root'?b.hostname===b.zone:b.kind==='subdomain'&&b.hostname.endsWith('.'+b.zone))))return Response.json({message:'Informe somente um domínio válido, sem https:// ou caminhos.'},{status:400,headers});
 const operation=['check','check-replacement'].includes(String(b.operation))?'read':b.operation;
 const response=await requestDatabase('rpc/company_domain_with_preferences',session.accessToken,{operation,requested_hostname:b.hostname??null,expected_version:b.version??null,requested_kind:b.kind??null,requested_zone:b.zone??null});if(!response?.ok){const e=await response?.json().catch(()=>null) as {code?:string}|null;return Response.json({message:e?.code==='23505'?'Este domínio já possui vínculo.':e?.code==='PT409'?'Outra sessão alterou o domínio. Atualize o status.':'Não foi possível salvar o domínio.'},{status:['23505','PT409'].includes(e?.code||'')?409:400,headers})}
 const domain=await response.json() as Record<string,unknown>;
 if(b.operation==='check'||b.operation==='check-replacement'){
  if(typeof domain.hostname!=='string'||typeof domain.proof!=='string')return Response.json({message:'Vincule um domínio antes de testar o DNS.'},{status:409,headers});
  const candidate=b.operation==='check-replacement'?b.hostname:domain.hostname;
  if(!validCompanyHostname(candidate)||b.operation==='check-replacement'&&(domain.status!=='active'||candidate===domain.hostname))return Response.json({message:'Informe um novo domínio válido.'},{status:400,headers});
  const diagnosis=await diagnoseCompanyDomain(candidate,domain.proof);
  return Response.json({domain,diagnosis,targetHost:new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com').hostname},{headers});
 }
 return Response.json({...domain,targetHost:new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com').hostname},{headers});
 }catch(error){return Response.json({message:error instanceof Error&&error.message==='DNS_LOOKUP_UNAVAILABLE'?'A consulta ao DNS público não respondeu. Tente novamente em instantes; nada foi alterado.':'Não foi possível consultar o domínio agora. Tente novamente em instantes.'},{status:503,headers})}
}
export const GET=(r:NextRequest)=>handle(r);
export const POST=(r:NextRequest)=>handle(r,true);
