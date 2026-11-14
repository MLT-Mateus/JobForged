import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
export const runtime='nodejs';
async function run(request:NextRequest,write:boolean){
 const headers=new Headers({'Cache-Control':'no-store'});if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const b=write?await request.json().catch(()=>null) as {memberId?:string;permissions?:unknown;version?:number;companyId?:string}|null:null;
 if(write&&b?.companyId!==session.company.id)return Response.json({message:'A empresa ativa mudou.'},{status:409,headers});
 const r=await requestDatabase('rpc/company_access_v1',session.accessToken,{operation:write?'save':'read',member_id:b?.memberId||request.nextUrl.searchParams.get('member')||null,permissions:b?.permissions??null,expected_version:b?.version??null});
 if(!r?.ok)return Response.json({message:'Não foi possível atualizar ou consultar as permissões.'},{status:403,headers});return Response.json(await r.json(),{headers});
}
export const GET=(r:NextRequest)=>run(r,false);export const POST=(r:NextRequest)=>run(r,true);
