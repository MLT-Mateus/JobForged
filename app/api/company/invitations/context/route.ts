import type {NextRequest} from 'next/server';
import {getCookie,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {communicationJson} from '@/app/lib/communications-server';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const access=getCookie(request,'jf_auth_access');if(!access)return Response.json({message:'Entre com o e-mail convidado.'},{status:401,headers});
 try{const body=await communicationJson(request);if(typeof body.token!=='string'||!/^[0-9a-f]{64}$/.test(body.token))return Response.json({message:'Convite inválido.'},{status:400,headers});
 const result=await requestDatabase('rpc/my_invitation_context',access,{invitation_token:body.token});
 if(!result?.ok)return Response.json({message:'Não foi possível verificar o convite. Confira sua sessão.'},{status:503,headers});
 return Response.json({invitation:await result.json()},{headers});
 }catch{return Response.json({message:'Não foi possível verificar o convite. Tente novamente.'},{status:503,headers})}
}
