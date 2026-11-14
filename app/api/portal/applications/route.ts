import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
export const runtime='nodejs';
async function run(request:NextRequest,write:boolean){const headers=new Headers({'Cache-Control':'no-store'});
 if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(session?.role!=='candidate')return Response.json({message:'Entre com sua conta de candidato.'},{status:403,headers});
 const b=write?await request.json().catch(()=>null) as {operation?:string;jobId?:string;accepted?:boolean}|null:null;
 if(write&&(!b||!['apply','withdraw'].includes(b.operation||'')||!b.jobId?.match(/^[0-9a-f-]{36}$/i)))return Response.json({message:'Confira a candidatura.'},{status:400,headers});
 const r=await requestDatabase('rpc/candidate_applications_v1',session.accessToken,{operation:b?.operation||'list',job_id:b?.jobId??null,accepted:b?.accepted===true});if(!r?.ok)return Response.json({message:'Não foi possível concluir. Confira se a vaga está aberta, envie seu currículo e confirme o compartilhamento.'},{status:422,headers});return Response.json(await r.json(),{headers});}
export const GET=(r:NextRequest)=>run(r,false);export const POST=(r:NextRequest)=>run(r,true);
