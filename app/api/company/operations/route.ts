import type {NextRequest} from 'next/server';
import {createHash} from 'node:crypto';
import {Buffer} from 'node:buffer';
import {readSession,requestDatabase,requireSameOrigin,getSupabaseConfig} from '@/app/api/auth/_server';
export const runtime='nodejs';
async function run(request:NextRequest,write:boolean){
 const headers=new Headers({'Cache-Control':'no-store'});if(write&&!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403,headers});
 const session=await readSession(request,headers);if(!session?.company||session.platformAdmin)return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
 let b:{operation?:string;id?:string;document?:unknown;version?:number;companyId?:string}={};
 if(write){const raw=await request.text();if(raw.length>25000)return Response.json({message:'Dados muito longos.'},{status:413,headers});b=JSON.parse(raw);if(b.companyId!==session.company.id)return Response.json({message:'A empresa ativa mudou. Atualize a página.'},{status:409,headers});}
 else b={operation:request.nextUrl.searchParams.get('operation')||'snapshot',id:request.nextUrl.searchParams.get('id')||undefined};
 const allowed=write?['move','note','event','options','preferences','read-alert']:['snapshot','alerts','resume'];if(!allowed.includes(b.operation||''))return Response.json({message:'Operação inválida.'},{status:400,headers});
 const r=await requestDatabase('rpc/company_operations_v1',session.accessToken,{operation:b.operation,record_id:b.id??null,document:b.document??{},expected_version:b.version??null});
 if(!r?.ok){const e=await r?.json().catch(()=>null) as {code?:string}|null;const conflict=['40001','PT409'].includes(e?.code||'');return Response.json({message:conflict?'Os dados mudaram ou o responsável já tem compromisso nesse horário. Atualize e confira.':e?.code==='42501'?'Você não possui permissão para essa ação.':'Não foi possível salvar. Confira os campos obrigatórios.'},{status:conflict?409:e?.code==='42501'?403:422,headers});}
 const data=await r.json();
 if(b.operation==='resume'){const doc=data as {path:string;name:string;size:number;sha256:string}|null,c=getSupabaseConfig();if(!doc||!c)return Response.json({message:'Currículo não encontrado.'},{status:404,headers});const file=await fetch(`${c.url}/storage/v1/object/candidate-resumes/${doc.path}`,{headers:{apikey:c.anonKey,Authorization:`Bearer ${session.accessToken}`},cache:'no-store',signal:AbortSignal.timeout(15000)});if(!file.ok)throw Error();const bytes=Buffer.from(await file.arrayBuffer());if(bytes.length!==doc.size||createHash('sha256').update(bytes).digest('hex')!==doc.sha256)throw Error();headers.set('Content-Security-Policy',"sandbox; default-src 'none'");headers.set('Content-Type','application/pdf');headers.set('Content-Disposition',`attachment; filename="curriculo.pdf"`);headers.set('X-Content-Type-Options','nosniff');return new Response(bytes,{headers});}
 return Response.json(data,{headers});
 }catch{return Response.json({message:'Não foi possível concluir a ação. Tente novamente.'},{status:503,headers});}
}
export const GET=(r:NextRequest)=>run(r,false);export const POST=(r:NextRequest)=>run(r,true);
