import {getSupabaseConfig,requestDatabase} from '@/app/api/auth/_server';
import {validPortalSlug} from '@/app/lib/company-portal';
export const runtime='nodejs';
export async function GET(_request:Request,{params}:{params:Promise<{slug:string}>}){
 const {slug}=await params;const config=getSupabaseConfig();const headers={'Cache-Control':'no-store'};
 if(!validPortalSlug(slug))return Response.json({message:'Página inválida.'},{status:404,headers});
 const result=config?await requestDatabase('rpc/public_jobs_v1',config.anonKey,{requested_slug:slug}).catch(()=>null):null;
 if(!result?.ok)return Response.json({message:'Não foi possível carregar as vagas.'},{status:503,headers});
 return Response.json(await result.json(),{headers});
}
