import type {NextRequest} from 'next/server';
import {validCompanyHostname} from '@/app/lib/company-domain';
import {createHash} from 'node:crypto';
import {termsOfServiceHtml} from '@/app/legal-documents';
import {passwordRules,isEmail} from '@/app/components/auth/auth-validation';
import {communicationJson} from '@/app/lib/communications-server';
import {getSupabaseConfig,requestAuth,requestDatabase,requireSameOrigin,setSessionCookies,clearPasswordRecoveryCookie,type SupabaseSessionPayload} from '../_server';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const headers=new Headers({'Cache-Control':'no-store'});
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 let b:Record<string,unknown>;try{b=await communicationJson(request);if(!b||Array.isArray(b))throw new Error()}catch{return Response.json({message:'Dados inválidos.'},{status:400,headers})}
 try{
  if(typeof b.fullName!=='string'||b.fullName.trim().length<3||b.fullName.trim().length>120||typeof b.email!=='string'||b.email.length>254||!isEmail(b.email)||typeof b.password!=='string'||Object.values(passwordRules(b.password)).some(ok=>!ok)||b.confirmPassword!==b.password||b.acceptedTerms!==true||typeof b.slug!=='string')return Response.json({message:'Revise os campos, a senha e o aceite dos termos.'},{status:400,headers});
  const config=getSupabaseConfig();if(!config)throw new Error();
  const host=new URL('https://'+(request.headers.get('x-forwarded-host')||request.headers.get('host')||request.nextUrl.host)).hostname;
  const primary=new URL(process.env.APP_PUBLIC_URL||'https://test.jobforged.com').hostname;
  if(![primary,'localhost','127.0.0.1','[::1]'].includes(host)){if(!validCompanyHostname(host))return Response.json({message:'Domínio indisponível.'},{status:403,headers});const verified=await requestDatabase('rpc/resolve_company_domain',config.anonKey,{requested_hostname:host});if(!verified?.ok||await verified.json()!==b.slug)return Response.json({message:'A empresa não corresponde ao domínio acessado.'},{status:403,headers})}
  const response=await requestDatabase('rpc/create_candidate_signup_intent',config.anonKey,{email:b.email.trim().toLowerCase(),full_name:b.fullName.trim(),requested_slug:b.slug,terms_revision:createHash('sha256').update(termsOfServiceHtml).digest('hex'),accepted_terms:true});
  const nonce=response?.ok?await response.json():null;
  if(typeof nonce!=='string')return Response.json({message:response?.status===429?'Limite temporário atingido. Tente mais tarde.':'Não foi possível validar o cadastro. Tente novamente mais tarde.'},{status:response?.status===429?429:400,headers});
  const result=await requestAuth('signup',{email:b.email.trim().toLowerCase(),password:b.password,data:{account_type:'candidate',candidate_signup_nonce:nonce}});
  if(!result.response?.ok)return Response.json({message:'Não foi possível criar a conta. Se já possui cadastro, entre ou recupere sua senha.'},{status:400,headers});
  const session=result.payload as SupabaseSessionPayload;
  if(session.access_token){clearPasswordRecoveryCookie(headers);setSessionCookies(headers,session)}
  return Response.json({ok:true,requiresConfirmation:!session.access_token,message:session.access_token?'Conta criada. Você já está conectado.':'Confira seu e-mail para confirmar o cadastro. Se já possui conta, use Entrar.'},{headers});
 }catch{return Response.json({message:'Serviço indisponível. Tente novamente em instantes.'},{status:503,headers})}
}
