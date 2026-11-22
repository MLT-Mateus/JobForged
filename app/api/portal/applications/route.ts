import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
export const runtime='nodejs';
async function run(request:NextRequest,write:boolean){const headers=new Headers({'Cache-Control':'no-store'});
 if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(session?.role!=='candidate')return Response.json({message:'Entre com sua conta de candidato.'},{status:403,headers});
 const b=write?await request.json().catch(()=>null) as {operation?:string;jobId?:string;accepted?:boolean}|null:null;
 if(write&&(!b||!['apply','withdraw'].includes(b.operation||'')||!b.jobId?.match(/^[0-9a-f-]{36}$/i)))return Response.json({message:'Confira a candidatura.'},{status:400,headers});
 const r=await requestDatabase('rpc/candidate_applications_v2',session.accessToken,{operation:b?.operation||'list',job_id:b?.jobId??null,accepted:b?.accepted===true});if(!r)return Response.json({message:'Serviço indisponível. Tente novamente.'},{status:503,headers});if(!r.ok){const e=await r.json().catch(()=>({})) as {message?:string;code?:string};return Response.json({message:e.message==='resume required'?'Esta vaga exige currículo. Adicione o PDF para continuar.':e.message==='closed job'?'Esta vaga não está recebendo candidaturas.':e.message==='consent required'?'Confirme o compartilhamento para continuar.':'Não foi possível concluir. Atualize a página e tente novamente.'},{status:e.code==='42501'?403:422,headers})}return Response.json(await r.json(),{headers});}
export const GET=(r:NextRequest)=>run(r,false);export const POST=(r:NextRequest)=>run(r,true);
