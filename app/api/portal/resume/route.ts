import type {NextRequest} from 'next/server';
import {createHash,randomUUID} from 'node:crypto';
import {getSupabaseConfig,readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
import {resumeLimit,validateResume} from '@/app/lib/candidate-resume';
export const runtime='nodejs';
const storage=(path:string,token:string,body?:Uint8Array)=>{const c=getSupabaseConfig();if(!c)throw new Error();return fetch(`${c.url}/storage/v1/object/candidate-resumes/${path}`,{method:body?'POST':'GET',cache:'no-store',signal:AbortSignal.timeout(15000),headers:{apikey:c.anonKey,Authorization:`Bearer ${token}`,...(body?{'Content-Type':'application/pdf','x-upsert':'false'}:{})},...(body?{body:Buffer.from(body)}:{})})};
export async function GET(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie','X-Content-Type-Options':'nosniff','Content-Security-Policy':"sandbox; default-src 'none'"});
 const session=await readSession(request,headers);if(session?.role!=='candidate')return Response.json({message:'Entre na sua conta de candidato.'},{status:403,headers});
 try{const r=await requestDatabase('rpc/candidate_resume',session.accessToken,{operation:'download'});const doc=r?.ok?await r.json() as {path:string;sha256:string;size:number}|null:null;if(!doc)return Response.json({message:'Nenhum currículo enviado.'},{status:404,headers});
 const file=await storage(doc.path,session.accessToken);if(!file.ok)throw new Error();const bytes=Buffer.from(await file.arrayBuffer());if(bytes.length!==doc.size||createHash('sha256').update(bytes).digest('hex')!==doc.sha256)throw new Error();headers.set('Content-Type','application/pdf');headers.set('Content-Disposition','attachment; filename="meu-curriculo.pdf"');return new Response(bytes,{headers});
 }catch{return Response.json({message:'Não foi possível abrir o currículo.'},{status:503,headers})}
}
export async function POST(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(session?.role!=='candidate')return Response.json({message:'Use sua conta de candidato.'},{status:403,headers});
 try{
 const version=Number(request.headers.get('x-profile-version'));if(!request.headers.has('x-profile-version')||!Number.isSafeInteger(version)||version<0||request.headers.get('content-type')!=='application/pdf')return Response.json({message:'Use um arquivo PDF e recarregue seu perfil.'},{status:400,headers});
 const reader=request.body?.getReader();if(!reader)throw new Error('Selecione um PDF.');let size=0;const chunks:Uint8Array[]=[];while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>resumeLimit){await reader.cancel();return Response.json({message:'Envie um PDF de até 5 MB.'},{status:413,headers})}chunks.push(part.value)}
 const bytes=validateResume(Buffer.concat(chunks)),id=randomUUID();
 const reserve=await requestDatabase('rpc/candidate_resume',session.accessToken,{operation:'reserve',asset_id:id});if(!reserve?.ok)return Response.json({message:'Limite de envios atingido ou sessão indisponível. Tente mais tarde.'},{status:429,headers});
 const uploaded=await storage(`${session.id}/${id}.pdf`,session.accessToken,bytes);if(!uploaded.ok)throw new Error('Armazenamento indisponível. Tente novamente.');
 const name=decodeURIComponent(request.headers.get('x-file-name')||'curriculo.pdf').replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,150).replace(/\.pdf$/i,'')+'.pdf';
 const saved=await requestDatabase('rpc/candidate_resume',session.accessToken,{operation:'commit',asset_id:id,file_name:name,file_size:bytes.length,file_sha256:createHash('sha256').update(bytes).digest('hex'),expected_version:version});
 if(!saved?.ok){const e=await saved?.json().catch(()=>null) as {code?:string}|null;return Response.json({message:e?.code==='PT409'?'Seu perfil mudou em outra aba. Reabra sua conta antes de enviar.':'Não foi possível registrar seu currículo.'},{status:e?.code==='PT409'?409:503,headers})}
 return Response.json({resume:await saved.json()},{headers});
 }catch(e){return Response.json({message:e instanceof Error?e.message:'Não foi possível enviar. Use PDF de até 5 MB.'},{status:400,headers})}
}
