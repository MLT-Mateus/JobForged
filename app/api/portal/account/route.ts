import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {communicationJson} from '@/app/lib/communications-server';
export const runtime='nodejs';
async function handle(request:NextRequest,mutation:boolean){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(mutation&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);
 if(!session)return Response.json({message:'Entre para acessar sua conta.'},{status:401,headers});
 let b:Record<string,unknown>;try{b=mutation?await communicationJson(request):{};if(!b||Array.isArray(b))throw new Error()}catch{return Response.json({message:'Dados inválidos.'},{status:400,headers})}
 try{
 const operation=mutation?b.operation:'read',page=Number(request.nextUrl.searchParams.get('page')||1);
 if(!Number.isInteger(page)||page<1||page>10000||!['read','profile','read-alert'].includes(String(operation))||mutation&&operation==='read')return Response.json({message:'Operação inválida.'},{status:400,headers});
 if(operation==='profile'&&(typeof b.fullName!=='string'||b.fullName.trim().length<3||b.fullName.trim().length>120||!Number.isSafeInteger(b.version)))return Response.json({message:'Revise o nome.'},{status:400,headers});
 if(operation==='read-alert'&&(typeof b.id!=='string'||!/^[a-f0-9-]{36}$/i.test(b.id)))return Response.json({message:'Alerta inválido.'},{status:400,headers});
 if(session.role!=='candidate'&&operation==='profile')return Response.json({message:'Use o perfil da sua conta empresarial.'},{status:403,headers});
 const response=session.role==='candidate'?await requestDatabase('rpc/candidate_account',session.accessToken,{operation,expected_version:b.version??null,full_name:b.fullName??null,delivery_id:b.id??null,page_number:page}):await requestDatabase(operation==='read-alert'?'rpc/mark_my_notification':'rpc/communications_read',session.accessToken,operation==='read-alert'?{delivery_id:b.id}:{section:'inbox',page_number:page});
 if(!response?.ok){const error=await response?.json().catch(()=>null) as {code?:string}|null;return Response.json({message:(error?.code==='40001'||error?.code==='PT409')?'Outra sessão alterou seu perfil. Reabra o menu antes de salvar.':'Não foi possível concluir. Confira sua sessão.'},{status:(error?.code==='40001'||error?.code==='PT409')?409:403,headers})}
 const data=await response.json() as Record<string,unknown>;return Response.json({...data,role:session.role,email:session.email,fullName:'fullName' in session?session.fullName:''},{headers});
 }catch{return Response.json({message:'Serviço indisponível. Tente novamente.'},{status:503,headers})}
}
export const GET=(request:NextRequest)=>handle(request,false);
export const POST=(request:NextRequest)=>handle(request,true);
