import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {administrativeFailure} from '@/app/lib/administrative-feedback';
import {communicationJson} from '@/app/lib/communications-server';
export const runtime='nodejs';
async function perform(request:NextRequest,write:boolean){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(process.env.APP_ENV==='live')return Response.json({message:'Exclusão indisponível em Live. Requer habilitação e validação próprias.'},{status:503,headers});
 if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);
 if(!session?.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
  const body=write?await communicationJson(request):null;
  const company=write?body?.company:request.nextUrl.searchParams.get('company');
  if(company&&(typeof company!=='string'||!/^[0-9a-f-]{36}$/i.test(company)))return Response.json({message:'Empresa inválida.'},{status:400,headers});
  if(write&&(!company||typeof body?.confirmation!=='string'||body.confirmation.length>160||typeof body.reason!=='string'||body.reason.trim().length<5||body.reason.length>500||typeof body.removeAccounts!=='boolean'))return Response.json({message:'Informe o nome exato e um motivo de 5 a 500 caracteres.'},{status:400,headers});
  const response=await requestDatabase('rpc/company_deletion',session.accessToken,{operation:write?'request':company?'preview':'jobs',target_company:company||null,confirmation:body?.confirmation||'',change_reason:body?.reason||'',remove_accounts:body?.removeAccounts||false});
  if(!response?.ok)return administrativeFailure(response,'Exclusão recusada. Confira o nome exato da empresa e a autenticação recente.',headers);
  return Response.json(await response.json(),{status:write?202:200,headers});
 }catch{return Response.json({message:'Não foi possível conferir a exclusão agora. Confira sua conexão e tente novamente.'},{status:503,headers})}
}
export function GET(request:NextRequest){return perform(request,false)}
export function POST(request:NextRequest){return perform(request,true)}
