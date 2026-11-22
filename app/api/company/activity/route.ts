import type {NextRequest} from 'next/server';
import {readSession,requestDatabase} from '@/app/api/auth/_server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 const session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 const params=new URL(request.url).searchParams,page=Number(params.get('page')??1),category=params.get('category')??'all',actor=params.get('actor')||'',from=params.get('from')||null,to=params.get('to')||null;
 if(actor.length>120||[from,to].some(value=>value!==null&&!/^\d{4}-\d{2}-\d{2}$/.test(value))||from&&to&&from>to||!Number.isSafeInteger(page)||page<1||page>100000||!['all','company','member','branding','portal','domain','job','application','agenda'].includes(category))return Response.json({message:'Filtro inválido.'},{status:400,headers});
 const response=await requestDatabase('rpc/company_activity_v2',session.accessToken,{requested_page:page,category,actor_query:actor,date_from:from,date_to:to}).catch(()=>null);
 if(!response?.ok)return Response.json({message:'Não foi possível carregar a atividade.'},{status:503,headers});
 return Response.json(await response.json(),{headers});
}
