import {createHash} from 'node:crypto';
import {getSupabaseConfig,requestDatabase} from '@/app/api/auth/_server';
export const runtime='nodejs';
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 if(process.env.APP_ENV!=='test')return Response.json({message:'Indisponível.'},{status:404,headers});
 const token=request.headers.get('authorization')?.match(/^Bearer ([A-Za-z0-9_-]{43})$/)?.[1];
 const config=getSupabaseConfig();
 if(!token||!config)return Response.json({message:'Acesso negado.'},{status:403,headers});
 const response=await requestDatabase('rpc/job_assistant_consume',config.anonKey,{request_hash:createHash('sha256').update(token).digest('hex')}).catch(()=>null);
 if(!response?.ok)return Response.json({message:'Solicitação expirada ou já utilizada.'},{status:403,headers});
 return Response.json(await response.json(),{headers});
}
