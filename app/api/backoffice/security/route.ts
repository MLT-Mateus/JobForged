import type { NextRequest } from 'next/server';
import { readSession, requestAuth, requestDatabase, requireSameOrigin, setSessionCookies, type SupabaseSessionPayload } from '@/app/api/auth/_server';

export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'no-store'}),session=await readSession(request,headers);
 if(!session?.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const [status,user]=await Promise.all([requestDatabase('rpc/security_status',session.accessToken,{}),requestAuth('user',undefined,session.accessToken)]);
 if(!status?.ok||!user.response?.ok)return Response.json({message:'Não foi possível conferir a segurança.'},{status:503,headers});
 const factors=(Array.isArray(user.payload?.factors)?user.payload.factors:[]) as Array<{id:string;status:string;factor_type:string;friendly_name?:string}>;
 return Response.json({...(await status.json() as Record<string,unknown>),factors:factors.filter(f=>f.factor_type==='totp'&&f.status==='verified').map(f=>({id:f.id,name:f.friendly_name||'Aplicativo autenticador'}))},{headers});
}
export async function POST(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'no-store'}),session=await readSession(request,headers);
 if(!session?.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 if(Number(request.headers.get('content-length')||0)>2048)return Response.json({message:'Solicitação inválida.'},{status:413,headers});
 const body=await request.json().catch(()=>null) as {operation?:string;factorId?:string;code?:string}|null;
 if(body?.operation==='enroll'){
  const result=await requestAuth('factors',{factor_type:'totp',friendly_name:'JobForged '+new Date().toISOString().slice(0,19)},session.accessToken);
  const factor=result.payload as {id?:string;totp?:{qr_code?:string}}|null;
  if(!result.response?.ok||!factor?.id||!factor.totp?.qr_code)return Response.json({message:'Não foi possível iniciar o cadastro do fator.'},{status:400,headers});
  // Render as an image, never inject provider SVG into the page DOM.
  const qr=factor.totp.qr_code;
  return Response.json({factorId:factor.id,qr:qr.startsWith('data:image/')?qr:`data:image/svg+xml;base64,${Buffer.from(qr).toString('base64')}`},{headers});
 }
 if(body?.operation==='verify'&&/^[0-9a-f-]{36}$/i.test(body.factorId||'')&&/^\d{6}$/.test(body.code||'')){
  const challenge=await requestAuth(`factors/${body.factorId}/challenge`,{},session.accessToken);
  const id=challenge.payload?.id;
  if(!challenge.response?.ok||typeof id!=='string')return Response.json({message:'Não foi possível solicitar a verificação.'},{status:400,headers});
  const result=await requestAuth(`factors/${body.factorId}/verify`,{challenge_id:id,code:body.code},session.accessToken);
  const upgraded=result.payload as SupabaseSessionPayload;
  if(!result.response?.ok||!upgraded?.access_token)return Response.json({message:'Código inválido ou expirado.'},{status:400,headers});
  setSessionCookies(headers,upgraded);
  return Response.json({ok:true},{headers});
 }
 if(body?.operation==='enable'){
  const result=await requestDatabase('rpc/enable_admin_mfa',session.accessToken,{});
  if(!result?.ok)return Response.json({message:'Confirme um código recente antes de ativar a proteção.'},{status:403,headers});
  return Response.json({ok:true},{headers});
 }
 return Response.json({message:'Solicitação inválida.'},{status:400,headers});
}
