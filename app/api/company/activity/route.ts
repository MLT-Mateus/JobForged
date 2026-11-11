import type {NextRequest} from 'next/server';
import {readSession,requestDatabase} from '@/app/api/auth/_server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 const session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 const params=new URL(request.url).searchParams,page=Number(params.get('page')??1),category=params.get('category')??'all';
 if(!Number.isSafeInteger(page)||page<1||page>100000||!['all','company','member','branding','portal','domain'].includes(category))return Response.json({message:'Filtro inválido.'},{status:400,headers});
 const response=await requestDatabase('rpc/company_activity_v1',session.accessToken,{requested_page:page,category}).catch(()=>null);
 if(!response?.ok)return Response.json({message:'Não foi possível carregar a atividade.'},{status:503,headers});
 return Response.json(await response.json(),{headers});
}
