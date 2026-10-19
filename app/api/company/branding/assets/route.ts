import type { NextRequest } from 'next/server';
import { createHash, randomUUID } from 'node:crypto';
import { normalizeBrandingImage } from '@/app/lib/branding-image';
import { readSession, requestDatabase, requireSameOrigin } from '@/app/api/auth/_server';
import { brandingStorage } from '../_storage';
export const runtime='nodejs';
export async function POST(request:NextRequest){
 if(!requireSameOrigin(request))return Response.json({message:'Origem inválida.'},{status:403});
 const headers=new Headers({'Cache-Control':'no-store'}),session=await readSession(request,headers);
 if(!session?.company||session.platformAdmin||!['owner','admin'].includes(session.role))return Response.json({message:'Acesso negado.'},{status:403,headers});
 try{
  const reader=request.body?.getReader(),chunks:Uint8Array[]=[];let size=0;
  if(!reader)throw new Error();while(true){const chunk=await reader.read();if(chunk.done)break;size+=chunk.value.byteLength;if(size>5308416){await reader.cancel();return Response.json({message:'Envie uma imagem de até 5 MB.'},{status:413,headers})}chunks.push(chunk.value)}
  const form=await new Request(request.url,{method:'POST',headers:request.headers,body:Buffer.concat(chunks)}).formData(),file=form.get('file');
  if(form.get('companyId')!==session.company.id)return Response.json({message:'O contexto da conta mudou. Recarregue a identidade antes de enviar imagens.'},{status:409,headers});
  if(!(file instanceof File)||file.size>5242880||!['image/png','image/jpeg','image/webp'].includes(file.type)||!(/\.(png|jpe?g|webp)$/i.test(file.name)))throw new Error();
  const input=Buffer.from(await file.arrayBuffer());
  const output=await normalizeBrandingImage(input,file.type);
  const id=randomUUID(),path=`${session.company.id}/${id}.png`;
  const uploaded=await brandingStorage(path,output);
  if(!uploaded?.ok)return Response.json({message:'O armazenamento de imagens está indisponível. Tente novamente.'},{status:503,headers});
  const name=file.name.replace(/[^\p{L}\p{N} ._-]/gu,'').slice(0,240)||'imagem.png';
  const registered=await requestDatabase('rpc/register_company_brand_asset',session.accessToken,{asset_id:id,file_name:name,file_size:output.byteLength,file_sha256:createHash('sha256').update(output).digest('hex')});
  if(!registered?.ok)return Response.json({message:'Não foi possível registrar a imagem. Tente novamente.'},{status:503,headers});
  return Response.json({asset:{id,kind:String(form.get('kind')||'image').slice(0,40),name,url:`/api/company/branding/assets/${id}`,format:'PNG',size:output.byteLength,updatedAt:new Date().toISOString()}},{headers});
 }catch{return Response.json({message:'Use PNG, JPEG ou WebP estático válido, até 5 MB e 16 milhões de pixels. SVG, animações e arquivos inválidos não são aceitos.'},{status:400,headers})}
}
