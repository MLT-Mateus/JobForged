import {createHash,randomBytes} from 'node:crypto';
import {Buffer} from 'node:buffer';
import type {NextRequest} from 'next/server';
import {readSession,requestDatabase,requireSameOrigin} from '@/app/api/auth/_server';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 const headers=new Headers({'Cache-Control':'private, no-store',Vary:'Cookie'});
 const fail=(message:string,status:number)=>Response.json({message},{status,headers});
 if(process.env.APP_ENV!=='test')return fail('Disponível no Test.',404);
 if(!requireSameOrigin(request))return fail('Origem inválida.',403);
 const session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return fail('Acesso negado.',403);
 if(request.headers.get('x-company-id')!==session.company.id)return fail('A empresa ativa mudou. Reabra o assistente.',409);
 const mime=request.headers.get('content-type')?.split(';')[0]||'';
 if(!['application/pdf','audio/webm','audio/ogg','audio/mp4','audio/mpeg','audio/wav'].includes(mime))return fail('Use PDF ou um áudio compatível.',415);
 try{
  const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
  if(reader)while(true){const part=await reader.read();if(part.done)break;size+=part.value.length;if(size>2*1024*1024){await reader.cancel();return fail('O arquivo deve ter até 2 MB.',413)}chunks.push(part.value)}
  const bytes=Buffer.concat(chunks);if(bytes.length<16)return fail('Arquivo vazio ou inválido.',400);
  const valid=mime==='application/pdf'?bytes.subarray(0,5).toString()==='%PDF-':mime==='audio/webm'?bytes.subarray(0,4).toString('hex')==='1a45dfa3':mime==='audio/ogg'?bytes.subarray(0,4).toString()==='OggS':mime==='audio/mp4'?bytes.subarray(4,8).toString()==='ftyp':mime==='audio/wav'?bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WAVE':bytes.subarray(0,3).toString()==='ID3'||bytes[0]===255&&(bytes[1]&224)===224;
  if(!valid)return fail('O conteúdo não corresponde ao formato informado.',415);
  const token=Buffer.from(randomBytes(32)).toString('base64url');
  const issued=await requestDatabase('rpc/job_assistant_issue',session.accessToken,{token_hash:createHash('sha256').update(token).digest('hex'),payload:{purpose:'job-media',mime}});
  if(!issued?.ok)return fail('Limite do assistente atingido ou serviço indisponível. Tente novamente mais tarde.',issued?.status===429?429:503);
  const result=await fetch('https://n8n.jobforged.com/webhook/jbfd-test-job-media',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token,mime,data:bytes.toString('base64')}),redirect:'error',signal:AbortSignal.any([request.signal,AbortSignal.timeout(22000)])});
  if(!result.ok)return fail('Não foi possível ler o arquivo. Tente um arquivo menor ou escreva as informações.',503);
  const data=await result.json() as {text?:unknown};
  if(typeof data.text!=='string'||!data.text.trim()||data.text.length>16000)return fail('Não foi possível extrair um texto válido. Tente um arquivo menor.',422);
  return Response.json({text:data.text},{headers});
 }catch{return fail('A leitura não foi concluída. Tente novamente ou digite as informações.',503)}
}
