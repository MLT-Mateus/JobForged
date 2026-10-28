import type {NextRequest} from 'next/server';
import {readSession,requestDatabase} from '@/app/api/auth/_server';
export const runtime='nodejs';
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const r=await requestDatabase('rpc/company_setup_status',session.accessToken,{}).catch(()=>null);
 if(!r?.ok)return Response.json({message:'Não foi possível conferir a configuração da conta.'},{status:503,headers});
 const data=await r.json() as {companyId?:string}|null;
 if(data?.companyId!==session.company.id)return Response.json({message:"O contexto da conta mudou. Atualize o setup."},{status:409,headers});
 return Response.json(data,{headers});
}
